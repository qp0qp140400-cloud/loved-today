import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntry,escapeHTML,todayLocal,isPublicConfig,friendlyError} from '../dist/domain.js';
import {moods,journey,fruits} from '../dist/content.js';
test('일기는 기도나 감사 한 가지만 작성할 수 있고 공백을 제거한다',()=>{
 assert.deepEqual(validateEntry({entry_date:'2026-11-05',title:'  오늘의 기도 ',prayer:' ',gratitude:' 고마운 하루 '}),{entry_date:'2026-11-05',title:'오늘의 기도',prayer:'',gratitude:'고마운 하루'});
 assert.doesNotThrow(()=>validateEntry({entry_date:'2024-02-29',title:'윤년',prayer:'감사합니다'}));
});
test('빈 기록, 범위를 넘는 기록, 실제로 없는 날짜를 거부한다',()=>{
 const valid={entry_date:'2026-11-05',title:'나의 기도',prayer:'오늘도 감사합니다'};
 for(const changes of [{title:' '},{prayer:' ',gratitude:' '},{entry_date:'2026-02-30'},{entry_date:'2025-02-29'},{entry_date:'not-a-date'},{title:'가'.repeat(101)},{prayer:'가'.repeat(10001)},{gratitude:'가'.repeat(10001)}])assert.throws(()=>validateEntry({...valid,...changes}));
});
test('사용자가 입력한 HTML과 속성 경계를 텍스트로 처리한다',()=>{
 assert.equal(escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 assert.equal(escapeHTML("'&<>"),'&#39;&amp;&lt;&gt;');
});
test('클라이언트 설정은 HTTPS와 publishable 키만 허용한다',()=>{
 const key='sb_publishable_example';
 assert.equal(isPublicConfig({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:key}),true);
 for(const [url,k] of [['http://example.com',key],['https://u:p@example.com',key],['https://example.com','sb_secret_example'],['https://example.com','eyJhbGci.service_role'],['https://example.com/path',key]])assert.equal(isPublicConfig({supabaseUrl:url,supabasePublishableKey:k}),false);
});
test('날짜는 사용자 기기의 자정 기준이며 UTC 날짜로 바꾸지 않는다',()=>{
 assert.equal(todayLocal(new Date(2026,10,5,0,1)),'2026-11-05');
});
test('오류 안내에 서버의 상세 오류나 비밀정보를 노출하지 않는다',()=>{
 assert.match(friendlyError({code:'PGRST205'}),/저장 공간/);
 assert.match(friendlyError({code:'email_not_confirmed'}),/확인 링크/);
 assert.equal(friendlyError({message:'private database information'}).includes('private database'),false);
});
test('모든 감정에 서로 다른 검증 가능한 장절과 묵상 요소가 있다',()=>{
 assert.equal(moods.length,6);assert.equal(new Set(moods.map(m=>m.id)).size,6);
 for(const m of moods){for(const key of ['reference','chapter','text','context','explanation','question','prayer','practice','guide'])assert.ok(m[key],m.id+' '+key);}
 assert.equal(journey.length,7);assert.equal(fruits.length,9);
});
