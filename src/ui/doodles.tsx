import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../theme/tokens';

/*
 * 손으로 그린 듯한 작은 그림들: 구름, 네 갈래 반짝이, 작은 별, 꽃. 모두 직접 그린 모양이다.
 * 선은 크기와 상관없이 같은 굵기로 보이도록 non-scaling-stroke 로 그리고, 경로는 일부러 조금씩 비뚤게 잡았다.
 * 장식이라 화면 읽기 프로그램에는 보이지 않는다.
 */

export interface DoodleProps {
  className?: string;
}

/** 아래가 평평하고 위로 몽글몽글한 구름 */
export function CloudDoodle({ className }: DoodleProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 120 60" aria-hidden>
      <path d={CLOUD_PATH} fill={color.cream} {...OUTLINE} />
      <path d={CLOUD_CREASE_PATH} fill="none" {...SOFT_OUTLINE} />
    </svg>
  );
}

/** 네 갈래로 뻗은 반짝이 */
export function SparkleDoodle({ className }: DoodleProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d={SPARKLE_PATH} fill={color.butter} {...OUTLINE} />
    </svg>
  );
}

/** 끝이 둥근 작은 별 */
export function StarDoodle({ className }: DoodleProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d={STAR_PATH} fill={color.butter} {...OUTLINE} />
    </svg>
  );
}

export interface FlowerDoodleProps extends DoodleProps {
  petalColor: string;
}

/** 줄기 위의 다섯 잎 꽃. 꽃잎 테두리가 서로 겹쳐 손그림처럼 보인다. */
export function FlowerDoodle({ className, petalColor }: FlowerDoodleProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 34" aria-hidden>
      <path d={STEM_PATH} fill="none" {...OUTLINE} />
      <path d={LEAF_PATH} fill={color.mintDeep} {...OUTLINE} />
      {PETAL_CENTERS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={PETAL_RADIUS} fill={petalColor} {...OUTLINE} />
      ))}
      <circle cx={FLOWER_CENTER_X} cy={FLOWER_CENTER_Y} r={FLOWER_HEART_RADIUS} fill={color.butter} {...OUTLINE} />
    </svg>
  );
}

const { color } = DESIGN_TOKENS;

/** 갈색 테두리. 그림 크기가 달라도 같은 굵기다. */
const OUTLINE = {
  stroke: color.line,
  strokeWidth: DESIGN_TOKENS.line.width,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const;

/** 구름 안쪽 주름처럼 옅게 긋는 선 */
const SOFT_OUTLINE = { ...OUTLINE, stroke: color.lineSoft } as const;

const CLOUD_PATH =
  'M15 52C5 51 3 39 14 36C12 25 27 18 37 25C41 11 63 6 70 21C78 12 97 15 96 29C109 28 117 42 106 50C99 55 61 54 15 52Z';
const CLOUD_CREASE_PATH = 'M37 25C40 28 41 31 40 34M70 21C72 24 72 27 70 30';
const SPARKLE_PATH = 'M12 1.5C13 8.2 15.6 10.9 22.5 12C15.6 13.1 13 15.8 12 22.5C11 15.8 8.4 13.1 1.5 12C8.4 10.9 11 8.2 12 1.5Z';
const STAR_PATH = 'M12 2.2L14.8 8.5L21.9 9.2L16.6 13.9L18.2 20.9L12 17.3L5.9 21L7.4 13.9L2.1 9.1L9.2 8.5Z';

const FLOWER_CENTER_X = 12;
const FLOWER_CENTER_Y = 10;
const PETAL_RADIUS = 4.2;
const PETAL_DISTANCE = 5;
const PETAL_COUNT = 5;
const FLOWER_HEART_RADIUS = 2.8;
/** 꽃잎 다섯 장의 가운데. 위를 향한 잎부터 고르게 돈다. */
const PETAL_CENTERS = Array.from({ length: PETAL_COUNT }, (_, index): [number, number] => {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / PETAL_COUNT;
  return [FLOWER_CENTER_X + Math.cos(angle) * PETAL_DISTANCE, FLOWER_CENTER_Y + Math.sin(angle) * PETAL_DISTANCE];
});
const STEM_PATH = 'M12 15C12.5 21 11.5 27 12 33';
const LEAF_PATH = 'M12 26C14 22 18 21 20 22C19 25 15 27 12 26Z';
