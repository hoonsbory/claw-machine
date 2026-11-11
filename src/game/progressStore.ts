/** 뽑은 종류 기록을 두는 저장소 키. 저장 형식을 바꾸면 끝의 버전을 올린다. */
export const PROGRESS_KEY = 'claw-machine:won-kinds:v1';

/** 기록을 지우는 주소 쿼리 매개변수 이름 */
const RESET_PARAM = 'reset';

/** 브라우저 저장소에서 쓰는 부분만 떼어 낸 모양. 테스트에서는 메모리 저장소를 넣는다. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 저장된 값을 배열로 읽는다. 저장소가 막혔거나, 값이 없거나, JSON이 깨졌거나, 배열이 아니면 빈 배열이다. */
function readStoredArray(storage: KeyValueStorage): unknown[] {
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** 뽑은 종류 기록을 읽는다. 카탈로그에 없는 id와 문자열이 아닌 값은 버린다. */
export function loadWonKinds(storage: KeyValueStorage, validKindIds: readonly string[]): Set<string> {
  const validIds = new Set(validKindIds);
  const storedIds = readStoredArray(storage).filter((value): value is string => typeof value === 'string' && validIds.has(value));
  return new Set(storedIds);
}

/** 뽑은 종류 기록을 종류 id 문자열 배열의 JSON으로 저장한다. */
export function saveWonKinds(storage: KeyValueStorage, wonKindIds: ReadonlySet<string>): void {
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify([...wonKindIds]));
  } catch {
    // 저장소가 막혔거나 가득 차도 게임은 계속한다. 이번 기록만 남지 않는다.
  }
}

/**
 * 주소 쿼리에 reset 매개변수가 있으면(`?reset`, `?reset=1`, `?debug&reset`) 기록을 지우고 true 를 돌려준다.
 * 이름이 정확히 같아야 한다(`?preset=1`, `?resetx` 는 아니다). 저장소가 막혀 지우지 못해도 true 다.
 */
export function consumeResetFlag(search: string, storage: KeyValueStorage): boolean {
  const hasResetFlag = new URLSearchParams(search).has(RESET_PARAM);
  if (!hasResetFlag) return false;

  try {
    storage.removeItem(PROGRESS_KEY);
  } catch {
    // 저장소가 막혀 있으면 읽기도 막혀 어차피 빈 기록으로 시작한다.
  }
  return true;
}
