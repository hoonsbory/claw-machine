import { css } from '@emotion/css';
import { useRef, type PointerEvent, type ReactElement } from 'react';
import { clampLength } from '../game/math';
import type { Vec2 } from '../game/types';

export interface JoystickProps {
  /** 기울기. 각 축 -1~1 이고 길이는 1을 넘지 않는다. 위로 밀면 z 가 음수(화면 안쪽)다. */
  onMove: (move: Vec2) => void;
}

/** 왼쪽 아래 조이스틱. 처음 누른 손가락 하나만 따라가므로 다른 손가락으로 내리기 버튼을 함께 눌러도 된다. */
export function Joystick({ onMove }: JoystickProps): ReactElement {
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  const tilt = (move: Vec2): void => {
    knobRef.current?.style.setProperty(KNOB_X_VAR, `${move.x * KNOB_TRAVEL}px`);
    knobRef.current?.style.setProperty(KNOB_Y_VAR, `${move.z * KNOB_TRAVEL}px`);
    onMove(move);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (activePointerId.current !== null) return;

    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    tilt(readTilt(event));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerId !== activePointerId.current) return;
    tilt(readTilt(event));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerId !== activePointerId.current) return;

    activePointerId.current = null;
    tilt(CENTER);
  };

  return (
    <div
      className={base}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      aria-hidden
    >
      <div ref={knobRef} className={knob} />
    </div>
  );
}

/** 원 가운데에서 누른 곳까지를 원 반지름으로 나눈 기울기. 원 밖으로 나가도 길이는 1이다. */
function readTilt(event: PointerEvent<HTMLDivElement>): Vec2 {
  const rect = event.currentTarget.getBoundingClientRect();
  const radius = rect.width / 2;
  const x = (event.clientX - (rect.left + radius)) / radius;
  const z = (event.clientY - (rect.top + radius)) / radius;
  return clampLength({ x, z }, MAX_TILT);
}

const CENTER: Vec2 = { x: 0, z: 0 };
const MAX_TILT = 1;
const KNOB_X_VAR = '--knob-x';
const KNOB_Y_VAR = '--knob-y';

const BASE_SIZE = 132;
const KNOB_SIZE = 58;
/** 손잡이가 가운데에서 움직일 수 있는 최대 거리(px) */
const KNOB_TRAVEL = 36;
const BASE_BORDER = 3;
const EDGE_LEFT = 22;
const EDGE_BOTTOM = 26;
const BASE_COLOR = 'rgba(255, 255, 255, 0.55)';
const BASE_BORDER_COLOR = 'rgba(255, 255, 255, 0.9)';
const KNOB_COLOR = '#ff5c9a';
const KNOB_SHADOW = '0 4px 10px rgba(160, 40, 100, 0.4)';

const base = css`
  position: absolute;
  left: ${EDGE_LEFT}px;
  bottom: calc(env(safe-area-inset-bottom) + ${EDGE_BOTTOM}px);
  box-sizing: border-box;
  width: ${BASE_SIZE}px;
  height: ${BASE_SIZE}px;
  border: ${BASE_BORDER}px solid ${BASE_BORDER_COLOR};
  border-radius: 50%;
  background: ${BASE_COLOR};
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
`;

const knob = css`
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${KNOB_SIZE}px;
  height: ${KNOB_SIZE}px;
  margin: ${-KNOB_SIZE / 2}px 0 0 ${-KNOB_SIZE / 2}px;
  border-radius: 50%;
  background: ${KNOB_COLOR};
  box-shadow: ${KNOB_SHADOW};
  transform: translate(var(${KNOB_X_VAR}, 0px), var(${KNOB_Y_VAR}, 0px));
  pointer-events: none;
`;
