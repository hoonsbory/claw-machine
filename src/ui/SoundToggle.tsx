import { css } from '@emotion/css';
import type { ReactElement } from 'react';

export interface SoundToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

/** 위쪽 오른편의 소리 켜고 끄는 버튼. 음소거면 스피커에 X 가, 아니면 소리 물결이 그려진다. */
export function SoundToggle({ isMuted, onToggle }: SoundToggleProps): ReactElement {
  return (
    <button type="button" className={button} aria-label="음소거" aria-pressed={isMuted} onClick={onToggle}>
      <svg className={icon} viewBox="0 0 20 20" aria-hidden>
        <path d={SPEAKER_PATH} fill="currentColor" />
        <path d={isMuted ? MUTED_MARK_PATH : SOUND_WAVES_PATH} className={stroke} />
      </svg>
    </button>
  );
}

const SPEAKER_PATH = 'M3 7.5h3l4-3.5v12l-4-3.5H3z';
const SOUND_WAVES_PATH = 'M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10';
const MUTED_MARK_PATH = 'M13 7.5l4.5 5M17.5 7.5l-4.5 5';

/** 390×844 에서 기계 유리 윗모서리(y≈38)보다 위에 들어가는 크기와 자리 */
const SIZE = 30;
const EDGE_TOP = 5;
const EDGE_RIGHT = 10;
/** 보이는 원보다 넓게 눌리도록 사방으로 늘린 누름 영역(px). 늘린 부분은 투명해서 기계를 가리지 않는다. */
const HIT_SLOP = 7;
const ICON_SIZE = 18;
const STROKE_WIDTH = 1.8;
const BACKGROUND = 'rgba(255, 255, 255, 0.75)';
const ICON_COLOR = '#c21f5c';
const SHADOW = '0 2px 6px rgba(160, 40, 100, 0.2)';

const button = css`
  position: absolute;
  top: calc(env(safe-area-inset-top) + ${EDGE_TOP}px);
  right: ${EDGE_RIGHT}px;
  display: grid;
  place-items: center;
  width: ${SIZE}px;
  height: ${SIZE}px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: ${BACKGROUND};
  box-shadow: ${SHADOW};
  color: ${ICON_COLOR};
  touch-action: none;
  -webkit-tap-highlight-color: transparent;

  &::after {
    content: '';
    position: absolute;
    inset: -${HIT_SLOP}px;
  }
`;

const icon = css`
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
`;

const stroke = css`
  fill: none;
  stroke: currentColor;
  stroke-width: ${STROKE_WIDTH};
  stroke-linecap: round;
`;
