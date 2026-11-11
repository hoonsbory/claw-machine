import { css, keyframes } from '@emotion/css';
import type { ReactElement } from 'react';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { CloudDoodle, SparkleDoodle, StarDoodle } from '../doodles';
import { BackdropCharacters } from './BackdropCharacters';
import { GrassHill } from './GrassHill';

export interface SkyBackdropProps {
  /** 게임 화면이면 기계 둘레에 캐릭터 그림을 둔다(충전 페이지는 자기 그림을 따로 둔다) */
  showsCharacters: boolean;
}

/**
 * 3D 캔버스 뒤에 깔리는 바탕: 하늘색에서 크림색으로 내려오는 하늘, 몽글한 구름 몇 개, 반짝이, 아래쪽 풀 언덕,
 * 그리고 게임 화면에서는 기계 둘레의 캐릭터 그림.
 * 9:16 틀(position: relative)을 가득 채우고, 누르기는 그대로 통과시킨다.
 * 구름은 아주 천천히 좌우로 떠다니고, 움직임 줄이기를 켠 사람에게는 멈춰 있다.
 * 기계가 화면 가운데를 덮으므로 구름과 반짝이는 기계 옆 가장자리와 유리 너머로 보이는 자리에 둔다.
 */
export function SkyBackdrop({ showsCharacters }: SkyBackdropProps): ReactElement {
  return (
    <div className={backdrop} aria-hidden>
      {showsCharacters && <BackdropCharacters layer="behindClouds" />}
      {CLOUD_CLASSES.map((cloudClass) => (
        <CloudDoodle key={cloudClass} className={cloudClass} />
      ))}
      {SPARKLE_CLASSES.map((sparkleClass) => (
        <SparkleDoodle key={sparkleClass} className={sparkleClass} />
      ))}
      {STAR_CLASSES.map((starClass) => (
        <StarDoodle key={starClass} className={starClass} />
      ))}
      <GrassHill />
      {showsCharacters && <BackdropCharacters layer="front" />}
    </div>
  );
}

/** 구름 하나의 자리(틀에 대한 %), 크기, 떠다니는 폭과 한 번 오가는 시간 */
interface CloudSpot {
  top: number;
  left: number;
  width: number;
  drift: number;
  duration: number;
  delay: number;
}

/** 반짝이·별 하나의 자리(틀에 대한 %)와 크기(px) */
interface TwinkleSpot {
  top: number;
  left: number;
  size: number;
}

const CLOUDS: readonly CloudSpot[] = [
  { top: 8, left: -9, width: 30, drift: 14, duration: 46, delay: -12 },
  { top: 25, left: 80, width: 34, drift: -16, duration: 54, delay: -30 },
  { top: 47, left: -12, width: 26, drift: 12, duration: 50, delay: -5 },
];

const SPARKLES: readonly TwinkleSpot[] = [
  { top: 17, left: 3, size: 18 },
  { top: 39, left: 91, size: 14 },
  { top: 61, left: 4, size: 12 },
];

const STARS: readonly TwinkleSpot[] = [
  { top: 33, left: 2.5, size: 11 },
  { top: 15, left: 92, size: 12 },
  { top: 66, left: 92, size: 13 },
];

const drift = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(var(--drift)); }
`;

/** 캐릭터 그림이 틀 크기(cqw·cqh)로 기계 옆 자리를 잡도록 크기 질의 컨테이너로 둔다 */
const backdrop = css`
  position: absolute;
  inset: 0;
  overflow: hidden;
  container-type: size;
  background: linear-gradient(${DESIGN_TOKENS.color.sky} 0%, ${DESIGN_TOKENS.color.cream} 78%);
  pointer-events: none;
`;

const CLOUD_CLASSES = CLOUDS.map(
  ({ top, left, width, drift: driftPx, duration, delay }): string => css`
    position: absolute;
    top: ${top}%;
    left: ${left}%;
    width: ${width}%;
    --drift: ${driftPx}px;

    @media (prefers-reduced-motion: no-preference) {
      animation: ${drift} ${duration}s ${delay}s ease-in-out infinite alternate;
    }
  `,
);

function getTwinkleClass({ top, left, size }: TwinkleSpot): string {
  return css`
    position: absolute;
    top: ${top}%;
    left: ${left}%;
    width: ${size}px;
    height: ${size}px;
  `;
}

const SPARKLE_CLASSES = SPARKLES.map(getTwinkleClass);
const STAR_CLASSES = STARS.map(getTwinkleClass);
