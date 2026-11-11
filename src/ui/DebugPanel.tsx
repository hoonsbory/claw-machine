import { css } from '@emotion/css';
import { useId, useState, type KeyboardEvent, type ReactElement } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import { applyTuning, type TuningOverrides } from '../config/runtimeTuning';

export interface DebugPanelProps {
  overrides: TuningOverrides;
  onChange: (next: TuningOverrides) => void;
  failStreak: number;
}

/**
 * 주소에 ?debug 를 붙였을 때만 뜨는 조정 패널. 위쪽 왼편에 접힌 채 있다가 누르면 펼쳐진다.
 * 집기 수치 셋을 슬라이더로 바꾸고 지금 연속 실패 수를 보여 준다. 바꾼 값은 다음 시도부터 적용되고 저장하지 않는다.
 */
export function DebugPanel({ overrides, onChange, failStreak }: DebugPanelProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const bodyId = useId();
  const current = applyTuning(GAME_CONFIG, overrides).grab;

  return (
    <div className={panel}>
      <button
        type="button"
        className={toggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={(): void => setIsOpen(!isOpen)}
      >
        조정
      </button>
      {isOpen && (
        <div id={bodyId} className={body}>
          {SLIDERS.map((slider) => (
            <label key={slider.key} className={row}>
              <span className={rowHead}>
                <span>{slider.label}</span>
                <span className={valueText}>{current[slider.key].toFixed(slider.fractionDigits)}</span>
              </span>
              <input
                type="range"
                className={range}
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={current[slider.key]}
                onChange={(event): void => onChange({ ...overrides, [slider.key]: Number(event.currentTarget.value) })}
                onKeyDown={keepKeysForGame}
              />
            </label>
          ))}
          <p className={streak}>
            연속 실패 <strong>{failStreak}</strong>
          </p>
          <p className={note}>다음 시도부터 적용 · 새로고침하면 사라짐</p>
        </div>
      )}
    </div>
  );
}

/** 슬라이더 값을 바꾸는 키. 방향키는 집게 조작이기도 하다. */
const RANGE_VALUE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * 슬라이더를 만진 뒤 초점이 남아 있어도 키로는 값이 바뀌지 않게 한다. 방향키로 집게를 움직이다 집게 힘이 몰래 바뀌는 일을 막는다.
 * 키 입력은 그대로 창까지 올라가 게임에 전달되고, Tab 으로 초점을 옮기는 것은 막지 않는다.
 */
function keepKeysForGame(event: KeyboardEvent<HTMLInputElement>): void {
  if (RANGE_VALUE_KEYS.has(event.key)) event.preventDefault();
}

/** 슬라이더 하나: 바꿀 값, 이름, 범위와 간격, 보여 줄 소수 자리 */
interface SliderSpec {
  key: keyof TuningOverrides;
  label: string;
  min: number;
  max: number;
  step: number;
  fractionDigits: number;
}

const SLIDERS: readonly SliderSpec[] = [
  { key: 'grip', label: '집게 힘', min: 0, max: 1, step: 0.05, fractionDigits: 2 },
  { key: 'reachMargin', label: '닿는 여유', min: 0.1, max: 0.8, step: 0.05, fractionDigits: 2 },
  { key: 'pityAfterFails', label: '보정까지 실패 횟수', min: 1, max: 6, step: 1, fractionDigits: 0 },
];

/** 390×844 에서 소리 버튼(오른편)과 같은 높이의 왼편 자리 */
const EDGE_TOP = 5;
const EDGE_LEFT = 10;
const TOGGLE_HEIGHT = 30;
const TOGGLE_PADDING_X = 12;
const BODY_GAP = 6;
const BODY_WIDTH = 220;
const BODY_PADDING = 12;
const BODY_RADIUS = 12;
const ROW_GAP = 10;
const FONT_SIZE = 13;
const NOTE_FONT_SIZE = 11;
const FONT_WEIGHT = 700;
const BACKGROUND = 'rgba(255, 255, 255, 0.92)';
const TEXT_COLOR = '#7a2f55';
const ACCENT_COLOR = '#c21f5c';
const NOTE_COLOR = '#9a6680';
const SHADOW = '0 2px 6px rgba(160, 40, 100, 0.2)';
const FONT_FAMILY = `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif`;

const panel = css`
  position: absolute;
  top: calc(env(safe-area-inset-top) + ${EDGE_TOP}px);
  left: ${EDGE_LEFT}px;
  color: ${TEXT_COLOR};
  font-family: ${FONT_FAMILY};
  font-size: ${FONT_SIZE}px;
  touch-action: none;
`;

const toggle = css`
  height: ${TOGGLE_HEIGHT}px;
  padding: 0 ${TOGGLE_PADDING_X}px;
  border: 0;
  border-radius: ${TOGGLE_HEIGHT / 2}px;
  background: ${BACKGROUND};
  box-shadow: ${SHADOW};
  color: ${ACCENT_COLOR};
  font: inherit;
  font-weight: ${FONT_WEIGHT};
  -webkit-tap-highlight-color: transparent;
`;

const body = css`
  display: flex;
  flex-direction: column;
  gap: ${ROW_GAP}px;
  box-sizing: border-box;
  width: ${BODY_WIDTH}px;
  margin-top: ${BODY_GAP}px;
  padding: ${BODY_PADDING}px;
  border-radius: ${BODY_RADIUS}px;
  background: ${BACKGROUND};
  box-shadow: ${SHADOW};
`;

const row = css`
  display: flex;
  flex-direction: column;
`;

const rowHead = css`
  display: flex;
  justify-content: space-between;
`;

const valueText = css`
  color: ${ACCENT_COLOR};
  font-weight: ${FONT_WEIGHT};
  font-variant-numeric: tabular-nums;
`;

const range = css`
  width: 100%;
  margin: 0;
  accent-color: ${ACCENT_COLOR};
`;

const streak = css`
  margin: 0;

  strong {
    color: ${ACCENT_COLOR};
  }
`;

const note = css`
  margin: 0;
  color: ${NOTE_COLOR};
  font-size: ${NOTE_FONT_SIZE}px;
`;
