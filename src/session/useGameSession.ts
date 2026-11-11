import { useCallback, useRef, useState } from 'react';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import { applyWin, createInstances, type DollInstance } from '../game/collection';
import { loadWonKinds, saveWonKinds, type KeyValueStorage } from '../game/progressStore';
import type { ClawPhase } from '../game/types';
import {
  celebrationForWin,
  currentCelebration,
  dequeueCelebration,
  enqueueCelebration,
  type CelebrationQueue,
  type WinCelebration,
} from './celebrationQueue';

/** 한 판의 React 상태: 기계 안 인형, 사라지는 중인 인형, 뽑은 종류, 축하할 인형, 집게 단계 */
export interface GameSession {
  instances: readonly DollInstance[];
  vanishingIds: ReadonlySet<string>;
  wonKindIds: ReadonlySet<string>;
  /** 지금 보여 줄 축하. 축하 화면이 떠 있는 동안 다른 종류를 또 뽑으면 뒤에 줄 서고, 닫을 때마다 다음 것이 나온다. */
  celebration: WinCelebration | null;
  phase: ClawPhase;
  /** 획득이면 사라질 인형 id 목록, 아니면 null */
  reportChuteArrival(dollId: string): string[] | null;
  handleVanished(id: string): void;
  setPhase(phase: ClawPhase): void;
  /** 지금 축하를 닫고 줄 선 다음 축하로 넘어간다 */
  closeCelebration(): void;
}

/** 기계 안 인형과 뽑은 기록. 사라지는 중인 인형은 다 사라질 때까지 instances 에 남아 그려진다. */
interface Collection {
  instances: readonly DollInstance[];
  vanishingIds: ReadonlySet<string>;
  wonKindIds: ReadonlySet<string>;
}

/** 저장된 기록을 읽어 뽑은 종류를 뺀 인형으로 시작한다. 기록이 바뀌는 일은 모두 이 훅 안에서 일어난다. */
export function useGameSession(storage: KeyValueStorage): GameSession {
  const [collection, setCollection] = useState((): Collection => loadCollection(storage));
  // 물리 단계 안에서 같은 프레임에 여러 번 불려도 바로 앞 결과를 보도록 최신 값을 ref 에도 둔다.
  // 같은 종류 둘이 한꺼번에 배출구에 들어가도 획득은 한 번만 처리된다.
  const latest = useRef(collection);
  const [celebrations, setCelebrations] = useState<CelebrationQueue>([]);
  const [phase, setPhase] = useState<ClawPhase>('idle');

  const commit = useCallback((next: Collection): void => {
    latest.current = next;
    setCollection(next);
  }, []);

  const reportChuteArrival = useCallback(
    (dollId: string): string[] | null => {
      const current = latest.current;
      const result = applyWin(current.instances, current.wonKindIds, dollId, DOLL_KINDS.length);
      if (result === null) return null;

      commit({
        instances: current.instances,
        vanishingIds: new Set([...current.vanishingIds, ...result.removedIds]),
        wonKindIds: result.wonKindIds,
      });
      saveWonKinds(storage, result.wonKindIds);
      const celebration = celebrationForWin(result, DOLL_KINDS);
      setCelebrations((queue): CelebrationQueue => enqueueCelebration(queue, celebration));
      return result.removedIds;
    },
    [commit, storage],
  );

  const handleVanished = useCallback(
    (id: string): void => {
      const current = latest.current;
      if (!current.vanishingIds.has(id)) return;

      const vanishingIds = new Set(current.vanishingIds);
      vanishingIds.delete(id);
      commit({
        instances: current.instances.filter((instance): boolean => instance.id !== id),
        vanishingIds,
        wonKindIds: current.wonKindIds,
      });
    },
    [commit],
  );

  const closeCelebration = useCallback((): void => setCelebrations(dequeueCelebration), []);

  return {
    ...collection,
    celebration: currentCelebration(celebrations),
    phase,
    reportChuteArrival,
    handleVanished,
    setPhase,
    closeCelebration,
  };
}

const KIND_IDS = DOLL_KINDS.map((kind): string => kind.id);

function loadCollection(storage: KeyValueStorage): Collection {
  const wonKindIds = loadWonKinds(storage, KIND_IDS);
  return {
    instances: createInstances(DOLL_KINDS, GAME_CONFIG.dolls.perKind, wonKindIds),
    vanishingIds: new Set(),
    wonKindIds,
  };
}
