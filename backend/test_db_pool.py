import json
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "http://127.0.0.1:8000/api/v1"

import urllib.parse

def api_call(method, url, headers=None, data=None, form_data=None):
    headers = headers.copy() if headers else {}
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")
    elif form_data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        body = urllib.parse.urlencode(form_data).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}
    except Exception as e:
        return 500, {"error": str(e)}

def test_pool():
    print("=" * 60)
    print("TESTING DB CONNECTION POOL CONCURRENCY & STABILITY")
    print("=" * 60)

    # 1. Health check
    code, res = api_call("GET", "http://127.0.0.1:8000/health/database")
    print(f"Database health check: {code} - {res}")
    assert code == 200

    # 2. Login to get token
    code, login_res = api_call("POST", f"{BASE_URL}/auth/login", form_data={"username": "nitin@gmail.com", "password": "Admin@123"})
    assert code == 200, f"Login failed: {login_res}"
    token = login_res["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("PASS: Admin authentication successful")

    # 3. High concurrency burst (50 concurrent requests to /auth/me and /notifications)
    print("\nRunning 50 concurrent requests across endpoints...")
    endpoints = [
        "http://127.0.0.1:8000/health/database",
        f"{BASE_URL}/auth/me",
        f"{BASE_URL}/notifications",
        f"{BASE_URL}/notifications/unread-count",
        f"{BASE_URL}/departments",
        f"{BASE_URL}/designations",
        f"{BASE_URL}/branches",
        f"{BASE_URL}/shifts",
        f"{BASE_URL}/employees",
        f"{BASE_URL}/leave-types",
    ]

    urls_to_test = [endpoints[i % len(endpoints)] for i in range(100)]

    def make_req(url):
        t0 = time.time()
        code, resp = api_call("GET", url, headers=headers)
        dt = time.time() - t0
        return code, dt, url

    successes = 0
    failures = 0
    times = []

    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = [executor.submit(make_req, url) for url in urls_to_test]
        for f in as_completed(futures):
            code, dt, url = f.result()
            times.append(dt)
            if code in (200, 201):
                successes += 1
            else:
                failures += 1
                print(f"FAILED request: {url} -> {code}")

    avg_time = sum(times) / len(times)
    max_time = max(times)
    min_time = min(times)

    print(f"\nRESULTS:")
    print(f"  Total Requests: {len(urls_to_test)}")
    print(f"  Successful:     {successes}")
    print(f"  Failed:         {failures}")
    print(f"  Min latency:    {min_time*1000:.1f}ms")
    print(f"  Avg latency:    {avg_time*1000:.1f}ms")
    print(f"  Max latency:    {max_time*1000:.1f}ms")

    assert failures == 0, f"{failures} requests failed!"
    print("\nPASS: All 50 concurrent requests completed successfully with ZERO connection pool errors!")

if __name__ == "__main__":
    test_pool()
