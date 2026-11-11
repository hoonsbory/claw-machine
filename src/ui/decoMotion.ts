import { css, keyframes } from '@emotion/css';

/*
 * 장식 그림이 같이 쓰는 움직임. 움직임 줄이기를 켠 사람에게는 모두 멈춰 있다.
 * 자리(left·top·transform)와 겹치지 않도록 둥실거림은 translate, 기울기는 rotate, 좌우 뒤집기는 scale 속성만 쓴다.
 */

/** 둥실거리는 높이(px)와 한 번 오르내리는 시간(초) */
const BOB_RISE = 4;
const BOB_DURATION = 3.2;

const bob = keyframes`
  from { translate: 0 0; }
  to { translate: 0 -${BOB_RISE}px; }
`;

/** 제자리에서 천천히 오르내린다. delay(초)를 그림마다 달리 주면 함께 움직이지 않는다. */
export function getBobClass(delay: number): string {
  return css`
    @media (prefers-reduced-motion: no-preference) {
      animation: ${bob} ${BOB_DURATION}s ${delay}s ease-in-out infinite alternate;
    }
  `;
}

/** 좌우를 뒤집을 때와 그대로 둘 때의 가로 배율 */
const MIRRORED_SCALE_X = -1;
const PLAIN_SCALE_X = 1;

/** 기울기(도)와 좌우 뒤집기 */
export function getPoseClass(tilt: number, isFlipped: boolean): string {
  const scaleX = isFlipped ? MIRRORED_SCALE_X : PLAIN_SCALE_X;
  return css`
    rotate: ${tilt}deg;
    scale: ${scaleX} 1;
  `;
}
