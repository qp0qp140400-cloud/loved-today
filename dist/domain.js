export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function todayLocal(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validateEntry(values) {
  const entry = {entry_date:String(values.entry_date || ''),title:String(values.title || '').trim(),prayer:String(values.prayer || '').trim(),gratitude:String(values.gratitude || '').trim()};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.entry_date)) throw new Error('기록 날짜를 선택해 주세요.');
  const date = new Date(`${entry.entry_date}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== entry.entry_date) throw new Error('올바른 날짜를 선택해 주세요.');
  if (!entry.title || [...entry.title].length > 100) throw new Error('제목은 1~100자로 적어 주세요.');
  if (!entry.prayer && !entry.gratitude) throw new Error('기도 제목이나 감사한 일 중 하나를 적어 주세요.');
  if ([...entry.prayer].length > 10000 || [...entry.gratitude].length > 10000) throw new Error('기도와 감사는 각각 10,000자 이내로 적어 주세요.');
  return entry;
}
export function isPublicConfig(config) {
  if (!config || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.supabasePublishableKey || '')) return false;
  try {const url=new URL(config.supabaseUrl);return url.protocol==='https:' && !url.username && !url.password && url.pathname==='/';} catch {return false;}
}
export function friendlyError(error) {
  const code=String(error?.code || ''), message=String(error?.message || '');
  if (/PGRST205|42P01/.test(code)) return '저장 공간을 준비하고 있어요. 관리자에게 데이터베이스 설정을 확인해 달라고 요청해 주세요.';
  if (/42501|PGRST301|PGRST303/.test(code)) return '접근 권한을 확인할 수 없어요. 다시 로그인한 뒤 시도해 주세요.';
  if (/23505/.test(code)) return '이미 저장된 항목이에요. 화면을 새로 열어 확인해 주세요.';
  if (/invalid_credentials|Invalid login credentials/i.test(code+' '+message)) return '이메일 또는 비밀번호를 확인해 주세요.';
  if (/email_not_confirmed|Email not confirmed/i.test(code+' '+message)) return '가입 메일의 확인 링크를 먼저 눌러 주세요.';
  if (/over_email_send_rate_limit|over_request_rate_limit|rate.limit/i.test(code+' '+message)) return '요청이 잠시 많아졌어요. 조금 뒤에 다시 시도해 주세요.';
  if (/user_already_exists|already registered/i.test(code+' '+message)) return '이미 가입한 이메일이라면 로그인해 주세요.';
  if (/weak_password|same_password/i.test(code+' '+message)) return '다른 비밀번호로 시도해 주세요. 8자 이상의 긴 비밀번호를 권해 드려요.';
  if (/validation_failed|email_address_invalid|email_address_not_authorized/i.test(code+' '+message)) return '사용할 수 있는 이메일 주소인지 확인해 주세요.';
  if (/fetch|network|timeout|load failed/i.test(message)) return '인터넷 연결을 확인한 뒤 다시 시도해 주세요. 작성한 내용은 이 화면에 남아 있어요.';
  return '요청을 마치지 못했어요. 잠시 후 다시 시도해 주세요.';
}
