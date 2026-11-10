"""Exercise live storage using an ephemeral test identity. Key enters via hidden stdin."""
import getpass,json,urllib.request,urllib.error,uuid
BASE='https://ejctwgtqekavtggagecg.supabase.co'
KEY=getpass.getpass('Bridge key (hidden): ')
SUBJECT='atlas-test-'+str(uuid.uuid4())
def vault(data,key=KEY):
    req=urllib.request.Request(BASE+'/functions/v1/atlas-vault',data=json.dumps({**data,'subject':SUBJECT}).encode(),headers={'Content-Type':'application/json','X-Atlas-Key':key})
    with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
try:
    vault({'action':'upload','mime':'text/plain','size':5},'invalid')
    raise AssertionError('Unauthenticated upload accepted')
except urllib.error.HTTPError as error:
    assert error.code in (400,401,403)
signed=vault({'action':'upload','mime':'text/plain','size':5})
req=urllib.request.Request(signed['signedUrl'],data=b'hello',method='PUT',headers={'Content-Type':'text/plain','x-upsert':'false'})
with urllib.request.urlopen(req,timeout=30) as response: assert response.status in (200,201)
record=vault({'action':'confirm','path':signed['path'],'title':'Integration test.txt'})
same=vault({'action':'confirm','path':signed['path'],'title':'Integration test.txt'})
assert same['id']==record['id']
download=vault({'action':'download','id':record['id']})
with urllib.request.urlopen(download['url'],timeout=30) as response: assert response.read()==b'hello'
vault({'action':'delete','id':record['id'],'version':1})
try:
    vault({'action':'download','id':record['id']})
    raise AssertionError('Deleted record still downloadable')
except urllib.error.HTTPError as error: assert error.code==400
print(json.dumps({'result':'PASS: unauthenticated denial, signed upload, idempotent confirmation, private download, delete','test_subject':SUBJECT}))
