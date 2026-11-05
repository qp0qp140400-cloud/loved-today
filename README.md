# 오늘도, 사랑받는 당신

말씀·묵상·기도로 쉬어가는 모바일 우선 기독교 웹앱입니다. 빌드 없는 HTML, CSS, JavaScript와 Supabase JS CDN으로 동작합니다.

## 실행

Node.js 20 이상에서 이 폴더를 열고 실행합니다. 별도 패키지 설치가 필요 없습니다.

```powershell
node scripts/serve.mjs
```

브라우저에서 http://127.0.0.1:4173 을 엽니다. HTML 파일을 직접 여는 `file://` 방식은 ES 모듈과 이메일 인증 콜백에 적합하지 않습니다.

## 구현된 기능

- 홈: 감정 선택 6종, 오늘의 말씀, 주요 화면 바로가기
- 마음별 말씀: 정확한 장절·판본·원문 링크, 문맥, 편집 해설, 질문, 기도, 실천, 공유와 즐겨찾기
- 예수님 알아가기: 생애·가르침·십자가·부활·복음·구원을 설명하는 7일 묵상
- 기도 일기: 날짜별 기도·감사 작성, 이전 기록 열람·날짜 검색·삭제
- 로그인: 이메일 회원가입, 확인 메일 재전송, 로그인, 로그아웃, 비밀번호 재설정
- 믿음의 성장: 성령의 아홉 열매와 작은 사랑 실천. 점수·출석 경쟁 없음

30일 묵상, AI 답변, 운영자용 계정 삭제 화면은 이번 버전에 포함하지 않았습니다.

## Supabase 설정

`dist/config.js`에 프로젝트 URL과 **공개용 publishable key**가 연결되어 있습니다. 이 두 값은 브라우저에 공개됩니다. 프로젝트를 바꾸면 `vercel.json`의 CSP `connect-src` 도메인도 함께 수정하세요.

1. Supabase SQL Editor에서 `supabase/schema.sql`을 실행합니다. 테이블과 RLS 정책을 한 트랜잭션으로 만듭니다.
2. Authentication → Providers에서 이메일 인증을 켭니다. 이메일 확인을 켜 두는 설정을 권장합니다.
3. Authentication → URL Configuration에서 Site URL을 실제 앱 주소로 설정하고, Redirect URLs에도 해당 주소를 추가합니다. 로컬 개발은 `http://127.0.0.1:4173`을 추가합니다. 코드에서 인증 완료와 재설정 리다이렉트는 현재 origin과 pathname을 사용합니다.
4. 새 사용자로 가입하여 받은 메일을 직접 확인합니다. 이메일 발송 제한, 수신자 제한, SMTP 운영 설정은 Supabase 프로젝트 설정에 따릅니다. 실제 사용자에게 제공할 때는 적절한 메일 발송 설정을 점검하세요.

현재 Sites 미리보기 주소: https://loved-today-hope-1105.workspace-642979.chatgpt.site

`service_role`, `sb_secret_`, 데이터베이스 비밀번호, AI API 비밀키를 프런트엔드에 넣으면 안 됩니다. 이 버전은 AI API를 호출하지 않습니다.

## 데이터와 접근 제한

- `prayer_entries`: `user_id`, 날짜, 제목, 기도, 감사, 생성 시각
- `favorites`: `user_id`, `verse_id`, 생성 시각. 사용자·말씀 조합은 중복 불가
- 두 테이블 모두 RLS 활성화 및 강제 적용
- `authenticated` 역할에 본인 행의 SELECT·INSERT·DELETE만 허용
- `anon` 역할에는 테이블 권한 없음. UPDATE 권한 없음
- 클라이언트도 사용자 ID 필터를 적용하되, 권한의 최종 판단은 서버의 RLS가 담당
- 로그아웃·계정 변경 시 화면의 개인 기록, 즐겨찾기, 메모리 초안을 초기화
- 지연 응답이 이전 계정의 데이터를 다시 표시하지 않도록 요청 시점의 계정과 세대를 확인
- 일기 본문은 로컬 저장소에 저장하지 않음. 세션 정보는 Supabase Auth가 저장
- 사용자의 텍스트는 HTML 이스케이프 후 표시

RLS는 사용자 간 접근 제한입니다. 종단 간 암호화가 아니며 프로젝트 관리자는 관리 권한으로 데이터에 접근할 수 있습니다. 앱의 개인정보 안내에도 이 점을 설명합니다. 배포 전 운영자 연락처, 개인정보 처리방침, 보존·백업 및 계정 삭제 절차를 서비스 운영에 맞게 확정하세요.

## 검증

```powershell
node --check dist/app.js
node --check dist/content.js
node --check dist/domain.js
node --test tests/domain.test.mjs
node scripts/verify-sources.mjs
```

마지막 명령은 인터넷 연결이 필요하며, 6종 인용문을 배포처 본문과 대조하고 묵상 본문 링크를 확인합니다. 입력 검증 테스트는 실제 없는 날짜, 빈 기록, 길이 제한, XSS 이스케이프, 공개키 설정, 오류 노출을 다룹니다.

`node scripts/verify-access.mjs`는 실제 Supabase의 비회원 읽기·쓰기 차단을 확인합니다. 성공 응답이 나면 테스트를 실패 처리하며, 정상 구성에서는 데이터가 만들어지지 않습니다.

실제 이메일 가입·확인, 두 계정 사이의 접근 차단과 로그인 후 CRUD는 별도 통합 검증이 필요합니다. `supabase/verify-rls.sql`은 테스트 사용자를 트랜잭션 안에서 만들어 본인/타인 접근을 검증하고 전부 롤백합니다. SQL Editor에서 실행할 수 있습니다.

## Vercel 배포

Vercel에 가져올 때 **Root Directory를 `loved-today`**(이 폴더가 저장소 루트라면 빈 값), Framework Preset을 Other, Output Directory를 `dist`로 지정합니다. 빌드·설치 과정 없이 정적 파일을 배포합니다. 동봉한 `vercel.json`이 출력 경로와 보안 헤더를 지정합니다.

Vercel 배포 주소가 정해지면 Supabase의 Site URL·Redirect URLs를 실제 Vercel 주소에 맞게 설정하세요. 해시 라우팅을 사용하므로 서버 rewrite가 필요하지 않습니다. 배포에는 `dist/`만 공개하며 SQL·테스트·설명서는 웹 루트에 포함되지 않습니다.

## 콘텐츠와 출처

- 성경: [eBible.org 한국어 성경](https://ebible.org/bible/details.php?id=kor), 배포처 판본 표기 1910. [Public Domain 안내](https://ebible.org/kor/copyright.htm). 인용문은 변경하지 않고 공백·줄바꿈만 화면에 맞춰 표시합니다. 오래된 표현은 쉬운 편집 해설로 보충합니다.
- 문맥 참고: BibleProject의 [시편](https://bibleproject.com/guides/book-of-psalms/), [빌립보서](https://bibleproject.com/guides/book-of-philippians/), [마태복음](https://bibleproject.com/guides/book-of-matthew/), [로마서](https://bibleproject.com/guides/book-of-romans/) 개관과 각 장의 성경 본문. 해설은 앱 편집 글이며 기관의 검수·보증을 받은 것으로 표시하지 않습니다.
- 사진: Unsplash 배포 이미지. 파일 원본은 `https://images.unsplash.com/photo-1470252649378-9c29740c9fa8` 및 `https://images.unsplash.com/photo-1441974231531-c6227db76b6e`. [Unsplash License](https://unsplash.com/license). 정적 자산으로 함께 배포하여 사진의 외부 요청을 없앴습니다.
- 글꼴: Google Fonts의 Gowun Batang·Noto Sans KR. 시스템 기본 글꼴 대체 지원
- 개인별 예언, 하나님의 음성을 가장한 AI 답변, 신앙 점수화는 제공하지 않습니다.
- 위기 안내는 전문적 도움과 가까운 사람의 지원을 권하며, 일기를 실시간으로 모니터링한다고 오인하지 않도록 설명합니다.

검토일: 2026-11-05
