import urllib.request
import json

req = urllib.request.Request("https://cve.circl.lu/api/last/10")
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    for cve in data:
        print(cve['id'], cve.get('Published', 'N/A'))
