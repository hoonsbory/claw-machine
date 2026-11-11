import { css } from '@emotion/css';
import type { ReactElement } from 'react';

export interface DropButtonProps {
  /** 시도 중이면 비활성 모양이 된다 */
  isDisabled: boolean;
  onPress: () => void;
}

/** 오른쪽 아래 큰 내리기 버튼. 손을 떼기를 기다리지 않도록 누르는 순간(pointerdown) 반응한다. */
export function DropButton({ isDisabled, onPress }: DropButtonProps): ReactElement {
  return (
    <button type="button" className={button} disabled={isDisabled} onPointerDown={onPress}>
      내리기
    </button>
  );
}

const SIZE = 104;
const EDGE_RIGHT = 26;
const EDGE_BOTTOM = 40;
const FONT_SIZE = 19;
const FONT_WEIGHT = 800;
/** 눌렀을 때 내려가는 거리와 그만큼 줄어드는 아래 그림자 두께(px) */
const PRESS_DEPTH = 5;
const LIP_DEPTH = 7;
const PRESSED_LIP_DEPTH = LIP_DEPTH - PRESS_DEPTH;
const FACE_COLOR = '#ff3d7f';
const LIP_COLOR = '#c21f5c';
const DISABLED_FACE_COLOR = '#d9a3b8';
const DISABLED_LIP_COLOR = '#b98498';
const TEXT_COLOR = '#ffffff';
const DROP_SHADOW = '0 12px 18px rgba(160, 40, 100, 0.35)';
const FONT_FAMILY = `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif`;

const button = css`
  position: absolute;
  right: ${EDGE_RIGHT}px;
  bottom: calc(env(safe-area-inset-bottom) + ${EDGE_BOTTOM}px);
  width: ${SIZE}px;
  height: ${SIZE}px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: ${FACE_COLOR};
  box-shadow: 0 ${LIP_DEPTH}px 0 ${LIP_COLOR}, ${DROP_SHADOW};
  color: ${TEXT_COLOR};
  font-family: ${FONT_FAMILY};
  font-size: ${FONT_SIZE}px;
  font-weight: ${FONT_WEIGHT};
  touch-action: none;
  -webkit-tap-highlight-color: transparent;

  &:active:enabled {
    transform: translateY(${PRESS_DEPTH}px);
    box-shadow: 0 ${PRESSED_LIP_DEPTH}px 0 ${LIP_COLOR};
  }

  &:disabled {
    background: ${DISABLED_FACE_COLOR};
    box-shadow: 0 ${LIP_DEPTH}px 0 ${DISABLED_LIP_COLOR};
  }
`;
