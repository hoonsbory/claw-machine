import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';

export interface DropButtonProps {
  /**
   * 시도 중이거나 남은 기회가 없으면 비활성 모양이 된다. 모양만 바꾸는 것이고,
   * 기회 없이 시도가 시작되지 않게 막는 것은 집게 상태 흐름(clawMachine.ts 의 hasTryLeft)이다.
   */
  isDisabled: boolean;
  onPress: () => void;
}

/**
 * 오른쪽 아래 큰 내리기 버튼. 갈색 테두리의 산호색 사탕 버튼이고, 시도 중이거나 기회가 없으면 옅어진다.
 * 손을 떼기를 기다리지 않도록 누르는 순간(pointerdown) 반응한다.
 */
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
const FONT_SIZE = 23;
/** 눌렀을 때 내려가는 거리와 그만큼 줄어드는 아래 두께(px) */
const PRESS_DEPTH = 5;
const LIP_DEPTH = 7;
const PRESSED_LIP_DEPTH = LIP_DEPTH - PRESS_DEPTH;
/** 사탕 같은 윗면 반짝임: 자리, 크기(px), 기울기 */
const HIGHLIGHT_LEFT = 18;
const HIGHLIGHT_TOP = 12;
const HIGHLIGHT_WIDTH = 26;
const HIGHLIGHT_HEIGHT = 15;
const HIGHLIGHT_TILT = -28;
/** 크림색 글자를 두르는 갈색 테두리 굵기(px) */
const LABEL_OUTLINE = 2;
const FOCUS_RING_OFFSET = 4;
const DISABLED_HIGHLIGHT_OPACITY = 0.5;

const { color, font, line, shadow } = DESIGN_TOKENS;

/** 둥근 면 아래로 같은 모양의 두께를 그리고, 그 두께까지 갈색 테두리로 감싼다 */
function getLipShadow(lipDepth: number, lipColor: string, outlineColor: string): string {
  return `0 ${lipDepth}px 0 0 ${lipColor}, 0 ${lipDepth}px 0 ${line.thickWidth}px ${outlineColor}`;
}

/** 크림색 글자 둘레를 여덟 방향으로 감싸 갈색 테두리를 만든다 */
function getLabelOutline(outlineColor: string): string {
  const offsets = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];
  return offsets.map(([x, y]): string => `${x * LABEL_OUTLINE}px ${y * LABEL_OUTLINE}px 0 ${outlineColor}`).join(', ');
}

const button = css`
  position: absolute;
  right: ${EDGE_RIGHT}px;
  bottom: calc(env(safe-area-inset-bottom) + ${EDGE_BOTTOM}px);
  box-sizing: border-box;
  width: ${SIZE}px;
  height: ${SIZE}px;
  padding: 0;
  border: ${line.thickWidth}px solid ${color.line};
  border-radius: 50%;
  background: ${color.coral};
  box-shadow: ${getLipShadow(LIP_DEPTH, color.coralDeep, color.line)}, ${shadow.drop};
  color: ${color.cream};
  font-family: ${font.family};
  font-size: ${FONT_SIZE}px;
  font-weight: ${font.weight};
  font-synthesis: none;
  text-shadow: ${getLabelOutline(color.line)};
  touch-action: none;
  -webkit-tap-highlight-color: transparent;

  &::before {
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

  &:active:enabled {
    transform: translateY(${PRESS_DEPTH}px);
    box-shadow: ${getLipShadow(PRESSED_LIP_DEPTH, color.coralDeep, color.line)};
  }

  &:focus-visible {
    outline: ${line.width}px solid ${color.coralDeep};
    outline-offset: ${FOCUS_RING_OFFSET + LIP_DEPTH}px;
  }

  &:disabled {
    border-color: ${color.lineSoft};
    background: ${color.disabledFace};
    box-shadow: ${getLipShadow(LIP_DEPTH, color.disabledLip, color.lineSoft)};
    text-shadow: ${getLabelOutline(color.lineSoft)};
  }

  &:disabled::before {
    opacity: ${DISABLED_HIGHLIGHT_OPACITY};
  }
`;
