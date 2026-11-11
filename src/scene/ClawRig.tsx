import type { ReactElement } from 'react';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import type { TuningOverrides } from '../config/runtimeTuning';
import { createInstances } from '../game/collection';
import { getDollMetrics } from '../game/dollGeometry';
import type { ClawEvent, DollKind } from '../game/types';
import type { MoveInput } from '../input/useMoveInput';
import type { GameSession } from '../session/useGameSession';
import { Claw } from './Claw';
import { useDollHandles } from './dollHandles';
import { useClawLoop } from './useClawLoop';

export interface ClawRigProps {
  input: MoveInput;
  session: GameSession;
  /** 집게 상태 흐름이 알리는 일(효과음·진동) */
  onEvent: (event: ClawEvent) => void;
  /** 조정 패널에서 바꾼 집기 수치. 다음 시도부터 적용된다. */
  overrides: TuningOverrides;
  /** 연속 실패 수가 바뀔 때만 불린다(조정 패널 표시용) */
  onFailStreakChange: (failStreak: number) => void;
}

/** 물리 세계 안(GameCanvas 의 children)에서 인형 손잡이를 꺼내 집게 루프를 돌리고 집게를 그린다 */
export function ClawRig({ input, session, onEvent, overrides, onFailStreakChange }: ClawRigProps): ReactElement {
  const dolls = useDollHandles();
  const view = useClawLoop({ input, session, dolls, kindOf, onEvent, overrides, onFailStreakChange });
  return <Claw view={view} maxCoreRadius={MAX_CORE_RADIUS} showGuide />;
}

/** 기계에 들어갈 수 있는 모든 인형 id → 종류. 뽑은 기록과 상관없이 정해져 있어 언제 물어도 같은 답이다. */
const KIND_BY_DOLL_ID = new Map(
  DOLL_KINDS.flatMap((kind): [string, DollKind][] =>
    createInstances([kind], GAME_CONFIG.dolls.perKind, new Set()).map((instance): [string, DollKind] => [instance.id, kind]),
  ),
);

/** 집게 손가락 크기를 맞출 가장 큰 인형 몸통 반지름 */
const MAX_CORE_RADIUS = Math.max(...DOLL_KINDS.map((kind): number => getDollMetrics(kind, GAME_CONFIG).coreRadius));

/** 카탈로그로 만들 수 없는 id 는 코드 실수이므로 바로 던진다 */
function kindOf(dollId: string): DollKind {
  const kind = KIND_BY_DOLL_ID.get(dollId);
  if (kind === undefined) throw new Error(`모르는 인형 id: ${dollId}`);
  return kind;
}
