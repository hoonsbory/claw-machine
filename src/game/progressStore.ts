import { TRIES_KEY } from './triesStore';

/** 뽑은 종류 기록을 두는 저장소 키. 저장 형식을 바꾸면 끝의 버전을 올린다. */
export const PROGRESS_KEY = 'claw-machine:won-kinds:v1';

/**
 * 뽑았지만 축하 화면을 아직 닫지 않은 종류를 줄 선 순서대로 두는 저장소 키.
 * 축하 화면이 떠 있는 동안 새로고침되거나 탭이 버려져도(사진을 찍으러 카메라 앱으로 갔다 오는 등) 어떤 인형을 뽑았는지 다시 보여 준다.
 */
export const UNSEEN_KEY = 'claw-machine:unseen:v1';

/** 기록을 지우는 주소 쿼리 매개변수 이름 */
const RESET_PARAM = 'reset';

/** 브라우저 저장소에서 쓰는 부분만 떼어 낸 모양. 테스트에서는 메모리 저장소를 넣는다. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** key 에 저장된 값을 배열로 읽는다. 저장소가 막혔거나, 값이 없거나, JSON이 깨졌거나, 배열이 아니면 빈 배열이다. */
function readStoredArray(storage: KeyValueStorage, key: string): unknown[] {
  try {
    const raw = storage.getItem(key);
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
  const storedIds = readStoredArray(storage, PROGRESS_KEY).filter((value): value is string => typeof value === 'string' && validIds.has(value));
  return new Set(storedIds);
}

/** 뽑은 종류 기록을 종류 id 문자열 배열의 JSON으로 저장한다. */
export function saveWonKinds(storage: KeyValueStorage, wonKindIds: ReadonlySet<string>): void {
  writeStoredArray(storage, PROGRESS_KEY, [...wonKindIds]);
}

/**
 * 축하 화면을 닫지 않은 종류를 저장한 순서대로 읽는다. 뽑은 기록과 같은 규칙으로 버린다:
 * 저장소가 막혔거나 JSON이 깨졌으면 빈 목록이고, 문자열이 아닌 값과 뽑은 기록(wonKindIds)에 없는 id 는 버린다.
 * 뽑은 기록은 카탈로그에 있는 id 만 남기므로 모르는 id 도 함께 빠진다. 같은 id 가 겹치면 처음 것만 남긴다.
 */
export function loadUnseenKinds(storage: KeyValueStorage, wonKindIds: ReadonlySet<string>): string[] {
  const storedIds = readStoredArray(storage, UNSEEN_KEY).filter((value): value is string => typeof value === 'string' && wonKindIds.has(value));
  return [...new Set(storedIds)];
}

/** 축하 화면을 닫지 않은 종류를 줄 선 순서대로 종류 id 문자열 배열의 JSON으로 저장한다. */
export function saveUnseenKinds(storage: KeyValueStorage, kindIds: readonly string[]): void {
  writeStoredArray(storage, UNSEEN_KEY, kindIds);
}

function writeStoredArray(storage: KeyValueStorage, key: string, values: readonly string[]): void {
  try {
    storage.setItem(key, JSON.stringify(values));
  } catch {
    // 저장소가 막혔거나 가득 차도 게임은 계속한다. 이번 기록만 남지 않는다.
  }
}

/**
 * 주소 쿼리에 reset 매개변수가 있으면(`?reset`, `?reset=1`, `?debug&reset`) 뽑은 기록, 닫지 않은 축하 기록, 남은 기회를 지우고 true 를 돌려준다.
 * 남은 기회를 지우면 처음 기회 수로 다시 시작한다.
 * 이름이 정확히 같아야 한다(`?preset=1`, `?resetx` 는 아니다). 저장소가 막혀 지우지 못해도 true 다.
 */
export function consumeResetFlag(search: string, storage: KeyValueStorage): boolean {
  const hasResetFlag = new URLSearchParams(search).has(RESET_PARAM);
  if (!hasResetFlag) return false;

  try {
    storage.removeItem(PROGRESS_KEY);
    storage.removeItem(UNSEEN_KEY);
    storage.removeItem(TRIES_KEY);
  } catch {
    // 저장소가 막혀 있으면 읽기도 막혀 어차피 빈 기록으로 시작한다.
  }
  return true;
}

/**
 * 주소 쿼리에서 consumeResetFlag 가 알아보는 reset 매개변수만 떼어 낸다. 새로고침 때 기록이 다시 지워지지 않게 한다.
 * 나머지 매개변수(`?debug` 등)는 적힌 글자 그대로 남긴다. 남는 것이 없으면 빈 문자열이다.
 */
export function removeResetFlag(search: string): string {
  const keptPairs = search
    .replace(/^\?/, '')
    .split('&')
    .filter((pair): boolean => pair !== '' && !new URLSearchParams(pair).has(RESET_PARAM));
  if (keptPairs.length === 0) return '';
  return `?${keptPairs.join('&')}`;
}
