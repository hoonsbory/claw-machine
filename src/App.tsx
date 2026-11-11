import { css, injectGlobal } from '@emotion/css';
import { useEffect, useState, type ReactElement } from 'react';
import { createSfx, sfxForEvent, vibrate } from './audio/sfx';
import { isDebugMode, type TuningOverrides } from './config/runtimeTuning';
import type { ClawEvent } from './game/types';
import { useMoveInput } from './input/useMoveInput';
import { ClawRig } from './scene/ClawRig';
import { GameCanvas } from './scene/GameCanvas';
import { canWriteStorage, createBrowserStorage } from './session/browserStorage';
import { useGameSession } from './session/useGameSession';
import { DESIGN_TOKENS } from './theme/tokens';
import { Celebration } from './ui/Celebration';
import { DebugPanel } from './ui/DebugPanel';
import { DropButton } from './ui/DropButton';
import { Hud } from './ui/Hud';
import { Joystick } from './ui/Joystick';
import { OutOfTriesNotice } from './ui/OutOfTriesNotice';
import { RotateNotice } from './ui/RotateNotice';
import { SoundToggle } from './ui/SoundToggle';
import { SkyBackdrop } from './ui/backdrop/SkyBackdrop';
import { useIsTouchLandscape } from './ui/useIsTouchLandscape';

const STORAGE = createBrowserStorage();
const SFX = createSfx();
/**
 * 오디오를 켜 주는 사용자 입력. 터치는 손을 뗄 때(pointerup)에야 사용자 입력으로 쳐 주는 브라우저가 있어 둘 다 듣는다.
 * 첫 입력 뒤에도 계속 들어서, 앱 전환 등으로 멈춘 오디오(아이폰)를 다음 입력 때 다시 켠다.
 */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'keydown'] as const;
/** 주소에 ?debug 를 붙여 열었을 때만 조정 패널과 충돌 도형 선을 보여 준다 */
const IS_DEBUG_MODE = isDebugMode(window.location.search);
/** 조정 패널에 보여 줄, 이 기기에서 뽑은 기록을 저장할 수 있는지. 패널이 뜨는 ?debug 일 때만 써 보고 확인한다. */
const CAN_SAVE_PROGRESS = IS_DEBUG_MODE && canWriteStorage();

function App(): ReactElement {
  const session = useGameSession(STORAGE);
  const { celebration } = session;
  // 터치 기기를 가로로 눕히면 세로로 돌려 달라는 화면이 덮고, 그동안 입력은 게임에 전달하지 않는다
  const isTouchLandscape = useIsTouchLandscape();
  const input = useMoveInput({ isBlocked: celebration !== null || isTouchLandscape });
  // 음소거는 저장하지 않는다. 새로 열면 늘 소리가 켜져 있다.
  const [isMuted, setIsMuted] = useState(false);
  // 조정 패널 값은 저장하지 않는다. ?debug 가 없으면 빈 덮어쓰기 그대로라 gameConfig.ts 값으로 돈다.
  const [overrides, setOverrides] = useState<TuningOverrides>({});
  const [failStreak, setFailStreak] = useState(0);

  useEffect(() => {
    const unlock = (): void => SFX.unlock();
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock);
    return (): void => {
      for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock);
    };
  }, []);

  // 축하 화면이 뜰 때마다(줄 서 있던 다음 축하가 뜰 때도) 획득 소리를 내고 길게 떤다
  useEffect(() => {
    if (celebration === null) return;
    SFX.play(celebration.isComplete ? 'complete' : 'win');
    vibrate('win');
  }, [celebration]);

  const isIdle = session.phase === 'idle';
  // 마지막 기회로 시작한 시도가 도는 동안에도 0 이지만, 그 시도가 끝나 집게가 쉴 때에야 안내를 띄운다
  const isOutOfTries = session.tries === 0;

  const toggleMute = (): void => {
    const nextMuted = !isMuted;
    SFX.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  return (
    <div className={screen}>
      <main className={frame}>
        <SkyBackdrop />
        <GameCanvas
          instances={session.instances}
          vanishingIds={session.vanishingIds}
          onVanished={session.handleVanished}
          showColliders={IS_DEBUG_MODE}
        >
          <ClawRig
            input={input}
            session={session}
            onEvent={playClawEvent}
            overrides={overrides}
            onFailStreakChange={setFailStreak}
          />
        </GameCanvas>
        <Hud tries={session.tries} />
        <SoundToggle isMuted={isMuted} onToggle={toggleMute} />
        <Joystick onMove={input.setStick} />
        <DropButton isDisabled={!isIdle || isOutOfTries} onPress={input.requestDrop} />
        <OutOfTriesNotice isVisible={isIdle && isOutOfTries && celebration === null} />
        {IS_DEBUG_MODE && (
          <DebugPanel overrides={overrides} onChange={setOverrides} failStreak={failStreak} canSaveProgress={CAN_SAVE_PROGRESS} />
        )}
        {celebration !== null && (
          // 종류마다 한 번만 뽑으므로 종류 id 가 축하마다 다르다. 다음 축하는 새로 그려져 처음부터 다시 터진다.
          <Celebration
            key={celebration.kind.id}
            kind={celebration.kind}
            isComplete={celebration.isComplete}
            onClose={session.closeCelebration}
          />
        )}
        {isTouchLandscape && <RotateNotice />}
      </main>
    </div>
  );
}

export default App;

/** 집게 이벤트마다 효과음을 내고, 잡았을 때는 짧게 떤다 */
function playClawEvent(event: ClawEvent): void {
  const name = sfxForEvent(event);
  if (name !== null) SFX.play(name);
  if (event.type === 'grabbed') vibrate('grab');
}

injectGlobal(`
  body {
    margin: 0;
    touch-action: none;
    user-select: none;
    overflow: hidden;
    background: ${DESIGN_TOKENS.color.skyDeep};
  }
`);

/** 노트북처럼 넓은 화면에서 9:16 틀이 화면처럼 떠 보이도록 틀 둘레에 까는 옅은 그림자 */
const FRAME_SHADOW = `0 0 0 ${DESIGN_TOKENS.line.width}px ${DESIGN_TOKENS.color.shadow}, 0 12px 40px ${DESIGN_TOKENS.color.shadow}`;

/** 틀 밖은 같은 하늘색을 조금 진하게 칠해 틀이 화면으로 읽히게 한다 */
const screen = css`
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100dvh;
  background: ${DESIGN_TOKENS.color.skyDeep};
`;

/** 폰에서는 화면 전체, 넓은 화면에서는 가운데 9:16 세로 틀. 바탕 그림·3D 캔버스·조작부를 이 틀 안에 겹쳐 놓는다. */
const frame = css`
  position: relative;
  width: 100%;
  max-width: calc(100dvh * 9 / 16);
  height: 100dvh;
  box-shadow: ${FRAME_SHADOW};
  touch-action: none;
  user-select: none;
  overflow: hidden;
`;
