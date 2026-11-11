import { describe, expect, it } from 'vitest';
import { consumeResetFlag, type KeyValueStorage } from './progressStore';
import { TEST_GAME_CONFIG } from './testFixtures';
import { memoryStorage, throwingStorage } from './testHelpers';
import { addTries, loadTries, spendTry, TRIES_KEY } from './triesStore';

const limits = TEST_GAME_CONFIG.tries;

/** 남은 기회만 들어 있는 저장소 */
function storageWithTries(raw: string): KeyValueStorage {
  return memoryStorage({ [TRIES_KEY]: raw });
}

/** 읽기는 되지만 쓰기에서 예외를 던지는 저장소(가득 찬 저장소 흉내) */
function writeFailingStorage(raw: string): KeyValueStorage {
  const storage = storageWithTries(raw);
  return {
    ...storage,
    setItem: (): never => {
      throw new Error('저장소가 가득 찼다');
    },
  };
}

describe('남은 기회 읽기', () => {
  it('저장된 값이 없으면 처음 기회 수(5)다', () => {
    expect(loadTries(memoryStorage(), limits)).toBe(5);
  });
  it('0 은 그대로 0 이다(처음 값으로 돌아가지 않는다)', () => {
    expect(loadTries(storageWithTries('0'), limits)).toBe(0);
  });
  it('깨진 값·정수가 아닌 값·음수·null·배열은 처음 기회 수다', () => {
    for (const raw of ['abc', '"abc"', '-1', '2.5', 'null', '[]', '"3"']) {
      expect(loadTries(storageWithTries(raw), limits), raw).toBe(5);
    }
  });
  it('최대보다 크면 최대(99)다', () => {
    expect(loadTries(storageWithTries('150'), limits)).toBe(99);
  });
  it('저장소가 막혀 있으면 처음 기회 수이고, 쓰기가 막혀도 예외를 던지지 않는다', () => {
    const blocked = throwingStorage();
    expect(loadTries(blocked, limits)).toBe(5);
    expect(() => spendTry(blocked, limits)).not.toThrow();
    expect(() => addTries(blocked, limits, 1)).not.toThrow();
    expect(spendTry(writeFailingStorage('3'), limits)).toBe(2);
    expect(addTries(writeFailingStorage('3'), limits, 5)).toBe(8);
  });
});

describe('기회 쓰기', () => {
  it('하나 줄여 저장하고 새 값을 돌려준다', () => {
    const storage = storageWithTries('3');
    expect(spendTry(storage, limits)).toBe(2);
    expect(loadTries(storage, limits)).toBe(2);
  });
  it('0 에서는 0 보다 내려가지 않는다', () => {
    const storage = storageWithTries('0');
    expect(spendTry(storage, limits)).toBe(0);
    expect(loadTries(storage, limits)).toBe(0);
  });
  it('저장된 값을 먼저 읽어서 줄인다(다른 탭에서 바꾼 값을 덮어쓰지 않는다)', () => {
    const storage = storageWithTries('3');
    storage.setItem(TRIES_KEY, '7');
    expect(spendTry(storage, limits)).toBe(6);
  });
});

describe('기회 충전', () => {
  it('저장된 값에 더해 저장하고 새 값을 돌려준다', () => {
    const storage = storageWithTries('3');
    expect(addTries(storage, limits, 5)).toBe(8);
    expect(loadTries(storage, limits)).toBe(8);
  });
  it('최대(99)를 넘지 않는다', () => {
    const storage = storageWithTries('97');
    expect(addTries(storage, limits, 5)).toBe(99);
    expect(loadTries(storage, limits)).toBe(99);
  });
});

it('?reset 은 남은 기회도 지워 처음 기회 수로 돌아간다', () => {
  const storage = storageWithTries('0');
  expect(consumeResetFlag('?reset', storage)).toBe(true);
  expect(storage.getItem(TRIES_KEY)).toBeNull();
  expect(loadTries(storage, limits)).toBe(5);
});
