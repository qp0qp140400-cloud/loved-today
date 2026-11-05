import assert from 'node:assert/strict';
import {moods,journey} from '../dist/content.js';
const normalize=text=>text.replace(/&#160;|&nbsp;/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
for(const mood of moods){
 const response=await fetch(`https://ebible.org/kor/${mood.chapter}.htm`);
 assert.equal(response.status,200,mood.reference);
 const html=await response.text();
 const numbers=mood.reference.split(':')[1].split('–').map(Number);
 const first=numbers[0],last=numbers.at(-1);
 const texts=[];
 for(let n=first;n<=last;n++){
  const marker=`id="V${n}"`;
  const begin=html.indexOf(marker);assert.ok(begin>=0,marker);
  const end=html.indexOf('<span class="verse"',begin+marker.length);
  const fragment=html.slice(begin,end<0?html.indexOf('<!--',begin):end);
  texts.push(normalize(fragment.slice(fragment.indexOf('</span>')+7)).replace(/^\d+$/,''));
 }
 // Verse separators can be wrapped in paragraph tags; keep exact text, normalize only whitespace.
 const actual=normalize(texts.join(' '));
 assert.equal(actual,normalize(mood.text),`${mood.reference}: 인용 본문 불일치`);
 console.log('본문 대조 일치:',mood.reference);
}
for(const chapter of new Set(journey.map(j=>j.chapter))){
 const response=await fetch(`https://ebible.org/kor/${chapter}.htm`);
 assert.equal(response.status,200,chapter);
 console.log('묵상 본문 링크 확인:',chapter);
}
console.log('성경 본문 6종 및 7일 묵상 링크 검증 완료');
