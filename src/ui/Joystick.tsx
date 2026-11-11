import { css } from '@emotion/css';
import { useCallback, useEffect, useRef, type PointerEvent, type ReactElement } from 'react';
import { clampLength } from '../game/math';
import type { Vec2 } from '../game/types';
import { DESIGN_TOKENS } from '../theme/tokens';

export interface JoystickProps {
  /** 기울기. 각 축 -1~1 이고 길이는 1을 넘지 않는다. 위로 밀면 z 가 음수(화면 안쪽)다. */
  onMove: (move: Vec2) => void;
}

/**
 * 왼쪽 아래 조이스틱. 처음 누른 손가락 하나만 따라가므로 다른 손가락으로 내리기 버튼을 함께 눌러도 된다.
 * 따라가던 손가락을 pointerup·pointercancel 없이 놓쳐도(홈 제스처, 알림 창 내리기) 막대가 멈춘 채 죽지 않는다:
 * 붙잡기를 잃거나 창이 가려지면 가운데로 돌리고, 붙잡기가 이미 풀린 손가락을 따라가고 있었으면 새로 누른 손가락으로 바꾼다.
 */
export function Joystick({ onMove }: JoystickProps): ReactElement {
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  const tilt = useCallback(
    (move: Vec2): void => {
      knobRef.current?.style.setProperty(KNOB_X_VAR, `${move.x * KNOB_TRAVEL}px`);
      knobRef.current?.style.setProperty(KNOB_Y_VAR, `${move.z * KNOB_TRAVEL}px`);
      onMove(move);
    },
    [onMove],
  );

  /** 따라가던 손가락을 놓고 가운데로 돌린다 */
  const letGo = useCallback((): void => {
    activePointerId.current = null;
    tilt(CENTER);
  }, [tilt]);

  // 창이 포커스를 잃거나 가려지면 손가락 이벤트가 더 오지 않을 수 있어 막대를 놓는다
  useEffect(() => {
    const letGoWhenHidden = (): void => {
      if (document.hidden) letGo();
    };
    window.addEventListener('blur', letGo);
    document.addEventListener('visibilitychange', letGoWhenHidden);
    return (): void => {
      window.removeEventListener('blur', letGo);
      document.removeEventListener('visibilitychange', letGoWhenHidden);
    };
  }, [letGo]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const trackedId = activePointerId.current;
    const isTrackingLivePointer = trackedId !== null && event.currentTarget.hasPointerCapture(trackedId);
    if (isTrackingLivePointer) return;

    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    tilt(readTilt(event));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerId !== activePointerId.current) return;
    tilt(readTilt(event));
  };

  /** 뗐거나, 취소됐거나, 붙잡기를 잃은 손가락이 따라가던 손가락이면 놓는다 */
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerId !== activePointerId.current) return;
    letGo();
  };

  return (
    <div
      className={base}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
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
const EDGE_LEFT = 22;
const EDGE_BOTTOM = 26;
/** 받침 안쪽에 바느질한 듯 그은 점선 고리와 받침 테두리 사이(px) */
const STITCH_INSET = 9;
/** 공 손잡이 왼쪽 위의 반짝임: 자리, 크기(px), 기울기 */
const HIGHLIGHT_LEFT = 11;
const HIGHLIGHT_TOP = 9;
const HIGHLIGHT_WIDTH = 17;
const HIGHLIGHT_HEIGHT = 11;
const HIGHLIGHT_TILT = -25;

const { color, line, shadow } = DESIGN_TOKENS;

/** 크림색 둥근 받침. 테두리까지 BASE_SIZE 안에 들어가 누름 영역 크기는 그대로다. */
const base = css`
  position: absolute;
  left: ${EDGE_LEFT}px;
  bottom: calc(env(safe-area-inset-bottom) + ${EDGE_BOTTOM}px);
  box-sizing: border-box;
  width: ${BASE_SIZE}px;
  height: ${BASE_SIZE}px;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: 50%;
  background: ${color.cream};
  box-shadow: ${shadow.sticker};
  touch-action: none;
  -webkit-tap-highlight-color: transparent;

  &::before {
    content: '';
    position: absolute;
    inset: ${STITCH_INSET}px;
    border: ${line.width}px dashed ${color.peachDeep};
    border-radius: 50%;
  }
`;

/** 갈색 테두리의 산호색 공 손잡이 */
const knob = css`
  position: absolute;
  left: 50%;
  top: 50%;
  box-sizing: border-box;
  width: ${KNOB_SIZE}px;
  height: ${KNOB_SIZE}px;
  margin: ${-KNOB_SIZE / 2}px 0 0 ${-KNOB_SIZE / 2}px;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: 50%;
  background: ${color.coral};
  box-shadow: ${shadow.sticker};
  transform: translate(var(${KNOB_X_VAR}, 0px), var(${KNOB_Y_VAR}, 0px));
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    left: ${HIGHLIGHT_LEFT}px;
    top: ${HIGHLIGHT_TOP}px;
    width: ${HIGHLIGHT_WIDTH}px;
    height: ${HIGHLIGHT_HEIGHT}px;
    border-radius: 50%;
    background: ${color.highlight};
    transform: rotate(${HIGHLIGHT_TILT}deg);
  }
`;
