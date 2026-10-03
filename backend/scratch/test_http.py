import urllib.request, json

try:
    with urllib.request.urlopen("http://127.0.0.1:8000/docs", timeout=3) as resp:
        print("Port 8000 status:", resp.status)
except Exception as e:
    print("Port 8000 error:", e)
