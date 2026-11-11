import { describe, expect, it } from 'vitest';
import {
  consumeResetFlag,
  loadUnseenKinds,
  loadWonKinds,
  PROGRESS_KEY,
  removeResetFlag,
  saveUnseenKinds,
  saveWonKinds,
  UNSEEN_KEY,
} from './progressStore';
import { TEST_DOLL_KINDS } from './testFixtures';
import { memoryStorage, throwingStorage } from './testHelpers';

const ids = TEST_DOLL_KINDS.map((k) => k.id);

it('저장한 것을 그대로 읽는다', () => {
  const s = memoryStorage();
  saveWonKinds(s, new Set(['bear', 'frog']));
  expect(loadWonKinds(s, ids)).toEqual(new Set(['bear', 'frog']));
});
it('깨진 값·배열이 아닌 값·모르는 id는 버린다 (Review Focus 1)', () => {
  expect(loadWonKinds(memoryStorage({ [PROGRESS_KEY]: '{oops' }), ids)).toEqual(new Set());
  expect(loadWonKinds(memoryStorage({ [PROGRESS_KEY]: '"bear"' }), ids)).toEqual(new Set());
  expect(loadWonKinds(memoryStorage({ [PROGRESS_KEY]: '["bear","dragon",3]' }), ids)).toEqual(new Set(['bear']));
});
it('저장소가 막혀 있어도 오류 없이 빈 기록으로 동작한다 (Review Focus 1)', () => {
  const s = throwingStorage();
  expect(loadWonKinds(s, ids)).toEqual(new Set());
  expect(() => saveWonKinds(s, new Set(['bear']))).not.toThrow();
  expect(() => consumeResetFlag('?reset', s)).not.toThrow();
});
it('?reset 이 있을 때만 기록을 지운다', () => {
  const s = memoryStorage({ [PROGRESS_KEY]: '["bear"]' });
  expect(consumeResetFlag('?debug', s)).toBe(false);
  expect(loadWonKinds(s, ids)).toEqual(new Set(['bear']));
  expect(consumeResetFlag('?debug&reset', s)).toBe(true);
  expect(loadWonKinds(s, ids)).toEqual(new Set());
});
it('?reset 과 ?reset=1 도 기록을 지운다', () => {
  for (const search of ['?reset', '?reset=1']) {
    const s = memoryStorage({ [PROGRESS_KEY]: '["bear"]' });
    expect(consumeResetFlag(search, s)).toBe(true);
    expect(loadWonKinds(s, ids)).toEqual(new Set());
  }
});
it('reset 은 이름이 정확히 같은 쿼리 매개변수만 인정한다', () => {
  for (const search of ['?preset=1', '?resetx', '?debug=reset', '']) {
    const s = memoryStorage({ [PROGRESS_KEY]: '["bear"]' });
    expect(consumeResetFlag(search, s)).toBe(false);
    expect(loadWonKinds(s, ids)).toEqual(new Set(['bear']));
  }
});
it('주소 쿼리에서 reset 만 떼고 나머지는 적힌 그대로 둔다', () => {
  expect(removeResetFlag('?reset')).toBe('');
  expect(removeResetFlag('?reset=1')).toBe('');
  expect(removeResetFlag('?debug&reset')).toBe('?debug');
  expect(removeResetFlag('?reset&debug=1&x=a%20b')).toBe('?debug=1&x=a%20b');
  expect(removeResetFlag('?preset=1&resetx')).toBe('?preset=1&resetx');
  expect(removeResetFlag('')).toBe('');
});

describe('닫지 않은 축하 기록', () => {
  const won = new Set(['bear', 'cat', 'frog']);

  it('저장한 순서대로 읽는다', () => {
    const s = memoryStorage();
    saveUnseenKinds(s, ['frog', 'bear']);
    expect(loadUnseenKinds(s, won)).toEqual(['frog', 'bear']);
  });
  it('깨진 값·배열이 아닌 값·모르는 id·뽑은 기록에 없는 종류·겹친 id 는 버린다', () => {
    expect(loadUnseenKinds(memoryStorage({ [UNSEEN_KEY]: '{oops' }), won)).toEqual([]);
    expect(loadUnseenKinds(memoryStorage({ [UNSEEN_KEY]: '"bear"' }), won)).toEqual([]);
    expect(loadUnseenKinds(memoryStorage({ [UNSEEN_KEY]: '["cat","dragon",3,"bunny","cat","bear"]' }), won)).toEqual(['cat', 'bear']);
  });
  it('저장소가 막혀 있어도 오류 없이 빈 기록으로 동작한다', () => {
    const s = throwingStorage();
    expect(loadUnseenKinds(s, won)).toEqual([]);
    expect(() => saveUnseenKinds(s, ['bear'])).not.toThrow();
  });
  it('?reset 은 뽑은 기록과 함께 닫지 않은 축하 기록도 지운다', () => {
    const s = memoryStorage({ [PROGRESS_KEY]: '["bear"]', [UNSEEN_KEY]: '["bear"]' });
    expect(consumeResetFlag('?reset', s)).toBe(true);
    expect(loadWonKinds(s, ids)).toEqual(new Set());
    expect(loadUnseenKinds(s, won)).toEqual([]);
  });
});
