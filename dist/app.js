import { moods, journey, fruits, guides, bibleEdition } from './content.js';
import { escapeHTML as esc, todayLocal, validateEntry, isPublicConfig, friendlyError } from './domain.js';

const paths = {
 sprout:'M12 21v-9M12 16C4 16 3 8 3 8c8 0 9 6 9 6M12 11c0-8 9-8 9-8s0 8-9 8M7 21h10',
 home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
 book:'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2v16',
 cross:'M10 3h4v6h6v4h-6v8h-4v-8H4V9h6Z',
 pen:'m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-5-5L4 15Zm0 0 4-1',
 heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
 'heart-bandage':'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8ZM7 10l6 6m-3-9 6 6',
 'cloud-rain':'M7 15a5 5 0 1 1 1-9 6 6 0 0 1 11 3 3.5 3.5 0 0 1-1 7M8 18l-1 3m6-3-1 3m6-3-1 3',
 wind:'M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 0 0-6M4 16h10a3 3 0 1 1-3 3',
 moon:'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
 arrow:'M4 12h16m-6-6 6 6-6 6',
 bookmark:'M6 3h12v19l-6-4-6 4Z',
 lock:'M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
 trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
 info:'M12 17v-5m0-4v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 leaf:'M20 3S4 1 4 12a8 8 0 0 0 8 8c11 0 8-17 8-17ZM4 21 15 10',
 check:'m5 12 4 4L20 5',
 logout:'M9 5H4v14h5m6-15 6 8-6 8m-7-8h13'
};
const icon=(name, cls='')=>`<svg ${cls?`class="${cls}"`:''} aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[name]||paths.leaf}"/></svg>`;
const $=selector=>document.querySelector(selector);
const main=$('#main'), modal=$('#modal');
const navigation=[['home','홈','home'],['word','마음별 말씀','book'],['jesus','예수님 알아가기','cross'],['diary','기도 일기','pen'],['growth','믿음의 성장','sprout']];
let client=null, currentUser=null, authReady=false, authFailure='', dataEpoch=0;
let favoriteIds=new Set(), favoriteReady=false, favoriteError='', toastTimer;
let draft={entry_date:todayLocal(), title:'',prayer:'',gratitude:''};
let authMode='login', recoveryMode=false, historyDate='', pendingFavorite=null;
let busyFavorite=false, savingEntry=false;
const route=()=>{const [page='home',part='']=location.hash.slice(1).split('/');return {page:page||'home',part};};
const sourceUrl=m=>`https://ebible.org/kor/${m.chapter}.htm`;
function notify(message){const t=$('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),4500);}
function navigate(path){if(location.hash===`#${path}`)render();else location.hash=path;}
function intro(kicker,title,description){return `<div class="page-intro"><div class="eyebrow"><span class="dot"></span>${kicker}</div><h1>${title}</h1><p>${description}</p></div>`;}
function helpStrip(){return `<div class="help-strip">${icon('heart')}<div>혼자 견디지 않아도 괜찮아요. 마음의 고통이 일상을 어렵게 한다면 전문 상담가·의료진, 믿을 만한 사람에게 도움을 요청해 주세요. <button data-action="help">도움 안내</button></div></div>`;}
function showModal(title,html){$('#modal-body').innerHTML=`<h2 class="modal-title" id="modal-title">${title}</h2><div class="modal-copy">${html}</div>`;modal.showModal();}
function closeModal(){modal.close();}
$('#modal-close').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});

function updateNav(page){
 const active=page==='favorites'?'diary':page;
 $('#desktop-nav').innerHTML=navigation.map(([id,label])=>`<a class="nav-link" href="#${id}" ${id===active?'aria-current="page"':''}>${label}</a>`).join('');
 $('#mobile-nav').innerHTML=navigation.map(([id,label,graphic])=>`<a href="#${id}" ${id===active?'aria-current="page"':''}>${icon(graphic)}<span>${label}</span></a>`).join('');
 $('#account-button').textContent=currentUser?'내 계정 ↗':'로그인 ↗';
 $('#account-button').setAttribute('aria-label',currentUser?'내 계정 보기':'로그인하기');
}

function home(){
 const day=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
 return `<section class="hero" aria-labelledby="hero-title"><img class="hero-image" src="assets/sunrise.jpg" alt="들판 위로 부드러운 아침 햇살이 비치는 풍경" fetchpriority="high"><div><div class="eyebrow"><span class="dot"></span>A LITTLE REST FOR YOUR SOUL</div><h1 id="hero-title">당신은 하나님의 사랑 안에<br><em>소중한 사람입니다.</em></h1><p>어떤 마음으로 와도 괜찮아요.<br>말씀 안에서 잠시 쉬고, 작은 소망을 만나세요.</p><a class="btn btn-light" href="#word/hurt">오늘의 말씀 만나기 ${icon('arrow')}</a></div><span class="hero-bottom">LOVED, JUST AS YOU ARE</span></section>
 <div class="welcome-line"><span>${icon('sun')} 오늘도 당신의 하루에 따뜻한 빛이 머물기를</span><time datetime="${todayLocal()}">${esc(day)}</time></div>
 <div class="home-grid"><section aria-labelledby="mood-heading"><div class="section-heading"><div><span class="section-number">01 — YOUR HEART</span><h2 id="mood-heading">오늘 당신의 마음은 어떤가요?</h2><p>지금의 마음을 골라 보세요. 당신을 위한 말씀을 준비했어요.</p></div></div><div class="mood-grid">${moods.map(m=>`<a class="mood-card" href="#word/${m.id}" aria-label="${m.name}에 관한 말씀 읽기"><span class="mood-icon ${m.color}">${icon(m.icon)}</span><strong>${m.feeling}</strong><small>${m.caption}</small></a>`).join('')}</div><p class="gentle-note">${icon('heart')} 마음에 정답은 없어요. 지금 느끼는 그대로여도 괜찮아요.</p></section>
 <aside class="daily-verse" aria-label="오늘의 말씀"><div class="eyebrow">${icon('book')} TODAY’S WORD <span>·</span> 잠시, 말씀 곁에</div><blockquote>수고하고 무거운 짐진 자들아 !<br>다 내게로 오라<br>내가 너희를 쉬게 하리라</blockquote><cite>마태복음 11:28 · 한국어 성경(eBible.org)</cite><a href="#word/hurt" class="btn btn-quiet">말씀과 함께 머물기 ${icon('arrow')}</a><span class="verse-watermark">${icon('sprout')}</span></aside></div>
 <section class="next-section" aria-labelledby="next-heading"><div class="section-heading"><div><span class="section-number">02 — WALK WITH HIM</span><h2 id="next-heading">당신의 속도로, 한 걸음씩</h2><p>처음이어도 괜찮아요. 함께 알아가고, 마음을 나누고, 자라가요.</p></div></div><div class="feature-grid"><a class="feature-card feature-photo" href="#jesus"><img src="assets/forest.jpg" alt="햇살이 내려앉은 푸른 숲" loading="lazy"><span class="mini-label">MEET JESUS</span><h3>예수님, 어떤 분이실까요?</h3><p>7일 동안, 사랑의 이야기를<br>천천히 알아가 보세요.</p><span class="arrow">${icon('arrow')}</span></a><a class="feature-card" href="#diary"><span class="mini-label">A QUIET CONVERSATION</span><h3>말하지 못했던 마음까지</h3><p>기도와 감사로 오늘을 돌아보는<br>나만의 작은 기록을 남겨 보세요.</p><span class="arrow">${icon('pen')}</span></a><a class="feature-card" href="#growth"><span class="mini-label">GROW IN GRACE</span><h3>작은 사랑이 자라는 시간</h3><p>완벽함보다, 어제보다 조금 더<br>예수님을 닮아가는 걸음.</p><span class="arrow">${icon('sprout')}</span></a></div></section><p class="tiny-promise">${icon('leaf')} 서두르지 않아도, 멈춰 쉬어도 괜찮아요.</p>`;
}

function word(part){const m=moods.find(x=>x.id===part)||moods[0], guide=guides[m.guide];return `${intro('WORDS FOR YOUR HEART','지금의 마음에, 한 구절','괜찮은 척하지 않아도 돼요. 말씀 곁에서 천천히 마음을 살펴보세요.')}
 <div class="mood-tabs" role="group" aria-label="마음 선택">${moods.map(x=>`<button class="mood-tab" data-action="mood" data-id="${x.id}" aria-pressed="${x.id===m.id}">${icon(x.icon)}${x.name}</button>`).join('')}</div>
 <div class="reading-layout"><div><article class="reading-card"><div class="reading-top"><span class="mood-icon ${m.color}">${icon(m.icon)}</span><span>${m.caption}</span></div><h2>${m.title}</h2><blockquote class="scripture">${m.text}</blockquote><div class="reference">${m.reference}</div><p class="source-line">${bibleEdition}<br><a href="${sourceUrl(m)}" target="_blank" rel="noopener noreferrer">eBible.org 원문과 앞뒤 문맥 읽기 ↗</a></p><div class="reading-actions"><button class="bookmark" data-action="favorite" data-id="${m.id}" aria-pressed="${favoriteIds.has(m.id)}" ${busyFavorite?'disabled':''}>${icon('bookmark')}<span>${favoriteIds.has(m.id)?'저장한 말씀':'말씀 즐겨찾기'}</span></button><button class="btn btn-quiet" data-action="share" data-id="${m.id}">말씀 나누기 ${icon('arrow')}</button></div></article>
 <article class="reflection-card"><h3>말씀을 조금 더 가까이</h3><p class="context">${m.context}</p><p>${m.explanation}</p><p class="source-line">앱 편집 해설 · 성경 인용문이 아닙니다.<br>문맥 이해 참고: <a href="${guide.url}" target="_blank" rel="noopener noreferrer">${guide.title} ↗</a></p></article></div>
 <aside class="side-stack"><section class="side-card"><h3>${icon('leaf')} 하나님을 알아가는 질문</h3><p>${m.question}</p><a class="btn btn-quiet" href="#diary">내 마음 적어 보기 ${icon('arrow')}</a></section><section class="side-card"><h3>${icon('heart')} 오늘의 짧은 기도</h3><p>${m.prayer}</p></section><section class="side-card practice-card"><h3>${icon('sprout')} 오늘의 작은 실천</h3><p>${m.practice}</p><p class="small" style="margin-top:13px">할 수 있는 만큼만, 당신의 속도로 해 보세요.</p></section></aside></div>${helpStrip()}`;}

function jesus(part){const index=Math.max(0,Math.min(6,(Number(part)||1)-1)),j=journey[index];return `${intro('MEET JESUS','예수님, 함께 알아가요','낯선 이름에서 가까운 만남으로. 질문을 품은 채 시작해도 괜찮아요.')}<section class="journey-banner"><div><span class="section-number">A 7-DAY JOURNEY</span><h2>사랑을 알아가는<br>일곱 번의 작은 만남</h2><p>하루 한 이야기, 한 질문, 한 걸음.<br>매일 이어 읽지 않아도 괜찮아요. 언제든 돌아오세요.</p></div><img src="assets/forest.jpg" alt="푸른 나무 사이로 스며드는 햇살"></section><div class="day-layout"><nav class="day-list" aria-label="7일 묵상 선택">${journey.map((x,i)=>`<button class="day-button" data-action="day" data-id="${i+1}" aria-label="${i+1}일차 ${x.title}" aria-pressed="${index===i}"><span class="day-number">${i+1}</span><span><strong>${x.title}</strong><small>${x.reference}</small></span></button>`).join('')}</nav><article class="card journey-reading" id="journey-reading"><span class="section-number">DAY 0${index+1} · 예수님 알아가기</span><h2>${j.title}</h2><p class="muted">${j.subtitle}</p><a class="chapter-link" href="https://ebible.org/kor/${j.chapter}.htm" target="_blank" rel="noopener noreferrer">${j.reference} · 성경 본문 읽기 ↗</a><p class="body-copy">${j.body}</p><div class="question-box"><h3>잠시 생각해 볼까요?</h3><p>${j.question}</p></div><h3>이렇게 기도해 보세요</h3><p>${j.prayer}</p><h3>오늘의 작은 걸음</h3><p>${j.practice}</p><p class="source-line">앱 편집 묵상 · 본문을 쉬운 말로 설명한 글입니다. 성경 번역문과 구분해 읽어 주세요.<br>참고: <a href="https://bibleproject.com/guides/book-of-matthew/" target="_blank" rel="noopener noreferrer">BibleProject 복음서 개관</a>, <a href="https://bibleproject.com/guides/book-of-romans/" target="_blank" rel="noopener noreferrer">로마서 개관</a></p><div class="day-controls">${index>0?`<button class="btn btn-outline" data-action="day" data-id="${index}">← 이전 이야기</button>`:'<span></span>'}${index<6?`<button class="btn btn-primary" data-action="day" data-id="${index+2}">다음 이야기 ${icon('arrow')}</button>`:'<a class="btn btn-primary" href="#diary">기도로 마음 나누기 '+icon('arrow')+'</a>'}</div></article></div>${helpStrip()}`;}

function guestGate(favorites=false){if(!authReady)return '<p class="loading-text" role="status">로그인 상태를 확인하고 있어요…</p>';return `<div class="empty-state guest-gate"><span class="mood-icon green">${icon(favorites?'bookmark':'lock')}</span><h2>${favorites?'마음에 닿은 말씀을 모아 두세요':'당신의 마음이 머무는, 조용한 자리'}</h2><p>${favorites?'다시 읽고 싶은 말씀을 내 계정에 간직해 보세요.':'말로 다 하지 못했던 기도와 작은 감사를 남겨 보세요.'}<br>로그인 후 나만의 기록을 저장할 수 있어요.</p><button class="btn btn-primary" data-action="login">로그인하고 시작하기 ${icon('arrow')}</button></div><p class="gate-note">${authFailure?esc(authFailure):'기도 일기와 즐겨찾기는 계정별로 보관합니다. 말씀과 7일 묵상은 로그인 없이 읽을 수 있어요.'}</p>`;}
function diary(){return `${intro('A QUIET CONVERSATION','오늘의 마음을, 기도로','길고 멋진 문장이 아니어도 괜찮아요. 오늘의 진심을 한 줄 남겨 보세요.')}<div class="diary-toolbar"><button data-action="diary-tab" data-id="diary" aria-pressed="true">${icon('pen')} 기도 일기</button><button data-action="diary-tab" data-id="favorites" aria-pressed="false">${icon('bookmark')} 저장한 말씀</button></div>${currentUser?`<div class="diary-layout"><section class="card"><h2>하나님께 드리는 오늘의 이야기</h2><form id="diary-form" class="diary-form"><div class="row"><div><label for="entry-date">기록 날짜</label><input id="entry-date" name="entry_date" type="date" value="${esc(draft.entry_date)}" required></div><div><label for="entry-title">오늘의 제목</label><input id="entry-title" name="title" placeholder="오늘은 어떤 하루였나요?" maxlength="100" value="${esc(draft.title)}" required></div></div><label for="entry-prayer">나의 기도 제목</label><textarea id="entry-prayer" name="prayer" maxlength="10000" placeholder="하나님, 오늘 제 마음은…">${esc(draft.prayer)}</textarea><label for="entry-gratitude">오늘의 작은 감사</label><textarea id="entry-gratitude" name="gratitude" maxlength="10000" placeholder="오늘 제게 작은 선물이 되어 준 것은…">${esc(draft.gratitude)}</textarea><p class="field-hint">기도나 감사 중 하나만 적어도 괜찮아요. 각각 10,000자까지 쓸 수 있어요.</p><p class="private-label">${icon('lock')} 내 계정에서만 열람할 수 있는 기록이에요.</p><button class="btn btn-primary" type="submit">오늘의 마음 저장하기 ${icon('pen')}</button><p id="diary-message" class="form-message" role="status" aria-live="polite"></p></form></section><section aria-label="이전 기도 일기"><div class="history-head"><h2>마음이 머물렀던 날들</h2><button class="btn btn-quiet" data-action="refresh-entries" aria-label="이전 기록 새로고침">새로고침 ↻</button></div><div class="history-filter"><label class="small" for="history-date" style="margin:0">날짜</label><input id="history-date" type="date" value="${esc(historyDate)}"><button data-action="clear-filter">전체 보기</button></div><div id="entries" class="entry-list"><p class="loading-text" role="status">기록을 불러오고 있어요…</p></div></section></div>`:guestGate()}${helpStrip()}`;}
function favorites(){return `${intro('WORDS TO KEEP','다시 만나고 싶은 말씀','마음에 닿았던 한 구절, 오늘 다시 천천히 읽어 보세요.')}<div class="diary-toolbar"><button data-action="diary-tab" data-id="diary" aria-pressed="false">${icon('pen')} 기도 일기</button><button data-action="diary-tab" data-id="favorites" aria-pressed="true">${icon('bookmark')} 저장한 말씀</button></div>${currentUser?`<div id="favorites-list">${favoriteReady?favoriteCards():`<p class="loading-text" role="status">저장한 말씀을 불러오고 있어요…</p>`}</div>`:guestGate(true)}`;}
function favoriteCards(){if(favoriteError)return `<div class="notice">${esc(favoriteError)} <button class="btn btn-quiet" data-action="refresh-favorites">다시 불러오기</button></div>`;const saved=moods.filter(m=>favoriteIds.has(m.id));return saved.length?`<div class="favorite-list">${saved.map(m=>`<article class="card favorite-card"><div class="reading-top"><span class="mood-icon ${m.color}">${icon(m.icon)}</span><button class="icon-button" data-action="favorite" data-id="${m.id}" aria-label="${m.reference} 즐겨찾기 해제" ${busyFavorite?'disabled':''}>${icon('trash')}</button></div><h3>${m.title}</h3><blockquote>${m.text}</blockquote><p class="reference">${m.reference}</p><p class="source-line">${bibleEdition}</p><a class="btn btn-quiet" href="#word/${m.id}">묵상 다시 읽기 ${icon('arrow')}</a></article>`).join('')}</div>`:`<div class="empty-state"><span class="mood-icon green">${icon('bookmark')}</span><h2>아직 모아 둔 말씀이 없어요</h2><p>말씀을 읽다가 마음에 닿는 구절을 저장해 보세요.</p><a class="btn btn-outline" href="#word">말씀 만나러 가기 ${icon('arrow')}</a></div>`;}

function growth(){return `${intro('GROW IN GRACE','작은 사랑이 자라는 시간','잘해 낸 날을 세기보다, 오늘 내 마음에 자라는 사랑을 바라보세요.')}<div class="notice">성령의 열매는 영적인 점수표가 아니에요. 성령의 도우심으로 예수님의 성품을 배워 가는 삶의 모습입니다. <a class="read-more" href="https://ebible.org/kor/GAL05.htm" target="_blank" rel="noopener noreferrer">갈라디아서 5:22–23 문맥 읽기 ↗</a></div><div class="fruit-grid">${fruits.map(([name,description,practice],i)=>`<article class="card fruit-card"><span>0${i+1} ${icon('sprout')}</span><h2>${name}</h2><p>${description}</p><p class="practice">${practice}</p></article>`).join('')}</div><section class="growth-bottom"><div><h2>매일 조금씩, 사랑을 알아가요</h2><p>7일 묵상을 원하는 순서와 속도로 읽어 보세요. 출석이나 점수는 없어요.</p></div><a class="btn btn-primary" href="#jesus">7일 묵상 시작하기 ${icon('arrow')}</a></section>${helpStrip()}`;}

function login(){
 if(currentUser&&!recoveryMode)return `<div class="auth-shell"><div class="auth-heading"><span class="brand-symbol">${icon('sprout')}</span><h1>오늘도, 함께 걸어요</h1><p>내 계정</p></div><div class="card auth-card"><p class="account-info">${esc(currentUser.email || '로그인한 사용자')}</p><p class="small">기도 일기와 저장한 말씀을 이 계정으로 보관하고 있어요.</p><a href="#diary" class="btn btn-primary">나의 기도 일기 ${icon('arrow')}</a><button class="btn btn-quiet" data-action="logout">로그아웃 ${icon('logout')}</button></div></div>`;
 const isSignup=authMode==='signup', isReset=authMode==='reset', isRecover=recoveryMode;
 return `<div class="auth-shell"><div class="auth-heading"><span class="brand-symbol">${icon('sprout')}</span><h1>${isRecover?'새 비밀번호 정하기':isReset?'다시, 편안하게 만나요':'당신을 위한 작은 쉼터'}</h1><p>${isRecover?'안전한 새 비밀번호로 계정을 지켜 주세요.':isReset?'비밀번호를 재설정할 링크를 보내 드릴게요.':'기도와 감사를 간직할 나만의 공간을 만나세요.'}</p></div><section class="card auth-card">${!isReset&&!isRecover?`<div class="auth-tabs" role="tablist" aria-label="계정"><button role="tab" id="login-tab" aria-selected="${!isSignup}" aria-controls="auth-form" data-action="auth-mode" data-id="login">로그인</button><button role="tab" id="signup-tab" aria-selected="${isSignup}" aria-controls="auth-form" data-action="auth-mode" data-id="signup">회원가입</button></div>`:''}${!client?`<div class="notice" role="status">${esc(authFailure||'로그인 연결을 준비하고 있어요…')}</div>`:''}<form id="auth-form" ${!isReset&&!isRecover?`role="tabpanel" aria-labelledby="${isSignup?'signup':'login'}-tab"`:''}>
 ${!isRecover?'<label for="auth-email">이메일</label><input type="email" name="email" id="auth-email" placeholder="you@example.com" autocomplete="email" maxlength="254" required>':''}
 ${!isReset?`<label for="auth-password">${isRecover?'새 비밀번호':'비밀번호'}</label><div class="password-row"><input type="password" name="password" id="auth-password" placeholder="${isSignup||isRecover?'8자 이상 입력해 주세요':'비밀번호를 입력해 주세요'}" autocomplete="${isSignup||isRecover?'new-password':'current-password'}" minlength="${isSignup||isRecover?'8':'1'}" maxlength="128" required><button type="button" class="password-toggle" data-action="password" aria-label="비밀번호 보기" aria-pressed="false">보기</button></div>`:''}
 ${isSignup||isRecover?'<label for="auth-confirm">비밀번호 확인</label><input type="password" name="confirm" id="auth-confirm" placeholder="비밀번호를 한 번 더 입력해 주세요" autocomplete="new-password" minlength="8" maxlength="128" required>':''}
 ${isSignup?'<p class="field-hint">가입 후 이메일의 확인 링크를 눌러 주세요. 이용하지 않는 다른 서비스와 다른 비밀번호를 권해 드려요.</p><label class="small" style="display:flex;align-items:flex-start;gap:8px"><input type="checkbox" name="privacy" required style="width:16px;min-height:16px;margin-top:3px"> <span><button type="button" class="btn-quiet" style="font-size:11px;min-height:0" data-action="privacy">개인정보 안내</button>를 확인했으며 이메일·개인 기록 저장에 동의해요.</span></label>':''}
 <button class="btn btn-primary" type="submit" ${!client?'disabled':''}>${isRecover?'새 비밀번호 저장':isReset?'재설정 메일 받기':isSignup?'이메일로 회원가입':'이메일로 로그인'} ${icon('arrow')}</button><p id="auth-message" class="form-message" role="status" aria-live="polite"></p></form><div class="auth-meta">${!isSignup&&!isReset&&!isRecover?'<button data-action="auth-mode" data-id="reset">비밀번호를 잊으셨나요?</button><button data-action="resend">가입 확인 메일 다시 받기</button>':''}${isReset?'<button data-action="auth-mode" data-id="login">← 로그인으로 돌아가기</button>':''}</div></section><p class="auth-bottom">잠시 둘러보고 싶다면 <a href="#word">로그인 없이 말씀 읽기</a></p><p class="gate-note">이메일은 계정 인증을 위해 사용하며, 개인 기록은 로그인한 본인만 앱에서 열람할 수 있어요. 공용 기기에서는 사용 후 로그아웃해 주세요.</p></div>`;
}

function render({focus=false}={}){
 const {page,part}=route();updateNav(page);
 const pages={home:()=>home(),word:()=>word(part),jesus:()=>jesus(part),diary,favorites,growth,login};
 const view=pages[page];
 main.innerHTML=`<div class="page-fade">${view?view():`${intro('A LITTLE REST','길을 다시 찾아볼까요?','이 페이지를 찾지 못했어요. 첫 화면에서 다시 시작해 주세요.')}<a class="btn btn-primary" href="#home">홈으로 가기</a>`}</div>`;
 document.title=`${({home:'말씀과 함께 쉬어가는 곳',word:'마음별 말씀',jesus:'예수님 알아가기',diary:'기도 일기',favorites:'저장한 말씀',growth:'믿음의 성장',login:'내 계정'})[page]||'페이지 찾기'} | 오늘도, 사랑받는 당신`;
 if(page==='diary'&&currentUser)loadEntries();
 if(page==='favorites'&&currentUser&&!favoriteReady)loadFavorites();
 if(focus)main.focus({preventScroll:true});
}
window.addEventListener('hashchange',()=>{render({focus:true});window.scrollTo({top:0,behavior:'instant'});});
$('#brand-symbol').innerHTML=icon('sprout');
$('#account-button').addEventListener('click',()=>navigate('login'));
$('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus({preventScroll:true});main.scrollIntoView({block:'start'});});

async function loadEntries(){
 const container=$('#entries');if(!container||!client||!currentUser)return;
 const userId=currentUser.id, epoch=dataEpoch, filter=historyDate;
 container.innerHTML='<p class="loading-text" role="status">기록을 불러오고 있어요…</p>';
 try{
  let query=client.from('prayer_entries').select('id,title,prayer,gratitude,entry_date,created_at').eq('user_id',userId).order('entry_date',{ascending:false}).order('created_at',{ascending:false}).limit(100);
  if(filter)query=query.eq('entry_date',filter);
  const {data,error}=await query;if(error)throw error;
  if(epoch!==dataEpoch||currentUser?.id!==userId||!container.isConnected||historyDate!==filter)return;
  container.innerHTML=data?.length?data.map(e=>`<article class="entry-card"><div class="entry-header"><time datetime="${esc(e.entry_date)}">${esc(e.entry_date.replaceAll('-','. '))}</time><button class="icon-button" data-action="delete-entry" data-id="${esc(e.id)}" aria-label="${esc(e.title)} 기록 삭제">${icon('trash')}</button></div><h3>${esc(e.title)}</h3><details><summary>기도와 감사 펼쳐 보기</summary>${e.prayer?`<h4>나의 기도</h4><p>${esc(e.prayer)}</p>`:''}${e.gratitude?`<h4>오늘의 감사</h4><p>${esc(e.gratitude)}</p>`:''}</details></article>`).join('')+(data.length===100?'<p class="small">최근 100개 기록을 표시해요. 날짜를 선택하면 이전 기록을 찾을 수 있어요.</p>':''):`<div class="empty-state"><span class="mood-icon green">${icon('pen')}</span><h3>${filter?'이 날짜의 기록이 없어요':'첫 마음을 남겨 보세요'}</h3><p>${filter?'다른 날짜를 고르거나 전체 보기를 눌러 주세요.':'짧은 기도 하나, 감사 한 줄이면 충분해요.'}</p></div>`;
 }catch(error){if(epoch===dataEpoch&&container.isConnected)container.innerHTML=`<div class="notice" role="alert">${esc(friendlyError(error))}<br><button class="btn btn-quiet" data-action="refresh-entries">다시 불러오기</button></div>`;}
}

async function loadFavorites(){
 if(!client||!currentUser)return;
 const userId=currentUser.id,epoch=dataEpoch;
 try{const {data,error}=await client.from('favorites').select('verse_id').eq('user_id',userId);if(error)throw error;if(epoch!==dataEpoch||currentUser?.id!==userId)return;favoriteIds=new Set((data||[]).map(x=>x.verse_id));favoriteError='';}
 catch(error){if(epoch!==dataEpoch)return;favoriteError=friendlyError(error);}
 if(epoch!==dataEpoch)return;favoriteReady=true;
 if(route().page==='favorites'&&$('#favorites-list'))$('#favorites-list').innerHTML=favoriteCards();
 if(route().page==='word')updateFavoriteButton();
}
function updateFavoriteButton(){const b=$('[data-action="favorite"]');if(!b)return;const saved=favoriteIds.has(b.dataset.id);b.setAttribute('aria-pressed',String(saved));b.disabled=busyFavorite;const label=b.querySelector('span');if(label)label.textContent=saved?'저장한 말씀':'말씀 즐겨찾기';}
async function toggleFavorite(id){
 if(!moods.some(m=>m.id===id)||busyFavorite)return;
 if(!authReady){notify('로그인 상태를 확인하고 있어요. 잠시 후 다시 눌러 주세요.');return;}
 if(!currentUser){pendingFavorite=id;showModal('마음에 닿은 말씀, 간직해요',`<p>즐겨찾기는 로그인한 계정에 저장해요.<br>로그인한 뒤 이 말씀을 저장할 수 있습니다.</p><button class="btn btn-primary" data-action="login">로그인하기 ${icon('arrow')}</button>`);return;}
 busyFavorite=true;updateFavoriteButton();document.querySelectorAll('[data-action="favorite"]').forEach(b=>b.disabled=true);
 const userId=currentUser.id,epoch=dataEpoch;
 try{
  if(!favoriteReady){await loadFavorites();if(favoriteError)throw new Error(favoriteError);}
  if(epoch!==dataEpoch||currentUser?.id!==userId)return;
  const removing=favoriteIds.has(id);
  const {error}=removing?await client.from('favorites').delete().eq('user_id',userId).eq('verse_id',id):await client.from('favorites').insert({user_id:userId,verse_id:id});
  if(error&&error.code!=='23505')throw error;
  if(epoch!==dataEpoch||currentUser?.id!==userId)return;
  if(removing)favoriteIds.delete(id);else favoriteIds.add(id);
  notify(removing?'즐겨찾기에서 꺼냈어요. 언제든 다시 저장해 주세요.':'말씀을 저장했어요. 기도 일기의 ‘저장한 말씀’에서 만나요.');
 }catch(error){if(epoch===dataEpoch)notify(favoriteError||friendlyError(error));}
 finally{busyFavorite=false;if(route().page==='word')updateFavoriteButton();if(route().page==='favorites'&&$('#favorites-list'))$('#favorites-list').innerHTML=favoriteCards();}
}

document.addEventListener('input',e=>{if(e.target.closest('#diary-form')&&e.target.name)draft[e.target.name]=e.target.value;});
document.addEventListener('change',e=>{if(e.target.id==='history-date'){historyDate=e.target.value;loadEntries();}});
document.addEventListener('submit',async event=>{
 if(event.target.id==='diary-form'){event.preventDefault();await saveEntry(event.target);}
 if(event.target.id==='auth-form'){event.preventDefault();await submitAuth(event.target);}
});

async function saveEntry(form){
 const button=form.querySelector('[type="submit"]'),message=$('#diary-message');if(button.disabled||savingEntry)return;
 if(!client||!currentUser){notify('다시 로그인한 뒤 기록을 남겨 주세요.');return;}
 let entry;try{entry=validateEntry(Object.fromEntries(new FormData(form)));}catch(error){message.className='form-message error';message.textContent=error.message;return;}
 const userId=currentUser.id,epoch=dataEpoch;
 savingEntry=true;button.disabled=true;message.className='form-message';message.textContent='오늘의 마음을 저장하고 있어요…';
 try{const {error}=await client.from('prayer_entries').insert({...entry,user_id:userId});if(error)throw error;if(epoch!==dataEpoch||currentUser?.id!==userId)return;
  draft={entry_date:todayLocal(),title:'',prayer:'',gratitude:''};historyDate='';
  if(form.isConnected){form.reset();form.elements.entry_date.value=draft.entry_date;message.className='form-message success';message.textContent='기록을 소중히 저장했어요.';const filter=$('#history-date');if(filter)filter.value='';loadEntries();}
  notify('오늘의 마음을 저장했어요.');
 }catch(error){if(epoch===dataEpoch&&message.isConnected){message.className='form-message error';message.textContent=friendlyError(error);}}
 finally{savingEntry=false;if(button.isConnected)button.disabled=false;}
}
function askDelete(id){if(!currentUser||!/^[0-9a-f-]{36}$/i.test(id))return;showModal('이 기록을 지울까요?',`<p>기도와 감사 기록이 함께 삭제됩니다. 삭제한 기록은 앱에서 복원할 수 없어요.</p><div class="modal-actions"><button class="btn btn-outline" data-action="cancel-modal">기록 남겨 두기</button><button class="btn btn-danger" data-action="confirm-delete" data-id="${esc(id)}">삭제하기</button></div>`);}
async function deleteEntry(id,button){if(!currentUser||!client)return;const userId=currentUser.id,epoch=dataEpoch;button.disabled=true;try{const {data,error}=await client.from('prayer_entries').delete().eq('user_id',userId).eq('id',id).select('id');if(error)throw error;if(epoch!==dataEpoch)return;closeModal();if(data?.length)notify('기록을 삭제했어요.');else notify('이미 삭제되었거나 찾을 수 없는 기록이에요.');loadEntries();}catch(error){if(epoch===dataEpoch)notify(friendlyError(error));}finally{if(button.isConnected)button.disabled=false;}}

async function submitAuth(form){
 if(!client)return;const button=form.querySelector('[type="submit"]'),message=$('#auth-message');if(button.disabled)return;
 const values=Object.fromEntries(new FormData(form)),email=String(values.email||'').trim(),password=String(values.password||'');
 const mode=authMode,isRecovery=recoveryMode;
 if((mode==='signup'||isRecovery)&&password!==values.confirm){message.className='form-message error';message.textContent='두 비밀번호가 같은지 확인해 주세요.';return;}
 button.disabled=true;message.className='form-message';message.textContent='잠시만 기다려 주세요…';
 const redirect=`${location.origin}${location.pathname}`;
 try{
  let result;
  if(isRecovery)result=await client.auth.updateUser({password});
  else if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect}});
  else if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect});
  else result=await client.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;
  if(isRecovery){recoveryMode=false;form.reset();notify('새 비밀번호를 저장했어요.');navigate('diary');return;}
  if(mode==='login'||(mode==='signup'&&result.data.session)){
   applyUser(result.data.user);notify('반가워요. 오늘도 함께 걸어요.');const saved=pendingFavorite;pendingFavorite=null;navigate(saved?`word/${saved}`:'diary');if(saved)notify('로그인했어요. ‘말씀 즐겨찾기’를 눌러 저장해 주세요.');return;
  }
  if(message.isConnected){message.className='form-message success';message.textContent=mode==='signup'?'확인이 필요한 계정이면 메일을 보내 드렸어요. 받은 편지함과 스팸함을 확인한 뒤 로그인해 주세요.':'가입된 주소라면 재설정 링크를 보내 드렸어요. 받은 편지함과 스팸함을 확인해 주세요.';form.reset();}
 }catch(error){if(message.isConnected){message.className='form-message error';message.textContent=friendlyError(error);}}
 finally{if(button.isConnected)button.disabled=false;}
}
async function resendEmail(button){if(!client)return;const form=$('#auth-form'),email=form?.elements.email?.value.trim();if(!email||!form.elements.email.checkValidity()){form?.elements.email?.reportValidity();notify('먼저 가입한 이메일을 입력해 주세요.');return;}button.disabled=true;try{const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:`${location.origin}${location.pathname}`}});if(error)throw error;notify('확인이 필요한 계정이면 확인 메일을 보내 드렸어요.');}catch(error){notify(friendlyError(error));}finally{if(button.isConnected)button.disabled=false;}}

function applyUser(user){
 const changed=(currentUser?.id||null)!==(user?.id||null);currentUser=user||null;authReady=true;
 if(changed){dataEpoch++;favoriteIds=new Set();favoriteReady=false;favoriteError='';busyFavorite=false;historyDate='';draft={entry_date:todayLocal(),title:'',prayer:'',gratitude:''};if(modal.open)closeModal();}
 updateNav(route().page);
 if(changed){if(['diary','favorites','login','word'].includes(route().page))render();if(currentUser)loadFavorites();}
}
async function logout(button){if(!client)return;button.disabled=true;try{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;applyUser(null);recoveryMode=false;pendingFavorite=null;notify('로그아웃했어요. 다음에 또 만나요.');navigate('home');}catch(error){notify(friendlyError(error));}finally{if(button.isConnected)button.disabled=false;}}

function shareContent(id){
 const mood=moods.find(m=>m.id===id);if(!mood)return null;
 const url=`${location.origin}${location.pathname}#word/${id}`;
 return {url,text:`${mood.text}\n— ${mood.reference}\n${bibleEdition}\n${sourceUrl(mood)}\n\n오늘도, 사랑받는 당신\n${url}`};
}
function openShare(id){
 const content=shareContent(id);if(!content)return;
 showModal('말씀 나누기',`<p>마음에 닿은 말씀을 소중한 사람에게 전해 보세요.</p><label for="share-link">공유할 링크</label><input id="share-link" type="text" readonly value="${esc(content.url)}"><label for="share-text">말씀과 출처</label><textarea id="share-text" readonly rows="6">${esc(content.text)}</textarea><div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn btn-primary" data-action="copy-share" data-id="${id}" data-kind="link">링크 복사</button><button class="btn btn-outline" data-action="copy-share" data-id="${id}" data-kind="verse">말씀과 링크 복사</button></div><p id="share-message" class="form-message" role="status" aria-live="polite"></p>`);
}
async function copyShare(id,kind,button){
 const content=shareContent(id),message=$('#share-message');if(!content||!message)return;
 button.disabled=true;
 try{
  await navigator.clipboard.writeText(kind==='link'?content.url:content.text);
  if(message.isConnected){message.className='form-message success';message.textContent=kind==='link'?'링크를 복사했어요. 원하는 곳에 붙여넣어 주세요.':'말씀과 출처, 링크를 함께 복사했어요.';}
 }catch{
  if(message.isConnected){const field=$(kind==='link'?'#share-link':'#share-text');field?.focus();field?.select();message.className='form-message';message.textContent='선택된 내용을 직접 복사해 주세요. 컴퓨터에서는 Ctrl+C를 누르면 됩니다.';}
 }finally{if(button.isConnected)button.disabled=false;}
}

document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action,id=button.dataset.id;
 if(action==='mood')navigate(`word/${id}`);
 if(action==='day'){navigate(`jesus/${id}`);requestAnimationFrame(()=>$('#journey-reading')?.scrollIntoView({behavior:'smooth',block:'start'}));}
 if(action==='favorite')await toggleFavorite(id);
 if(action==='diary-tab')navigate(id);
 if(action==='login'){if(modal.open)closeModal();authMode='login';navigate('login');}
 if(action==='auth-mode'){authMode=id;render();}
 if(action==='password'){const field=$('#auth-password'),show=field.type==='password';field.type=show?'text':'password';button.textContent=show?'숨기기':'보기';button.setAttribute('aria-label',show?'비밀번호 숨기기':'비밀번호 보기');button.setAttribute('aria-pressed',String(show));}
 if(action==='logout')await logout(button);
 if(action==='resend')await resendEmail(button);
 if(action==='refresh-entries')loadEntries();
 if(action==='refresh-favorites'){favoriteReady=false;await loadFavorites();}
 if(action==='clear-filter'){historyDate='';if($('#history-date'))$('#history-date').value='';loadEntries();}
 if(action==='delete-entry')askDelete(id);
 if(action==='confirm-delete')await deleteEntry(id,button);
 if(action==='cancel-modal')closeModal();
 if(action==='share')openShare(id);
 if(action==='copy-share')await copyShare(id,button.dataset.kind,button);
 if(action==='sources')showSources();
 if(action==='privacy')showPrivacy();
 if(action==='help')showHelp();
});

function showSources(){showModal('말씀을 소중히 다루는 약속',`<p>성경 인용은 <a href="https://ebible.org/bible/details.php?id=kor" target="_blank" rel="noopener noreferrer">eBible.org 한국어 성경 배포본(1910 표기)</a>을 사용합니다. 배포처에서 <a href="https://ebible.org/kor/copyright.htm" target="_blank" rel="noopener noreferrer">Public Domain</a>으로 명시한 본문이며, 인용문을 임의로 바꾸지 않았습니다. 이 판본에는 오래된 표현이 포함되어 있어요.</p><p>‘여호와’는 성경에서 하나님의 이름을 나타내는 표현입니다. ‘통회’는 잘못을 깊이 뉘우침을, ‘평강’은 평안을 뜻해요.</p><p>쉬운 해설, 묵상 질문, 기도와 실천은 앱을 위해 편집한 글로 성경 번역문이 아닙니다. 문맥 이해를 위해 <a href="https://bibleproject.com/guides/book-of-psalms/" target="_blank" rel="noopener noreferrer">BibleProject 성경 개관</a>과 각 장의 본문을 참고했습니다. 특정 해설 기관의 검수나 보증을 받은 앱은 아니며, 해석을 더 알아보고 싶다면 신뢰하는 목회자와 나누어 보세요.</p><p>이 앱은 AI를 통해 하나님의 직접적인 음성이나 개인을 향한 예언을 제공하지 않습니다.</p><p class="small">사진: <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a>의 자연 사진. 본문·라이선스 검토일: 2026-11-05.</p>`);}
function showPrivacy(){showModal('당신의 기록을 위한 안내',`<p>이메일과 인증 정보는 Supabase Auth로 관리합니다. 기도 제목·감사 기록·기록 날짜와 즐겨찾기는 Supabase 데이터베이스에 저장합니다. 기도 일기는 신앙이나 건강 등 민감한 내용을 포함할 수 있으니, 저장하고 싶은 범위만 적어 주세요.</p><p>앱에서는 로그인한 본인의 기록만 볼 수 있도록 사용자별 접근 정책(RLS)을 사용합니다. 본문에 대한 종단 간 암호화는 제공하지 않으며, 데이터베이스 운영자는 관리 권한으로 데이터에 접근할 수 있습니다.</p><p>로그인 유지를 위한 세션 정보는 이 브라우저의 로컬 저장소에 보관합니다. 기도 일기의 본문과 감사 내용은 로컬 저장소에 따로 보관하지 않습니다. 저장하지 않은 글은 현재 화면을 떠나도 이 탭의 메모리에 잠시 남지만, 새로고침·로그아웃·계정 변경 시 사라져요.</p><p>개별 기록과 즐겨찾기는 앱에서 삭제할 수 있어요. 계정 전체 삭제는 현재 앱에서 제공하지 않으므로 서비스 운영자에게 요청해 주세요. 백업 보존 기간은 Supabase 프로젝트의 운영 설정에 따릅니다.</p><p>화면 글꼴은 Google Fonts, 로그인 라이브러리는 jsDelivr에서 불러오므로 접속 시 해당 서비스에 네트워크 요청이 전송됩니다. 이 버전에는 광고·방문 분석 도구를 넣지 않았어요.</p><p class="small">공용 기기에서는 이용 후 꼭 로그아웃해 주세요.</p>`);}
function showHelp(){showModal('혼자 감당하지 않아도 괜찮아요',`<p>고통이 크다는 것은 당신의 잘못이나 믿음이 부족하다는 뜻이 아니에요. 기도하면서도 전문적인 상담과 치료, 사람의 도움을 함께 받을 수 있어요.</p><p>지금 자신이나 다른 사람의 안전이 위험하다면, 혼자 있지 말고 가까운 사람에게 현재 상황을 알려 주세요. 가까운 응급실이나 현지 긴급 구조 서비스에 즉시 도움을 요청해 주세요.</p><p>당장 위험하지 않더라도 괴로움이 이어지거나 수면·식사·일상에 어려움이 생기면 정신건강 전문가 또는 지역 정신건강복지센터에 연락해 보세요. 신뢰하는 가족·친구·목회자와 함께 도움을 찾아도 좋습니다.</p><p class="small">이 앱은 응급 지원·상담·의료 서비스를 제공하지 않으며, 기록을 실시간으로 확인하는 사람은 없습니다.</p>`);}

async function initialize(){
 const config=window.APP_CONFIG;
 if(!isPublicConfig(config)){authReady=true;authFailure='로그인 서비스의 공개 연결 설정을 확인해 주세요.';render();return;}
 if(!window.supabase?.createClient){authReady=true;authFailure='로그인 서비스를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';render();return;}
 try{
  client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  // auth callbacks must stay synchronous; network calls run outside Supabase's auth lock.
  let authEventVersion=0;
  client.auth.onAuthStateChange((event,session)=>{authEventVersion++;setTimeout(()=>{
   if(event==='PASSWORD_RECOVERY'){recoveryMode=true;applyUser(session?.user);navigate('login');render();}
   else {if(event==='SIGNED_OUT'){recoveryMode=false;pendingFavorite=null;}applyUser(session?.user);}
  },0);});
  const version=authEventVersion;const {data,error}=await client.auth.getSession();if(error)throw error;
  if(authEventVersion===version)applyUser(data.session?.user);
  authReady=true;if(['diary','favorites','login'].includes(route().page))render();
  if(location.hash.includes('error=')){
   history.replaceState(null,'',`${location.pathname}${location.search}#login`);notify('확인 링크가 만료되었거나 유효하지 않아요. 메일을 다시 받아 주세요.');render();
  }
 }catch(error){authReady=true;authFailure='로그인 서비스에 연결하지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';if(['diary','favorites','login'].includes(route().page))render();}
}
render();
if(document.readyState==='complete')initialize();else window.addEventListener('load',initialize,{once:true});
