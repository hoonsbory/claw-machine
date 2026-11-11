import { MeshStandardMaterial } from 'three';
import { DESIGN_TOKENS } from '../theme/tokens';

/*
 * 기계와 집게가 같이 쓰는 무광 파스텔 재질. 같은 색은 재질 하나를 나눠 써서 그리기 준비를 줄인다.
 * 금속 느낌 없이 천이나 칠한 나무처럼 보이도록 거칠기를 높이고 금속성은 0 이다.
 */

const MATTE = { roughness: 0.85, metalness: 0 } as const;
/** 집게 손가락만 살짝 윤이 나는 금색 */
const SATIN = { roughness: 0.55, metalness: 0 } as const;

const { color } = DESIGN_TOKENS;

export const PASTEL_MATERIALS = {
  cream: new MeshStandardMaterial({ color: color.cream, ...MATTE }),
  butter: new MeshStandardMaterial({ color: color.butter, ...MATTE }),
  peach: new MeshStandardMaterial({ color: color.peach, ...MATTE }),
  coral: new MeshStandardMaterial({ color: color.coral, ...MATTE }),
  gold: new MeshStandardMaterial({ color: color.gold, ...SATIN }),
  line: new MeshStandardMaterial({ color: color.line, ...MATTE }),
} as const;
