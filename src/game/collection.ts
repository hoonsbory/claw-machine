import type { DollKind } from './types';

/** 기계 안의 인형 하나. id 는 `${kindId}-${번호}` 이고 번호는 0부터 센다. */
export interface DollInstance {
  id: string;
  kindId: string;
}

/** 한 종류를 뽑은 결과. 넘겨받은 목록과 집합은 그대로 두고 새로 만든다. */
export interface WinResult {
  wonKindId: string;
  /** 뽑힌 인형을 포함한, 그 종류의 남은 인형 전부 */
  removedIds: string[];
  remaining: DollInstance[];
  wonKindIds: Set<string>;
  /** 모든 종류를 뽑았는지 */
  isComplete: boolean;
}

/** 이미 뽑은 종류를 빼고 종류마다 perKind 개씩 인형을 만든다. */
export function createInstances(kinds: readonly DollKind[], perKind: number, wonKindIds: ReadonlySet<string>): DollInstance[] {
  return kinds
    .filter((kind): boolean => !wonKindIds.has(kind.id))
    .flatMap((kind): DollInstance[] =>
      Array.from({ length: perKind }, (_, index): DollInstance => ({ id: `${kind.id}-${index}`, kindId: kind.id })),
    );
}

/** 배출구에 들어온 인형으로 그 종류를 획득한다. 모르는 인형이거나 이미 뽑은 종류면 null 이다. */
export function applyWin(
  instances: readonly DollInstance[],
  wonKindIds: ReadonlySet<string>,
  dollId: string,
  totalKinds: number,
): WinResult | null {
  const wonDoll = instances.find((instance): boolean => instance.id === dollId);
  if (wonDoll === undefined) return null;
  if (wonKindIds.has(wonDoll.kindId)) return null;

  const isWonKind = (instance: DollInstance): boolean => instance.kindId === wonDoll.kindId;
  const nextWonKindIds = new Set([...wonKindIds, wonDoll.kindId]);
  const isComplete = nextWonKindIds.size >= totalKinds;
  return {
    wonKindId: wonDoll.kindId,
    removedIds: instances.filter(isWonKind).map((instance): string => instance.id),
    remaining: instances.filter((instance): boolean => !isWonKind(instance)),
    wonKindIds: nextWonKindIds,
    isComplete,
  };
}
