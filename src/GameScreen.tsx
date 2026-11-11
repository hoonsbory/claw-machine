import { useEffect, useState, type ReactElement } from 'react';
import { createSfx, sfxForEvent, vibrate } from './audio/sfx';
import { isDebugMode, type TuningOverrides } from './config/runtimeTuning';
import type { KeyValueStorage } from './game/progressStore';
import type { ClawEvent } from './game/types';
import { useMoveInput } from './input/useMoveInput';
import { ClawRig } from './scene/ClawRig';
import { GameCanvas } from './scene/GameCanvas';
import { canWriteStorage } from './session/browserStorage';
import { useGameSession } from './session/useGameSession';
import { Celebration } from './ui/Celebration';
import { DebugPanel } from './ui/DebugPanel';
import { DropButton } from './ui/DropButton';
import { Hud } from './ui/Hud';
import { Joystick } from './ui/Joystick';
import { OutOfTriesNotice } from './ui/OutOfTriesNotice';
import { RotateNotice } from './ui/RotateNotice';
import { SoundToggle } from './ui/SoundToggle';
import { useIsTouchLandscape } from './ui/useIsTouchLandscape';

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

export interface GameScreenProps {
  storage: KeyValueStorage;
}

/**
 * 게임 화면: 3D 기계, 남은 기회, 조작부, 축하 화면. 9:16 틀 안에 겹쳐 놓는다.
 * 충전 페이지로 가면 통째로 사라지고(WebGL·물리·소리 없음), 돌아오면 저장소에서 기록과 남은 기회를 새로 읽어 다시 시작한다.
 */
export function GameScreen({ storage }: GameScreenProps): ReactElement {
  const session = useGameSession(storage);
  const { celebration } = session;
  // 터치 기기를 가로로 눕히면 세로로 돌려 달라는 화면이 덮고, 그동안 입력은 게임에 전달하지 않는다
  const isTouchLandscape = useIsTouchLandscape();
  const input = useMoveInput({ isBlocked: celebration !== null || isTouchLandscape });
  // 음소거는 저장하지 않는다. 새로 열거나 충전 페이지에서 돌아오면 늘 소리가 켜져 있다.
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

  // 효과음은 이 화면보다 오래 살아 있으므로, 화면을 새로 그릴 때도 음소거 표시와 같은 상태로 맞춘다
  useEffect(() => {
    SFX.setMuted(isMuted);
  }, [isMuted]);

  // 축하 화면이 뜰 때마다(줄 서 있던 다음 축하가 뜰 때도) 획득 소리를 내고 길게 떤다
  useEffect(() => {
    if (celebration === null) return;
    SFX.play(celebration.isComplete ? 'complete' : 'win');
    vibrate('win');
  }, [celebration]);

  const isIdle = session.phase === 'idle';
  // 마지막 기회로 시작한 시도가 도는 동안에도 0 이지만, 그 시도가 끝나 집게가 쉴 때에야 안내를 띄운다
  const isOutOfTries = session.tries === 0;

  const toggleMute = (): void => setIsMuted(!isMuted);

  return (
    <>
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
    </>
  );
}

/** 집게 이벤트마다 효과음을 내고, 잡았을 때는 짧게 떤다 */
function playClawEvent(event: ClawEvent): void {
  const name = sfxForEvent(event);
  if (name !== null) SFX.play(name);
  if (event.type === 'grabbed') vibrate('grab');
}
