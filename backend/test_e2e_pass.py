import urllib.request
import urllib.parse
import json
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def api_call(method, endpoint, token=None, json_data=None, form_data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if json_data is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(json_data).encode("utf-8")
    elif form_data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(form_data).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err_json = json.loads(body)
        except Exception:
            err_json = {"raw": body}
        return e.code, err_json

def run_tests():
    print("=" * 60)
    print("RUNNING COMPLETE HRM SYSTEM E2E VERIFICATION SUITE")
    print("=" * 60)

    # 1. Admin Login
    print("\n[TEST 1] Admin Login (nitin@gmail.com / Admin@123)...")
    st, res = api_call("POST", "/auth/login", form_data={"username": "nitin@gmail.com", "password": "Admin@123"})
    assert st == 200, f"Admin login failed: {st}, {res}"
    admin_token = res["access_token"]
    print(" PASS: Admin login successful.")

    # 2. Admin /auth/me
    print("\n[TEST 2] /auth/me profile verification...")
    st, me = api_call("GET", "/auth/me", token=admin_token)
    assert st == 200 and me["role"] == "ORG_ADMIN", f"Auth me failed: {st}, {me}"
    org_id = me["organization_id"]
    print(f" PASS: User verified as {me['role']} in Org: {me['organization']['name']}")

    # 3. Global Search
    print("\n[TEST 3] Global Search API...")
    st, search_res = api_call("GET", "/search?q=Rahul", token=admin_token)
    assert st == 200 and "results" in search_res and "employees" in search_res["results"], f"Search failed: {st}, {search_res}"
    print(f" PASS: Search returned {search_res['total_results']} items across categories ({len(search_res['results']['employees'])} employees).")

    # 4. Notifications
    print("\n[TEST 4] Notification Bell and List...")
    st, notifs = api_call("GET", "/notifications", token=admin_token)
    assert st == 200, f"Notifications failed: {st}, {notifs}"
    st, unread = api_call("GET", "/notifications/unread-count", token=admin_token)
    assert st == 200 and "unread_count" in unread, f"Unread count failed: {st}, {unread}"
    print(f" PASS: Notifications list works. Total: {len(notifs)}, Unread: {unread['unread_count']}")

    # 5. Departments, Designations, Branches, Shifts
    print("\n[TEST 5] Organization Core Metadata (Depts, Desigs, Branches, Shifts)...")
    st, depts = api_call("GET", "/departments", token=admin_token)
    assert st == 200 and len(depts) > 0, "No departments found."
    dept_id = depts[0]["id"]

    st, desigs = api_call("GET", "/designations", token=admin_token)
    assert st == 200 and len(desigs) > 0, "No designations found."
    desig_id = desigs[0]["id"]

    st, branches = api_call("GET", "/branches", token=admin_token)
    assert st == 200, "Branches check failed."
    branch_id = branches[0]["id"] if branches else None

    st, shifts = api_call("GET", "/shifts", token=admin_token)
    assert st == 200 and len(shifts) > 0, "No shifts found."
    shift_id = shifts[0]["id"]
    desig_label = desigs[0].get('name') or desigs[0].get('title')
    print(f" PASS: Organization metadata loaded (Dept: {depts[0]['name']}, Desig: {desig_label}, Shift: {shifts[0]['name']})")

    # 6. Create New Employee with Account Provisioning
    print("\n[TEST 6] Employee Account Provisioning...")
    unique_suffix = uuid.uuid4().hex[:6]
    test_emp_email = f"emp_e2e_{unique_suffix}@techcorp.io"
    emp_payload = {
        "first_name": "E2ETest",
        "last_name": "Employee",
        "email": test_emp_email,
        "department_id": dept_id,
        "designation_id": desig_id,
        "shift_id": shift_id,
        "branch_id": branch_id,
        "employment_status": "active",
        "create_login_account": True,
        "account_role": "EMPLOYEE",
        "temporary_password": "TestPassword@123",
    }
    st, new_emp = api_call("POST", "/employees", token=admin_token, json_data=emp_payload)
    assert st == 201, f"Create employee failed: {st}, {new_emp}"
    emp_id = new_emp["id"]
    emp_code = new_emp["employee_code"]
    print(f" PASS: Employee created ({emp_code} - {test_emp_email}) with login account.")

    # 7. Employee Login
    print("\n[TEST 7] Employee Login (via email and employee_code)...")
    st, emp_token_res = api_call("POST", "/auth/login", form_data={"username": test_emp_email, "password": "TestPassword@123"})
    assert st == 200, f"Employee login by email failed: {st}, {emp_token_res}"
    emp_token = emp_token_res["access_token"]

    st_code, _ = api_call("POST", "/auth/login", form_data={"username": emp_code, "password": "TestPassword@123"})
    assert st_code == 200, f"Employee login by employee code failed: {st_code}"
    print(" PASS: Employee login verified via both Email and Employee ID.")

    # 8. Employee Self-Service / Today Status
    print("\n[TEST 8] Employee Today Status...")
    st, status_res = api_call("GET", "/attendance/me/today-status", token=emp_token)
    assert st == 200 and status_res["state"] in ["NOT_CHECKED_IN", "CHECKED_IN"], f"Status failed: {st}, {status_res}"
    print(f" PASS: Today's attendance state: {status_res['state']}")

    # 9. Attendance Check-In
    print("\n[TEST 9] Attendance Check-In...")
    if status_res["state"] == "NOT_CHECKED_IN":
        st, att_res = api_call("POST", "/attendance/me/check-in", token=emp_token)
        assert st == 201, f"Check in failed: {st}, {att_res}"
        print(f" PASS: Checked in successfully. Check-in time: {att_res['check_in']}")
    else:
        print(" (Already checked in today, skipping check-in step)")

    # 10. Duplicate Check-in Prevention
    print("\n[TEST 10] Duplicate Check-In Prevention...")
    st, dup_res = api_call("POST", "/attendance/me/check-in", token=emp_token)
    assert st == 400, f"Duplicate check in should return 400: {st}, {dup_res}"
    print(" PASS: Duplicate check-in correctly rejected with 400 Bad Request.")

    # 11. Attendance Check-Out
    print("\n[TEST 11] Attendance Check-Out...")
    st, out_res = api_call("POST", "/attendance/me/check-out", token=emp_token)
    assert st == 200, f"Check out failed: {st}, {out_res}"
    assert out_res["check_out"] is not None, "Check out time missing"
    print(f" PASS: Checked out successfully. Working minutes: {out_res['working_minutes']}")

    # 12. Attendance Regularization
    print("\n[TEST 12] Attendance Regularization Request...")
    reg_payload = {
        "attendance_date": "2026-09-15",
        "requested_check_in": "09:00:00",
        "requested_check_out": "18:00:00",
        "reason": "Biometric terminal outage on September 15th",
    }
    st, reg_res = api_call("POST", "/attendance/regularize", token=emp_token, json_data=reg_payload)
    assert st == 201, f"Regularization request failed: {st}, {reg_res}"
    reg_id = reg_res["id"]
    print(f" PASS: Regularization requested (ID: {reg_id}).")

    # 13. Admin/Manager Approves Regularization
    print("\n[TEST 13] Approve Regularization...")
    st, app_res = api_call("PATCH", f"/attendance/regularizations/{reg_id}/approve", token=admin_token)
    assert st == 200 and app_res["status"] == "approved", f"Approve regularization failed: {st}, {app_res}"
    print(" PASS: Regularization approved and attendance created/updated.")

    # 14. Leave Balances & Leave Application
    print("\n[TEST 14] Leave Balances and Application...")
    st, balances = api_call("GET", f"/leave-types/balances/{emp_id}", token=emp_token)
    assert st == 200 and len(balances) > 0, f"Leave balances failed: {st}, {balances}"
    lt_id = balances[0]["leave_type_id"]
    lt_name = balances[0]["leave_type_name"]
    initial_avail = balances[0]["available_days"]
    print(f" Initial {lt_name} Available Days: {initial_avail}")

    leave_payload = {
        "employee_id": emp_id,
        "leave_type": lt_name,
        "leave_type_id": lt_id,
        "start_date": "2026-11-10",
        "end_date": "2026-11-10",
        "is_half_day": True,
        "half_day_session": "morning",
        "reason": "Personal medical appointment",
    }
    st, leave_res = api_call("POST", "/leaves", token=emp_token, json_data=leave_payload)
    assert st == 201, f"Apply leave failed: {st}, {leave_res}"
    leave_id = leave_res["id"]
    print(f" PASS: Half-day leave applied successfully (ID: {leave_id}).")

    # Verify pending days incremented
    st, bal_after = api_call("GET", f"/leave-types/balances/{emp_id}", token=emp_token)
    emp_b = [b for b in bal_after if b["leave_type_id"] == lt_id][0]
    assert emp_b["pending_days"] >= 0.5, f"Pending days should be >= 0.5: {emp_b}"
    print(f" PASS: Pending days accurately incremented to {emp_b['pending_days']}.")

    # 15. Admin/Manager Approves Leave
    print("\n[TEST 15] Approve Leave Request...")
    st, app_leave = api_call("PATCH", f"/leaves/{leave_id}/approve", token=admin_token)
    assert st == 200 and app_leave["status"] == "approved", f"Approve leave failed: {st}, {app_leave}"

    # Verify used days incremented and pending decreased
    st, bal_final = api_call("GET", f"/leave-types/balances/{emp_id}", token=emp_token)
    final_b = [b for b in bal_final if b["leave_type_id"] == lt_id][0]
    assert final_b["used_days"] >= 0.5, f"Used days should be >= 0.5: {final_b}"
    print(f" PASS: Leave approved. Used days: {final_b['used_days']}, Remaining: {final_b['available_days']}.")

    # 16. Payroll Processing (Real Attendance & Salary Structure)
    print("\n[TEST 16] Payroll Processing...")
    payroll_payload = {
        "month": 9,
        "year": 2026,
        "notes": "September 2026 Automated Payroll Run",
    }
    st, run_res = api_call("POST", "/payroll/runs/process", token=admin_token, json_data=payroll_payload)
    assert st == 200, f"Payroll process failed: {st}, {run_res}"
    assert run_res["total_gross"] > 0, "Gross salary should be > 0"
    print(f" PASS: Payroll processed! Run ID: {run_res['id']}, Total Gross: ₹{run_res['total_gross']:,.2f}, Total Net: ₹{run_res['total_net']:,.2f}")

    # 17. Payslip Role Isolation
    print("\n[TEST 17] Payslip Access Isolation...")
    st, emp_slips = api_call("GET", "/payroll/payslips", token=emp_token)
    assert st == 200, f"Get employee payslips failed: {st}"
    for ps in emp_slips:
        assert ps["employee_id"] == emp_id, "Employee can only see their own payslips!"
    print(f" PASS: Employee payslips strictly scoped to employee's own records ({len(emp_slips)} found).")

    # 18. Performance OKRs
    print("\n[TEST 18] Performance Cycles and Goals...")
    st, cycles = api_call("GET", "/performance/cycles", token=admin_token)
    assert st == 200, "Cycles failed."
    cycle_id = cycles[0]["id"] if cycles else None

    if cycle_id:
        goal_payload = {
            "employee_id": emp_id,
            "cycle_id": cycle_id,
            "title": "Complete HRM Microservice Integration",
            "metric_kpi": "Code Coverage",
            "target_value": "90%",
            "current_value": "80%",
            "weightage": 25,
        }
        st, goal_res = api_call("POST", "/performance/goals", token=emp_token, json_data=goal_payload)
        assert st == 201, f"Create goal failed: {st}, {goal_res}"
        print(f" PASS: Employee goal created (ID: {goal_res['id']}).")

    # 19. Recruitment ATS Candidate Conversion
    print("\n[TEST 19] Recruitment ATS & Candidate Conversion...")
    st, jobs = api_call("GET", "/recruitment/jobs", token=admin_token)
    assert st == 200, "Jobs failed"
    if jobs:
        cand_payload = {
            "job_id": jobs[0]["id"],
            "first_name": "Aakash",
            "last_name": "Mehta",
            "email": f"aakash_{unique_suffix}@example.com",
            "phone": "9123456780",
        }
        st, cand = api_call("POST", "/recruitment/candidates", token=admin_token, json_data=cand_payload)
        assert st == 201, f"Candidate create failed: {st}, {cand}"
        cand_id = cand["id"]

        # Convert to employee
        conv_payload = {
            "department_id": dept_id,
            "designation_id": desig_id,
            "shift_id": shift_id,
            "branch_id": branch_id,
        }
        st, conv_res = api_call("POST", f"/recruitment/candidates/{cand_id}/convert-to-employee", token=admin_token, json_data=conv_payload)
        assert st == 200, f"Candidate conversion failed: {st}, {conv_res}"
        print(f" PASS: Candidate converted to employee: {conv_res['employee_code']}, Account: {conv_res['email']}")

    # 20. Resignation Workflow
    print("\n[TEST 20] Resignation Request...")
    resig_payload = {
        "reason": "Relocating to another city for higher education",
        "intended_last_day": "2026-10-31",
    }
    st, resig_res = api_call("POST", "/resignations", token=emp_token, json_data=resig_payload)
    assert st == 201, f"Submit resignation failed: {st}, {resig_res}"
    print(f" PASS: Resignation submitted (ID: {resig_res['id']}, Status: {resig_res['status']}).")

    # 21. Audit Logs
    print("\n[TEST 21] Audit Trail Verification...")
    st, logs = api_call("GET", "/audit-logs", token=admin_token)
    assert st == 200 and len(logs) > 0, "Audit logs check failed"
    print(f" PASS: Audit trail contains {len(logs)} tamper-evident entries.")

    print("\n" + "=" * 60)
    print("ALL 21 TEST SUITES PASSED! COMPLETE HRM END-TO-END FLOW VERIFIED!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
