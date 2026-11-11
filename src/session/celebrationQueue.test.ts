import { describe, expect, it } from 'vitest';
import { DOLL_KINDS } from '../config/dollCatalog';
import { applyWin, createInstances, type WinResult } from '../game/collection';
import {
  celebrationForWin,
  currentCelebration,
  dequeueCelebration,
  enqueueCelebration,
  type CelebrationQueue,
  type WinCelebration,
} from './celebrationQueue';

const [bear, bunny, cat] = DOLL_KINDS;

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
    const wonBefore = new Set(DOLL_KINDS.map((kind) => kind.id).filter((id) => id !== bunny.id && id !== cat.id));
    const instances = createInstances(DOLL_KINDS, 3, wonBefore);
    const bunnyWin = mustWin(applyWin(instances, wonBefore, `${bunny.id}-0`, DOLL_KINDS.length));
    const catWin = mustWin(applyWin(bunnyWin.remaining, bunnyWin.wonKindIds, `${cat.id}-0`, DOLL_KINDS.length));

    let queue = enqueueCelebration([], celebrationForWin(bunnyWin, DOLL_KINDS));
    queue = enqueueCelebration(queue, celebrationForWin(catWin, DOLL_KINDS));

    expect(currentCelebration(queue)).toEqual({ kind: bunny, isComplete: false });
    queue = dequeueCelebration(queue);
    expect(currentCelebration(queue)).toEqual({ kind: cat, isComplete: true });
  });

  it('카탈로그에 없는 종류는 코드 실수이므로 던진다', () => {
    expect(() => celebrationForWin({ wonKindId: 'dragon', isComplete: false }, DOLL_KINDS)).toThrow('dragon');
  });
});

function mustWin(result: WinResult | null): WinResult {
  if (result === null) throw new Error('획득이어야 한다');
  return result;
}
