import urllib.request, urllib.parse, json, uuid
from datetime import date, timedelta

BASE_URL = "http://127.0.0.1:8000/api/v1"

def api_req(method, path, data=None, token=None, is_form=False):
    url = f"{BASE_URL}{path}"
    headers = {}
    encoded_data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if is_form and data:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        encoded_data = urllib.parse.urlencode(data).encode()
    elif data is not None:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode()

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}
    except Exception as e:
        return 500, {"error": str(e)}

def main():
    print("==================================================================")
    print("=== STARTING FULL END-TO-END HRM FUNCTIONALITY & RBAC VERIFICATION ===")
    print("==================================================================")

    # 1. Admin Login
    st, admin_auth = api_req("POST", "/auth/login", {"username": "nitin@gmail.com", "password": "Admin@123"}, is_form=True)
    assert st == 200, f"Admin login failed: {st} {admin_auth}"
    admin_token = admin_auth["access_token"]
    refresh_token_admin = admin_auth["refresh_token"]
    print(" [PASS] 1. Admin Login (nitin@gmail.com)")

    # 2. Token Refresh & Logout
    st, ref_res = api_req("POST", "/auth/refresh", {"refresh_token": refresh_token_admin})
    assert st == 200, f"Refresh token failed: {st} {ref_res}"
    assert "access_token" in ref_res, "New access token missing"
    print(" [PASS] 2. Token Refresh (POST /auth/refresh)")

    st, logout_res = api_req("POST", "/auth/logout", token=admin_token)
    assert st == 200, f"Logout failed: {st} {logout_res}"
    print(" [PASS] 3. Logout (POST /auth/logout)")

    # 3. Create Department & Branch for test isolation
    st, dept = api_req("POST", "/departments", {"name": f"Eng-{uuid.uuid4().hex[:4]}", "description": "Engineering"}, token=admin_token)
    assert st in [200, 201], f"Create Dept failed: {st} {dept}"
    dept_id = dept["id"]

    st, shift = api_req("POST", "/shifts", {"name": f"General-{uuid.uuid4().hex[:4]}", "start_time": "09:00:00", "end_time": "18:00:00", "grace_minutes": 15}, token=admin_token)
    assert st in [200, 201], f"Create Shift failed: {st} {shift}"
    shift_id = shift["id"]

    # 4. Create Manager with Login Account
    mgr_email = f"manager_{uuid.uuid4().hex[:6]}@test.com"
    st, mgr_emp = api_req("POST", "/employees", {
        "first_name": "TestManager",
        "last_name": "One",
        "email": mgr_email,
        "department_id": dept_id,
        "shift_id": shift_id,
        "create_login_account": True,
        "account_role": "MANAGER",
        "temporary_password": "Password@123",
    }, token=admin_token)
    assert st in [200, 201], f"Create Manager failed: {st} {mgr_emp}"
    mgr_emp_id = mgr_emp["id"]
    print(f" [PASS] 4. Manager Created: {mgr_email} ({mgr_emp['employee_code']})")

    # Manager Login
    st, mgr_auth = api_req("POST", "/auth/login", {"username": mgr_email, "password": "Password@123"}, is_form=True)
    assert st == 200, f"Manager login failed: {st} {mgr_auth}"
    mgr_token = mgr_auth["access_token"]
    print(" [PASS] 5. Manager Login verified")

    # 5. Create Direct Report Employee (reporting to Manager)
    emp1_email = f"emp1_{uuid.uuid4().hex[:6]}@test.com"
    st, emp1 = api_req("POST", "/employees", {
        "first_name": "TeamMember1",
        "last_name": "Direct",
        "email": emp1_email,
        "department_id": dept_id,
        "shift_id": shift_id,
        "reporting_manager_id": mgr_emp_id,
        "create_login_account": True,
        "account_role": "EMPLOYEE",
        "temporary_password": "Password@123",
    }, token=admin_token)
    assert st in [200, 201], f"Create Direct Report failed: {st} {emp1}"
    emp1_id = emp1["id"]
    print(f" [PASS] 6. Direct Report Employee Created: {emp1_email} (reports to manager)")

    # 6. Create Non-Team Employee (no manager)
    emp2_email = f"emp2_{uuid.uuid4().hex[:6]}@test.com"
    st, emp2 = api_req("POST", "/employees", {
        "first_name": "OtherEmp2",
        "last_name": "External",
        "email": emp2_email,
        "department_id": dept_id,
        "shift_id": shift_id,
        "create_login_account": True,
        "account_role": "EMPLOYEE",
        "temporary_password": "Password@123",
    }, token=admin_token)
    assert st in [200, 201], f"Create External Emp failed: {st} {emp2}"
    emp2_id = emp2["id"]

    # Login as Employee 1
    st, emp1_auth = api_req("POST", "/auth/login", {"username": emp1_email, "password": "Password@123"}, is_form=True)
    assert st == 200, f"Emp1 login failed: {st} {emp1_auth}"
    emp1_token = emp1_auth["access_token"]

    # Login as Employee 2
    st, emp2_auth = api_req("POST", "/auth/login", {"username": emp2_email, "password": "Password@123"}, is_form=True)
    assert st == 200, f"Emp2 login failed: {st} {emp2_auth}"
    emp2_token = emp2_auth["access_token"]

    # 7. EMPLOYEE RBAC: Employee cannot see other employees
    st, emp_list = api_req("GET", "/employees", token=emp1_token)
    assert st == 200 and len(emp_list) == 1 and emp_list[0]["id"] == emp1_id, f"Employee saw unauthorized employees: {emp_list}"
    st, single_other = api_req("GET", f"/employees/{emp2_id}", token=emp1_token)
    assert st == 403, f"Expected 403 when employee views other employee: {st}"
    print(" [PASS] 7. Employee RBAC verified: Employee only sees own employee profile")

    # 8. MANAGER RBAC: Manager only sees team members & self
    st, mgr_emp_list = api_req("GET", "/employees", token=mgr_token)
    assert st == 200, f"Manager list emps failed: {st}"
    mgr_visible_ids = {e["id"] for e in mgr_emp_list}
    assert emp1_id in mgr_visible_ids, "Manager should see direct report emp1"
    assert mgr_emp_id in mgr_visible_ids, "Manager should see self"
    assert emp2_id not in mgr_visible_ids, "Manager must NOT see non-team employee emp2"
    st, other_emp_check = api_req("GET", f"/employees/{emp2_id}", token=mgr_token)
    assert other_emp_check == 403 or st == 403, f"Expected 403 when manager views non-report: {other_emp_check}"
    print(" [PASS] 8. Manager RBAC verified: Manager only sees direct reports")

    # 9. EMPLOYEE UPDATE Relational Validation
    st, bad_update = api_req("PATCH", f"/employees/{emp1_id}", {"reporting_manager_id": emp1_id}, token=admin_token)
    assert st == 400, f"Expected 400 when setting self as manager: {st}"
    st, bad_update_fk = api_req("PATCH", f"/employees/{emp1_id}", {"department_id": str(uuid.uuid4())}, token=admin_token)
    assert st == 400, f"Expected 400 on fake department FK: {st}"
    print(" [PASS] 9. Employee Update relational FK validation verified")

    # 10. LEAVE RBAC & Balance Allocation
    # Allocate leave balance for emp1
    lt_code = f"SICK-{uuid.uuid4().hex[:4].upper()}"
    st, lt = api_req("POST", "/leave-types", {"name": f"Sick Leave {lt_code}", "code": lt_code, "days_per_year": 12, "is_paid": True}, token=admin_token)
    assert st in [200, 201], f"Create LeaveType failed: {st} {lt}"
    lt_id = lt["id"]

    st, bal = api_req("POST", "/leave-types/balances/allocate", {
        "employee_id": emp1_id,
        "leave_type_id": lt_id,
        "year": date.today().year,
        "total_allocated": 10.0,
    }, token=admin_token)
    assert st in [200, 201], f"Allocate balance failed: {st} {bal}"
    print(f" [PASS] 10. Leave Balance Allocated: 10 days for {emp1_email}")

    # Employee 1 tries to submit leave for Employee 2 -> MUST BE REJECTED 403
    today_str = str(date.today() + timedelta(days=10))
    tomorrow_str = str(date.today() + timedelta(days=11))
    st, hack_leave = api_req("POST", "/leaves", {
        "employee_id": emp2_id,
        "leave_type": lt["name"],
        "start_date": today_str,
        "end_date": tomorrow_str,
        "reason": "Unauthorized submit",
    }, token=emp1_token)
    assert st == 403, f"Expected 403 when employee submits leave for another: {st}"
    print(" [PASS] 11. Cross-employee leave creation rejected (403)")

    # Employee 1 submits own leave (2 days)
    st, leave_res = api_req("POST", "/leaves", {
        "employee_id": emp1_id,
        "leave_type": lt["name"],
        "start_date": today_str,
        "end_date": tomorrow_str,
        "reason": "Feeling unwell",
    }, token=emp1_token)
    assert st == 201, f"Leave creation failed: {st} {leave_res}"
    leave_id = leave_res["id"]
    print(" [PASS] 12. Employee submitted own leave request (2 days)")

    # Verify pending days increased in balance
    st, balances = api_req("GET", f"/leave-types/balances/{emp1_id}", token=admin_token)
    target_bal = next(b for b in balances if b["leave_type_id"] == lt_id)
    assert target_bal["pending_days"] == 2.0, f"Pending days not updated: {target_bal}"
    assert target_bal["available_days"] == 8.0, f"Available days incorrect: {target_bal}"
    print(" [PASS] 13. Balance pending_days incremented transactionally (Pending: 2, Avail: 8)")

    # Manager approves team member leave
    st, app_leave = api_req("PATCH", f"/leaves/{leave_id}/approve", token=mgr_token)
    assert st == 200, f"Manager approve leave failed: {st} {app_leave}"
    assert app_leave["status"] == "approved"
    print(" [PASS] 14. Manager successfully approved direct team member leave")

    # Verify balance after approval: pending=0, used=2, available=8
    st, balances_after = api_req("GET", f"/leave-types/balances/{emp1_id}", token=admin_token)
    target_bal_after = next(b for b in balances_after if b["leave_type_id"] == lt_id)
    assert target_bal_after["pending_days"] == 0.0, f"Pending days not 0 after approval: {target_bal_after}"
    assert target_bal_after["used_days"] == 2.0, f"Used days not 2 after approval: {target_bal_after}"
    assert target_bal_after["available_days"] == 8.0, f"Available days incorrect after approval: {target_bal_after}"
    print(" [PASS] 15. Leave balance updated transactionally after approval (Used: 2, Pending: 0, Avail: 8)")

    # 11. ATTENDANCE REGULARIZATION
    past_date = str(date.today() - timedelta(days=2))
    st, reg_res = api_req("POST", "/attendance/regularize", {
        "attendance_date": past_date,
        "requested_check_in": "09:05:00",
        "requested_check_out": "18:00:00",
        "reason": "Network outage in morning",
    }, token=emp1_token)
    assert st == 201, f"Regularization request failed: {st} {reg_res}"
    reg_id = reg_res["id"]
    print(" [PASS] 16. Employee submitted attendance regularization request")

    # Manager approves regularization
    st, reg_app = api_req("PATCH", f"/attendance/regularizations/{reg_id}/approve", token=mgr_token)
    assert st == 200, f"Regularization approval failed: {st} {reg_app}"
    assert reg_app["status"] == "approved"
    print(" [PASS] 17. Manager approved attendance regularization")

    # Verify attendance record created/updated
    st, my_att = api_req("GET", "/attendance/me", token=emp1_token)
    assert st == 200, f"Get my attendance failed: {st}"
    reg_att = next((a for a in my_att if a["attendance_date"] == past_date), None)
    assert reg_att is not None, "Attendance record not found after regularization approval"
    assert reg_att["status"] == "present"
    assert reg_att["working_minutes"] > 0
    print(f" [PASS] 18. Actual attendance record updated (Date: {past_date}, Status: {reg_att['status']}, WorkingMin: {reg_att['working_minutes']})")

    # 12. PAYROLL SALARY VALIDATION (Refuse missing salary instead of inventing)
    st, payroll_fail = api_req("POST", "/payroll/runs/process", {"month": 1, "year": 2026, "notes": "Test Run"}, token=admin_token)
    assert st == 400, f"Expected 400 when active employees have no salary: {st} {payroll_fail}"
    assert "configuration error" in payroll_fail.get("detail", "").lower() or "missing" in payroll_fail.get("detail", "").lower()
    print(" [PASS] 19. Payroll refuses missing salary configuration with clear 400 error")

    # 13. RECRUITMENT CANDIDATE CONVERSION
    st, job = api_req("POST", "/recruitment/jobs", {"title": f"Dev-{uuid.uuid4().hex[:4]}", "employment_type": "Full-Time", "open_positions": 2}, token=admin_token)
    job_id = job["id"]
    cand_email = f"cand_{uuid.uuid4().hex[:6]}@recruit.com"
    st, cand = api_req("POST", "/recruitment/candidates", {
        "job_id": job_id,
        "first_name": "Hired",
        "last_name": "Talent",
        "email": cand_email,
        "phone": "9876543210",
    }, token=admin_token)
    cand_id = cand["id"]

    st, convert_res = api_req("POST", f"/recruitment/candidates/{cand_id}/convert", {
        "department_id": dept_id,
        "shift_id": shift_id,
    }, token=admin_token)
    assert st == 200, f"Convert candidate failed: {st} {convert_res}"
    assert convert_res["temporary_password"] != "Welcome@123", "Hardcoded Welcome@123 detected in conversion!"
    assert len(convert_res["temporary_password"]) >= 12, "Temporary password too weak"
    print(f" [PASS] 20. Recruitment Candidate converted with secure dynamic password (Password: {convert_res['temporary_password']})")

    # 14. DOCUMENT RBAC
    st, doc = api_req("POST", "/documents", {
        "employee_id": emp1_id,
        "title": "Emp1 Identity Proof",
        "category": "Identity",
        "file_url": "https://example.com/id.pdf",
    }, token=emp1_token)
    assert st == 201, f"Emp1 upload doc failed: {st} {doc}"
    doc_id = doc["id"]

    # Emp2 cannot view Emp1's document
    st, hack_doc = api_req("GET", f"/documents/{doc_id}", token=emp2_token)
    assert st == 403, f"Expected 403 when Emp2 views Emp1 document: {st}"
    print(" [PASS] 21. Document RBAC verified: Other employee cannot access document (403)")

    # 15. ROLE-AWARE GLOBAL SEARCH
    st, emp_search = api_req("GET", "/search?q=Hired", token=emp1_token)
    assert st == 200, f"Search failed: {st}"
    assert len(emp_search["results"]["candidates"]) == 0, f"Employee exposed candidates in search: {emp_search}"
    assert len(emp_search["results"]["employees"]) == 0, f"Employee exposed other employees in search: {emp_search}"
    print(" [PASS] 22. Role-Aware Global Search verified (Candidate & other employee data hidden from employee)")

    # 16. NOTIFICATION SYSTEM
    st, notifs = api_req("GET", "/notifications", token=emp1_token)
    assert st == 200, f"Get notifications failed: {st}"
    assert len(notifs) > 0, "No notifications received by employee after leave & reg approvals"
    notif_id = notifs[0]["id"]
    st, read_res = api_req("PATCH", f"/notifications/{notif_id}/read", token=emp1_token)
    assert st == 200, f"Mark read failed: {st}"
    print(f" [PASS] 23. Notifications verified: Received {len(notifs)} notification(s) and marked read")

    print("\n==================================================================")
    print("=== ALL 23 SYSTEM INTEGRATION & SECURITY TESTS PASSED 100%! ===")
    print("==================================================================")

if __name__ == "__main__":
    main()

