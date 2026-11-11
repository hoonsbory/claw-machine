import { css } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { FlowerDoodle } from '../doodles';

/**
 * 틀 아래쪽의 부드러운 민트색 풀 언덕과 작은 꽃 몇 송이. 기계는 언덕 마루 앞에 서 있고, 조이스틱과 내리기 버튼은 그 위에 놓인다.
 * 언덕은 틀 폭에 맞춰 늘어나도 테두리 굵기가 그대로이고, 꽃은 늘어나지 않도록 따로 놓는다.
 */
export function GrassHill(): ReactElement {
  return (
    <div className={hill}>
      <svg className={hillShape} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
        <path d={BACK_HILL_FILL} fill={color.mintDeep} />
        <path d={BACK_HILL_CREST} {...CREST_LINE} />
        <path d={FRONT_HILL_FILL} fill={color.mint} />
        <path d={FRONT_HILL_CREST} {...CREST_LINE} />
      </svg>
      {FLOWER_CLASSES.map((flower) => (
        <FlowerDoodle key={flower.className} className={flower.className} petalColor={flower.petalColor} />
      ))}
    </div>
  );
}

const { color } = DESIGN_TOKENS;

/** 언덕 마루 선. 늘어난 그림에서도 같은 굵기다. */
const CREST_LINE = {
  fill: 'none',
  stroke: color.line,
  strokeWidth: DESIGN_TOKENS.line.width,
  strokeLinecap: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const;

/* 뒤 언덕은 오른쪽에서 살짝 솟고, 앞 언덕은 가운데가 둥글게 높다. 좌표는 언덕 칸(100×30)에 대한 값이다. */
const BACK_HILL_CREST = 'M38 11C52 3.5 70 1.2 84 2.6C92 3.4 97 5 101 6.5';
const BACK_HILL_FILL = `${BACK_HILL_CREST}L101 31L38 31Z`;
const FRONT_HILL_CREST = 'M-1 9.5C14 4.5 30 3 47 4.8C64 6.6 79 10.5 101 11.5';
const FRONT_HILL_FILL = `${FRONT_HILL_CREST}L101 31L-1 31Z`;

/** 언덕 칸의 높이(틀 높이에 대한 %) */
const HILL_HEIGHT = 27;
const FLOWER_WIDTH = 18;
const FLOWER_ASPECT = 34 / 24;

/** 꽃 한 송이의 자리(언덕 칸 왼쪽 위에서 %)와 꽃잎 색 */
interface FlowerSpot {
  top: number;
  left: number;
  petalColor: string;
}

/** 조작부를 피해 가장자리와 아래 가운데에 둔다 */
const FLOWERS: readonly FlowerSpot[] = [
  { top: 9, left: 2.5, petalColor: color.peach },
  { top: 22, left: 92, petalColor: color.lavender },
  { top: 11, left: 88, petalColor: color.cream },
  { top: 70, left: 44, petalColor: color.coral },
  { top: 76, left: 53, petalColor: color.butter },
];

interface FlowerLook {
  className: string;
  petalColor: string;
}

const FLOWER_CLASSES = FLOWERS.map(({ top, left, petalColor }): FlowerLook => ({
  petalColor,
  className: css`
    position: absolute;
    top: ${top}%;
    left: ${left}%;
    width: ${FLOWER_WIDTH}px;
    height: ${FLOWER_WIDTH * FLOWER_ASPECT}px;
  `,
}));

const hill = css`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: ${HILL_HEIGHT}%;
`;

const hillShape = css`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`;
