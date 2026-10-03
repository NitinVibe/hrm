import urllib.request, urllib.parse, json, sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def api_call(method, path, data=None, token=None, is_form=False):
    url = f"{BASE_URL}{path}"
    headers = {}
    encoded_data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if is_form and data:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        encoded_data = urllib.parse.urlencode(data).encode()
    elif data:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode()

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
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
    print("=== STARTING COMPREHENSIVE LOGIN & AUTH VERIFICATION ===")
    
    # 1. Admin login by Email
    status, res = api_call("POST", "/auth/login", {"username": "nitin@gmail.com", "password": "Admin@123"}, is_form=True)
    assert status == 200, f"Failed Admin Email Login: {status} {res}"
    admin_token = res["access_token"]
    print(" [PASS] 1. Admin login by Email (nitin@gmail.com)")

    # 2. Admin login by Employee ID
    status, res = api_call("POST", "/auth/login", {"username": "EMP-0A72C84D", "password": "Admin@123"}, is_form=True)
    assert status == 200, f"Failed Admin EmpCode Login: {status} {res}"
    print(" [PASS] 2. Admin login by Employee ID (EMP-0A72C84D)")

    # 3. Employee login by Email
    status, res = api_call("POST", "/auth/login", {"username": "state_tester_d0e354@example.com", "password": "password123"}, is_form=True)
    assert status == 200, f"Failed Employee Email Login: {status} {res}"
    emp_token = res["access_token"]
    print(" [PASS] 3. Employee login by Email (state_tester_d0e354@example.com)")

    # 4. Employee login by Employee ID
    status, res = api_call("POST", "/auth/login", {"username": "EMP-TEST-2A71", "password": "password123"}, is_form=True)
    assert status == 200, f"Failed Employee EmpCode Login: {status} {res}"
    print(" [PASS] 4. Employee login by Employee ID (EMP-TEST-2A71)")

    # 5. Invalid credentials check
    status, res = api_call("POST", "/auth/login", {"username": "nitin@gmail.com", "password": "WrongPassword!"}, is_form=True)
    assert status == 401, f"Expected 401 on bad password: {status} {res}"
    assert "Invalid" in res.get("detail", ""), f"Unexpected detail message: {res}"
    print(" [PASS] 5. Invalid password properly rejected with 401")

    # 6. Nonexistent user check
    status, res = api_call("POST", "/auth/login", {"username": "nonexistent@example.com", "password": "any"}, is_form=True)
    assert status == 401, f"Expected 401 on nonexistent user: {status} {res}"
    print(" [PASS] 6. Non-existent identifier rejected with 401")

    # 7. Verify /auth/me for Admin
    status, me_res = api_call("GET", "/auth/me", token=admin_token)
    assert status == 200, f"Admin /auth/me failed: {status} {me_res}"
    assert me_res["role"] == "ORG_ADMIN", f"Unexpected role: {me_res['role']}"
    assert me_res["email"] == "nitin@gmail.com"
    print(" [PASS] 7. Admin /auth/me verified: Role=ORG_ADMIN, Org=", me_res["organization"]["name"])

    # 8. Verify /auth/me for Employee
    status, emp_me_res = api_call("GET", "/auth/me", token=emp_token)
    assert status == 200, f"Employee /auth/me failed: {status} {emp_me_res}"
    assert emp_me_res["role"] == "EMPLOYEE", f"Unexpected role: {emp_me_res['role']}"
    print(" [PASS] 8. Employee /auth/me verified: Role=EMPLOYEE, EmployeeCode=", emp_me_res["employee"]["employee_code"])

    # 9. Stress / Repeated logins to test connection pool stability
    print(" [RUNNING] 9. Testing 20 rapid consecutive logins to verify DB connection pool stability...")
    for i in range(20):
        s, r = api_call("POST", "/auth/login", {"username": "nitin@gmail.com", "password": "Admin@123"}, is_form=True)
        assert s == 200, f"Pool test failed on iteration {i}: {s} {r}"
    print(" [PASS] 9. 20 consecutive logins succeeded without pool exhaustion or connection timeouts!")

    print("\n ALL LOGIN AND AUTHENTICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
