import urllib.request, urllib.parse, json

def test_login(username, password):
    url = "http://127.0.0.1:8000/api/v1/auth/login"
    data = urllib.parse.urlencode({"username": username, "password": password}).encode()
    req = urllib.request.Request(url, data=data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode()
            print(f"SUCCESS for {username}: Status {resp.status}")
            print("Response:", body)
            return json.loads(body)
    except urllib.error.HTTPError as e:
        print(f"HTTPError for {username}: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error for {username}: {e}")
    return None

if __name__ == "__main__":
    print("Testing admin login with Admin@123:")
    token_res = test_login("nitin@gmail.com", "Admin@123")
    if token_res and "access_token" in token_res:
        # Also test employee code login
        print("\nTesting login by Employee ID (EMP-0A72C84D):")
        test_login("EMP-0A72C84D", "Admin@123")
        
        # Also test /auth/me
        print("\nTesting /auth/me:")
        req = urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/me")
        req.add_header("Authorization", f"Bearer {token_res['access_token']}")
        with urllib.request.urlopen(req, timeout=5) as resp:
            print("GET /auth/me response:", resp.read().decode())
