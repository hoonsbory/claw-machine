import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';

export interface SoundToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

/** 위쪽 오른편의 소리 켜고 끄는 버튼. 음소거면 스피커에 X 가, 아니면 소리 물결이 그려진다. 남은 기회 판과 같은 크림색에 갈색 테두리다. */
export function SoundToggle({ isMuted, onToggle }: SoundToggleProps): ReactElement {
  return (
    <button type="button" className={button} aria-label="음소거" aria-pressed={isMuted} onClick={onToggle}>
      <svg className={icon} viewBox="0 0 20 20" aria-hidden>
        <path d={SPEAKER_PATH} className={speaker} />
        <path d={isMuted ? MUTED_MARK_PATH : SOUND_WAVES_PATH} className={stroke} />
      </svg>
    </button>
  );
}

const SPEAKER_PATH = 'M3 7.5h3l4-3.5v12l-4-3.5H3z';
const SOUND_WAVES_PATH = 'M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10';
const MUTED_MARK_PATH = 'M13 7.5l4.5 5M17.5 7.5l-4.5 5';

/** 390×844 에서 기계 유리 윗모서리(y≈37)보다 위에 들어가는 크기와 자리. 조정 버튼(?debug)과 높이를 맞췄다. */
const SIZE = 30;
const EDGE_TOP = 6;
const EDGE_RIGHT = 10;
/** 보이는 원보다 넓게 눌리도록 사방으로 늘린 누름 영역(px). 늘린 부분은 투명해서 기계를 가리지 않는다. */
const HIT_SLOP = 7;
const ICON_SIZE = 18;
const STROKE_WIDTH = 1.8;
/** 스피커 모양 모서리를 둥글리는 테두리 */
const SPEAKER_STROKE_WIDTH = 1;
const FOCUS_RING_OFFSET = 2;

const { color, line, shadow } = DESIGN_TOKENS;

const button = css`
  position: absolute;
  top: calc(env(safe-area-inset-top) + ${EDGE_TOP}px);
  right: ${EDGE_RIGHT}px;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  width: ${SIZE}px;
  height: ${SIZE}px;
  padding: 0;
  border: ${line.width}px solid ${color.line};
  border-radius: 50%;
  background: ${color.cream};
  box-shadow: ${shadow.sticker};
  color: ${color.line};
  touch-action: none;
  -webkit-tap-highlight-color: transparent;

  &::after {
    content: '';
    position: absolute;
    inset: -${HIT_SLOP}px;
  }

  &:focus-visible {
    outline: ${line.width}px solid ${color.coralDeep};
    outline-offset: ${FOCUS_RING_OFFSET}px;
  }
`;

const icon = css`
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
`;

const speaker = css`
  fill: currentColor;
  stroke: currentColor;
  stroke-width: ${SPEAKER_STROKE_WIDTH};
  stroke-linejoin: round;
`;

const stroke = css`
  fill: none;
  stroke: currentColor;
  stroke-width: ${STROKE_WIDTH};
  stroke-linecap: round;
`;
