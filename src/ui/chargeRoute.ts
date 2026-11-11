/**
 * 기회 충전 페이지의 주소 해시. 게임 화면에는 이 페이지로 가는 단추가 없고, 주소 끝에 붙여서만 연다.
 * 해시라서 하위 경로(예: `https://주소/secret-path/#charge`)에 올려도 서버 설정 없이 열린다.
 */
const CHARGE_HASH = '#charge';

/** 주소 해시(location.hash)가 정확히 `#charge` 일 때만 충전 페이지다. 대소문자와 뒤에 붙은 글자도 따진다. */
export function isChargeRoute(hash: string): boolean {
  return hash === CHARGE_HASH;
}

/** 주소에서 해시(`#` 포함)만 떼고 경로와 쿼리는 그대로 둔다 */
export function removeHash(href: string): string {
  const url = new URL(href);
  url.hash = '';
  return url.href;
}
