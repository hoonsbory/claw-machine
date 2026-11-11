import type { KeyValueStorage } from '../game/progressStore';

/**
 * 브라우저 localStorage 를 감싼 저장소. 사생활 보호 모드처럼 localStorage 에 손대기만 해도 예외가 나는 브라우저가 있어서
 * 모든 접근을 try 로 감싼다. 읽기에 실패하면 기록이 없는 것으로, 쓰기·지우기에 실패하면 아무 일도 없던 것으로 본다.
 */
export function createBrowserStorage(): KeyValueStorage {
  return {
    getItem(key: string): string | null {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // 막혔거나 가득 찼다. 이번 기록만 남지 않는다.
      }
    },
    removeItem(key: string): void {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // 막혀 있으면 읽기도 막혀 어차피 빈 기록으로 시작한다.
      }
    },
  };
}

/** 쓰기 확인에 잠깐 썼다가 바로 지우는 키와 값 */
const PROBE_KEY = 'claw-machine:probe';
const PROBE_VALUE = '1';

/**
 * 이 브라우저에서 뽑은 기록을 실제로 저장할 수 있는지 잠깐 써 보고 지워서 확인한다. 조정 패널(?debug)에 보여 준다.
 * 사생활 보호 탭처럼 쓰기는 되지만 탭을 닫으면 지워지는 경우는 알아내지 못한다.
 */
export function canWriteStorage(): boolean {
  try {
    window.localStorage.setItem(PROBE_KEY, PROBE_VALUE);
    const isReadBack = window.localStorage.getItem(PROBE_KEY) === PROBE_VALUE;
    window.localStorage.removeItem(PROBE_KEY);
    return isReadBack;
  } catch {
    return false;
  }
}
