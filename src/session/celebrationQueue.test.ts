import { describe, expect, it } from 'vitest';
import { applyWin, createInstances, type WinResult } from '../game/collection';
import { TEST_DOLL_KINDS } from '../game/testFixtures';
import {
  celebrationForWin,
  currentCelebration,
  dequeueCelebration,
  enqueueCelebration,
  restoreCelebrations,
  unseenKindIds,
  type CelebrationQueue,
  type WinCelebration,
} from './celebrationQueue';

const [bear, bunny, cat] = TEST_DOLL_KINDS;
const ALL_KIND_IDS = new Set(TEST_DOLL_KINDS.map((kind) => kind.id));

describe('축하 줄', () => {
  it('축하가 떠 있는 동안 또 뽑으면 뒤에 서고, 지금 축하는 같은 것 그대로다', () => {
    const first: WinCelebration = { kind: bear, isComplete: false };
    const second: WinCelebration = { kind: bunny, isComplete: false };

    const queue = enqueueCelebration(enqueueCelebration([], first), second);
    expect(currentCelebration(queue)).toBe(first);
    expect(queue).toEqual([first, second]);
  });

  it('닫을 때마다 뽑은 순서대로 다음 축하가 나오고, 다 닫으면 없다', () => {
    const first: WinCelebration = { kind: bear, isComplete: false };
    const second: WinCelebration = { kind: bunny, isComplete: false };
    let queue: CelebrationQueue = enqueueCelebration(enqueueCelebration([], first), second);

    queue = dequeueCelebration(queue);
    expect(currentCelebration(queue)).toBe(second);
    queue = dequeueCelebration(queue);
    expect(currentCelebration(queue)).toBeNull();
    expect(dequeueCelebration(queue)).toEqual([]);
  });

  it('줄을 바꿀 때 원래 줄은 그대로 둔다', () => {
    const original: CelebrationQueue = [{ kind: bear, isComplete: false }];
    enqueueCelebration(original, { kind: bunny, isComplete: false });
    dequeueCelebration(original);
    expect(original).toHaveLength(1);
  });

  it('5종을 채운 획득에만 큰 축하가 붙고, 줄을 거쳐도 그 인형에 붙어 있다', () => {
    const wonBefore = new Set(TEST_DOLL_KINDS.map((kind) => kind.id).filter((id) => id !== bunny.id && id !== cat.id));
    const instances = createInstances(TEST_DOLL_KINDS, 3, wonBefore);
    const bunnyWin = mustWin(applyWin(instances, wonBefore, `${bunny.id}-0`, TEST_DOLL_KINDS.length));
    const catWin = mustWin(applyWin(bunnyWin.remaining, bunnyWin.wonKindIds, `${cat.id}-0`, TEST_DOLL_KINDS.length));

    let queue = enqueueCelebration([], celebrationForWin(bunnyWin, TEST_DOLL_KINDS));
    queue = enqueueCelebration(queue, celebrationForWin(catWin, TEST_DOLL_KINDS));

    expect(currentCelebration(queue)).toEqual({ kind: bunny, isComplete: false });
    queue = dequeueCelebration(queue);
    expect(currentCelebration(queue)).toEqual({ kind: cat, isComplete: true });
  });

  it('카탈로그에 없는 종류는 코드 실수이므로 던진다', () => {
    expect(() => celebrationForWin({ wonKindId: 'dragon', isComplete: false }, TEST_DOLL_KINDS)).toThrow('dragon');
  });
});

describe('새로 열었을 때 닫지 않은 축하 되살리기', () => {
  it('줄에 선 순서대로 종류 id 를 저장할 목록으로 바꾼다', () => {
    const queue: CelebrationQueue = [
      { kind: cat, isComplete: false },
      { kind: bear, isComplete: false },
    ];
    expect(unseenKindIds(queue)).toEqual([cat.id, bear.id]);
    expect(unseenKindIds([])).toEqual([]);
  });

  it('저장된 순서대로 다시 줄 세우고, 다 뽑지 않았으면 모두 보통 축하다', () => {
    const won = new Set([bear.id, cat.id]);
    expect(restoreCelebrations([cat.id, bear.id], won, TEST_DOLL_KINDS)).toEqual([
      { kind: cat, isComplete: false },
      { kind: bear, isComplete: false },
    ]);
  });

  it('모든 종류를 뽑았으면 마지막 축하만 큰 축하다', () => {
    expect(restoreCelebrations([bunny.id, cat.id], ALL_KIND_IDS, TEST_DOLL_KINDS)).toEqual([
      { kind: bunny, isComplete: false },
      { kind: cat, isComplete: true },
    ]);
  });

  it('저장했다 되살린 줄은 원래 줄과 같다', () => {
    const queue: CelebrationQueue = [
      { kind: bunny, isComplete: false },
      { kind: cat, isComplete: true },
    ];
    expect(restoreCelebrations(unseenKindIds(queue), ALL_KIND_IDS, TEST_DOLL_KINDS)).toEqual(queue);
  });

  it('닫지 않은 축하가 없으면 빈 줄이다', () => {
    expect(restoreCelebrations([], ALL_KIND_IDS, TEST_DOLL_KINDS)).toEqual([]);
  });
});

function mustWin(result: WinResult | null): WinResult {
  if (result === null) throw new Error('획득이어야 한다');
  return result;
}
