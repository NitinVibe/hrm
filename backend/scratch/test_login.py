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
            print("Response:", body[:100])
            return json.loads(body)
    except urllib.error.HTTPError as e:
        print(f"HTTPError for {username}: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error for {username}: {e}")
    return None

if __name__ == "__main__":
    print("Testing admin login:")
    test_login("nitin@gmail.com", "admin123")
    test_login("nitin@gmail.com", "password123")
    test_login("nitin@gmail.com", "admin")
    test_login("nitin@gmail.com", "nitin123")
