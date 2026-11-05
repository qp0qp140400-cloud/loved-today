-- SQL Editor에서 선택적으로 실행하는 RLS 통합 검사입니다.
-- 두 명의 임시 인증 사용자와 기록을 만들고, 성공/실패와 관계없이
-- 마지막 ROLLBACK으로 테스트 데이터를 보존하지 않습니다.
-- 예외로 중단되면 반드시 ROLLBACK; 을 실행하세요.
begin;

insert into auth.users (id,aud,role,email,created_at,updated_at) values
 ('00000000-0000-4000-8000-0000000000a1','authenticated','authenticated','loved-today-rls-a@example.invalid',now(),now()),
 ('00000000-0000-4000-8000-0000000000b2','authenticated','authenticated','loved-today-rls-b@example.invalid',now(),now());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);

insert into public.prayer_entries (title,prayer,entry_date)
 values ('RLS A 테스트','테스트 기록입니다.','2026-11-05');
insert into public.favorites (verse_id) values ('hope');
do $$ begin
 if (select count(*) from public.prayer_entries) <> 1 then raise exception 'A: 본인 기록 읽기 실패'; end if;
 if (select count(*) from public.favorites) <> 1 then raise exception 'A: 본인 즐겨찾기 읽기 실패'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000b2',true);
do $$ declare affected integer; begin
 if (select count(*) from public.prayer_entries) <> 0 then raise exception 'B: 타인 기록 노출'; end if;
 if (select count(*) from public.favorites) <> 0 then raise exception 'B: 타인 즐겨찾기 노출'; end if;
 begin
  insert into public.prayer_entries (user_id,title,prayer)
   values ('00000000-0000-4000-8000-0000000000a1','위조','차단되어야 함');
  raise exception 'B: 타인 소유 기록 생성 가능';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.favorites (user_id,verse_id)
   values ('00000000-0000-4000-8000-0000000000a1','sadness');
  raise exception 'B: 타인 소유 즐겨찾기 생성 가능';
 exception when insufficient_privilege then null;
 end;
 delete from public.prayer_entries where user_id='00000000-0000-4000-8000-0000000000a1';
 get diagnostics affected=row_count;
 if affected <> 0 then raise exception 'B: 타인 기록 삭제 가능'; end if;
 delete from public.favorites where user_id='00000000-0000-4000-8000-0000000000a1';
 get diagnostics affected=row_count;
 if affected <> 0 then raise exception 'B: 타인 즐겨찾기 삭제 가능'; end if;
end $$;

insert into public.prayer_entries (title,gratitude) values ('RLS B 테스트','감사 테스트');
insert into public.favorites (verse_id) values ('gratitude');
do $$ declare affected integer; begin
 if (select count(*) from public.prayer_entries) <> 1 then raise exception 'B: 본인 기록 읽기 실패'; end if;
 if (select count(*) from public.favorites) <> 1 then raise exception 'B: 본인 즐겨찾기 읽기 실패'; end if;
 delete from public.prayer_entries where user_id=auth.uid();
 get diagnostics affected=row_count;
 if affected <> 1 then raise exception 'B: 본인 기록 삭제 실패'; end if;
 delete from public.favorites where user_id=auth.uid();
 get diagnostics affected=row_count;
 if affected <> 1 then raise exception 'B: 본인 즐겨찾기 삭제 실패'; end if;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform id from public.prayer_entries limit 1; raise exception '비회원 일기 읽기 가능';
 exception when insufficient_privilege then null; end;
 begin perform id from public.favorites limit 1; raise exception '비회원 즐겨찾기 읽기 가능';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'RLS 검사 통과: 본인 읽기·쓰기·삭제, 타인 차단, 비회원 차단. 테스트 데이터 롤백 완료.' as result;
