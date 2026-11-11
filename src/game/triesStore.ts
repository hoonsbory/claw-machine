import { clamp } from './math';
import type { KeyValueStorage } from './progressStore';

/** 남은 기회를 두는 저장소 키. 값은 JSON 정수다. 저장 형식을 바꾸면 끝의 버전을 올린다. */
export const TRIES_KEY = 'claw-machine:tries:v1';

/** 처음 기회 수와 충전으로 늘릴 수 있는 최대(gameConfig.ts 의 tries) */
export interface TriesLimits {
  initial: number;
  max: number;
}

/**
 * 남은 기회를 읽는다. 저장소가 막혔거나, 값이 없거나, JSON이 깨졌거나, 0 이상의 정수가 아니면 처음 기회 수다.
 * 최대보다 크면 최대다. 0 은 그대로 0 이다.
 */
export function loadTries(storage: KeyValueStorage, limits: TriesLimits): number {
  try {
    const raw = storage.getItem(TRIES_KEY);
    if (raw === null) return limits.initial;
    const parsed: unknown = JSON.parse(raw);
    const isValidCount = typeof parsed === 'number' && Number.isInteger(parsed) && parsed >= 0;
    if (!isValidCount) return limits.initial;
    return Math.min(parsed, limits.max);
  } catch {
    return limits.initial;
  }
}

/**
 * 기회를 하나 쓴다. 저장된 값을 먼저 읽어 1 줄이고(0 아래로는 내려가지 않는다) 저장한 뒤 새 값을 돌려준다.
 * 저장소를 기준으로 하므로 다른 탭에서 충전한 값을 화면에 남은 옛 값으로 덮어쓰지 않는다.
 */
export function spendTry(storage: KeyValueStorage, limits: TriesLimits): number {
  return saveTries(storage, clamp(loadTries(storage, limits) - 1, 0, limits.max));
}

/** 기회를 amount 만큼 충전한다. 저장된 값을 먼저 읽어 더하고 최대에서 자른 뒤 저장하고 새 값을 돌려준다. */
export function addTries(storage: KeyValueStorage, limits: TriesLimits, amount: number): number {
  return saveTries(storage, clamp(loadTries(storage, limits) + amount, 0, limits.max));
}

/** 저장하고 저장한 값을 그대로 돌려준다 */
function saveTries(storage: KeyValueStorage, tries: number): number {
  try {
    storage.setItem(TRIES_KEY, JSON.stringify(tries));
  } catch {
    // 저장소가 막혔거나 가득 차도 게임은 계속한다. 이번 값만 남지 않는다.
  }
  return tries;
}
