import { css, injectGlobal } from '@emotion/css';
import { useEffect, useState, type ReactElement } from 'react';
import { createSfx, sfxForEvent, vibrate } from './audio/sfx';
import { DOLL_KINDS } from './config/dollCatalog';
import type { ClawEvent } from './game/types';
import { useMoveInput } from './input/useMoveInput';
import { ClawRig } from './scene/ClawRig';
import { GameCanvas } from './scene/GameCanvas';
import { createBrowserStorage } from './session/browserStorage';
import { useGameSession } from './session/useGameSession';
import { Celebration } from './ui/Celebration';
import { DropButton } from './ui/DropButton';
import { Hud } from './ui/Hud';
import { Joystick } from './ui/Joystick';
import { SoundToggle } from './ui/SoundToggle';

const STORAGE = createBrowserStorage();
const SFX = createSfx();
/**
 * 오디오를 켜 주는 사용자 입력. 터치는 손을 뗄 때(pointerup)에야 사용자 입력으로 쳐 주는 브라우저가 있어 둘 다 듣는다.
 * 첫 입력 뒤에도 계속 들어서, 앱 전환 등으로 멈춘 오디오(아이폰)를 다음 입력 때 다시 켠다.
 */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'keydown'] as const;

function App(): ReactElement {
  const session = useGameSession(STORAGE);
  const { celebration } = session;
  const input = useMoveInput({ isBlocked: celebration !== null });
  // 음소거는 저장하지 않는다. 새로 열면 늘 소리가 켜져 있다.
  const [isMuted, setIsMuted] = useState(false);

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

  const toggleMute = (): void => {
    const nextMuted = !isMuted;
    SFX.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  return (
    <div className={screen}>
      <main className={frame}>
        <GameCanvas instances={session.instances} vanishingIds={session.vanishingIds} onVanished={session.handleVanished}>
          <ClawRig input={input} session={session} onEvent={playClawEvent} />
        </GameCanvas>
        <Hud wonCount={session.wonKindIds.size} totalCount={DOLL_KINDS.length} />
        <SoundToggle isMuted={isMuted} onToggle={toggleMute} />
        <Joystick onMove={input.setStick} />
        <DropButton isDisabled={session.phase !== 'idle'} onPress={input.requestDrop} />
      </main>
      {celebration !== null && (
        // 종류마다 한 번만 뽑으므로 종류 id 가 축하마다 다르다. 다음 축하는 새로 그려져 처음부터 다시 터진다.
        <Celebration
          key={celebration.kind.id}
          kind={celebration.kind}
          isComplete={celebration.isComplete}
          onClose={session.closeCelebration}
        />
      )}
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
