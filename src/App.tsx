import { css, injectGlobal } from '@emotion/css';
import { useEffect, type ReactElement } from 'react';
import { DOLL_KINDS } from './config/dollCatalog';
import { GAME_CONFIG } from './config/gameConfig';
import { createInstances } from './game/collection';
import { getDollMetrics } from './game/dollGeometry';
import type { DollKind } from './game/types';
import { useMoveInput, type MoveInput } from './input/useMoveInput';
import { Claw } from './scene/Claw';
import { useDollHandles } from './scene/dollHandles';
import { GameCanvas } from './scene/GameCanvas';
import { useClawLoop } from './scene/useClawLoop';
import { createBrowserStorage } from './session/browserStorage';
import { useGameSession, type GameSession } from './session/useGameSession';
import { DropButton } from './ui/DropButton';
import { Joystick } from './ui/Joystick';

const STORAGE = createBrowserStorage();

function App(): ReactElement {
  const session = useGameSession(STORAGE);
  const input = useMoveInput();
  const { celebration, closeCelebration } = session;

  // 축하 화면은 아직 없다. 뽑은 기록과 사라짐은 그대로 두고 축하 상태만 바로 닫아 게임을 이어 간다.
  useEffect(() => {
    if (celebration !== null) closeCelebration();
  }, [celebration, closeCelebration]);

  return (
    <div className={screen}>
      <main className={frame}>
        <GameCanvas instances={session.instances} vanishingIds={session.vanishingIds} onVanished={session.handleVanished}>
          <ClawRig input={input} session={session} />
        </GameCanvas>
        <Joystick onMove={input.setStick} />
        <DropButton isDisabled={session.phase !== 'idle'} onPress={input.requestDrop} />
      </main>
    </div>
  );
}

export default App;

interface ClawRigProps {
  input: MoveInput;
  session: GameSession;
}

/** 물리 세계 안에서 인형 손잡이를 꺼내 집게 루프를 돌리고 집게를 그린다 */
function ClawRig({ input, session }: ClawRigProps): ReactElement {
  const dolls = useDollHandles();
  const view = useClawLoop({ input, session, dolls, kindOf, onEvent: ignoreClawEvent });
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

function ignoreClawEvent(): void {
  // 효과음과 진동은 아직 없다
}

injectGlobal(`
  body {
    margin: 0;
    touch-action: none;
    user-select: none;
    overflow: hidden;
  }
`);

const screen = css`
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100dvh;
  background: linear-gradient(#ffe3ee, #ffc4dc);
`;

/** 폰에서는 화면 전체, 넓은 화면에서는 가운데 9:16 세로 틀. 조작부는 이 틀 안에 겹쳐 놓는다. */
const frame = css`
  position: relative;
  width: 100%;
  max-width: calc(100dvh * 9 / 16);
  height: 100dvh;
  touch-action: none;
  user-select: none;
  overflow: hidden;
`;
