import assert from 'node:assert/strict';
// config.js에는 공개키만 들어 있습니다. 서비스 역할 키를 사용하지 않습니다.
globalThis.window={};
await import('../dist/config.js');
const {supabaseUrl,supabasePublishableKey}=window.APP_CONFIG;
for(const table of ['prayer_entries','favorites']){
 for(const method of ['GET','POST']){
  const body=table==='favorites'?{verse_id:'hope'}:{title:'anonymous access verification',prayer:'test',entry_date:'2026-11-05'};
  const response=await fetch(`${supabaseUrl}/rest/v1/${table}${method==='GET'?'?select=id&limit=1':''}`,{
   method,headers:{apikey:supabasePublishableKey,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})
  });
  const data=await response.json();
  assert.ok([401,403].includes(response.status)&&data.code==='42501',`${table} ${method}: 접근 차단 실패 (${response.status})`);
  console.log(`${table}: 비회원 ${method==='GET'?'읽기':'쓰기'} 차단 확인 (${response.status})`);
 }
}
