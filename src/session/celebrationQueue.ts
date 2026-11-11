import type { WinResult } from '../game/collection';
import type { DollKind } from '../game/types';

/** 획득 한 번의 축하. 5종을 다 채운 획득이면 isComplete 다. */
export interface WinCelebration {
  kind: DollKind;
  isComplete: boolean;
}

/** 뽑은 순서대로 줄 선 축하. 맨 앞이 지금 보여 줄 축하다. 하나도 버리지 않는다. */
export type CelebrationQueue = readonly WinCelebration[];

/** 획득 결과를 축하 하나로 바꾼다. 카탈로그에 없는 종류는 코드 실수이므로 바로 던진다. */
export function celebrationForWin(win: Pick<WinResult, 'wonKindId' | 'isComplete'>, kinds: readonly DollKind[]): WinCelebration {
  const kind = kinds.find((candidate): boolean => candidate.id === win.wonKindId);
  if (kind === undefined) throw new Error(`카탈로그에 없는 인형 종류: ${win.wonKindId}`);
  return { kind, isComplete: win.isComplete };
}

/** 줄 끝에 세운다. 지금 보여 주는 축하는 바뀌지 않는다. */
export function enqueueCelebration(queue: CelebrationQueue, celebration: WinCelebration): CelebrationQueue {
  return [...queue, celebration];
}

/** 지금 축하를 닫고 다음 축하를 맨 앞으로 올린다 */
export function dequeueCelebration(queue: CelebrationQueue): CelebrationQueue {
  return queue.slice(1);
}

/** 지금 보여 줄 축하. 줄이 비었으면 null 이다. */
export function currentCelebration(queue: CelebrationQueue): WinCelebration | null {
  return queue[0] ?? null;
}

/** 저장해 둘, 아직 닫지 않은 축하의 종류 id. 줄 선 순서 그대로다. */
export function unseenKindIds(queue: CelebrationQueue): string[] {
  return queue.map((celebration): string => celebration.kind.id);
}

/**
 * 새로 열었을 때 닫지 않은 축하를 저장된 순서대로 다시 줄 세운다. unseenIds 는 뽑은 기록에 있는 id 만 넘겨받는다.
 * 줄 맨 끝이 가장 나중에 뽑은 종류이므로, 모든 종류를 뽑았으면 그 마지막 축하만 큰 축하다.
 */
export function restoreCelebrations(
  unseenIds: readonly string[],
  wonKindIds: ReadonlySet<string>,
  kinds: readonly DollKind[],
): CelebrationQueue {
  const isAllWon = kinds.every((kind): boolean => wonKindIds.has(kind.id));
  const lastIndex = unseenIds.length - 1;
  return unseenIds.map(
    (wonKindId, index): WinCelebration => celebrationForWin({ wonKindId, isComplete: isAllWon && index === lastIndex }, kinds),
  );
}
