import urllib.request, urllib.parse, json, sys
url = 'http://127.0.0.1:8001/api/v1/auth/login'
# Use credentials from .env or known admin user (nitin@gmail.com) and password from seeded data (unknown). We'll try with placeholder 'password123'
post_data = urllib.parse.urlencode({'username': 'nitin@gmail.com', 'password': 'password123'}).encode()
req = urllib.request.Request(url, data=post_data)
req.add_header('Content-Type', 'application/x-www-form-urlencoded')
try:
    with urllib.request.urlopen(req) as resp:
        print('Status', resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('HTTPError', e.code, e.read().decode())
except Exception as e:
    print('Error', e)

