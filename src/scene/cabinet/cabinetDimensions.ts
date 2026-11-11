import { DOLL_KINDS } from '../../config/dollCatalog';
import { GAME_CONFIG } from '../../config/gameConfig';
import { getCabinetLayout } from '../../game/dollGeometry';

/*
 * 기계 치수. 바닥 크기·벽 높이·배출구 자리는 게임 설정(GAME_CONFIG, getCabinetLayout)에서 오고,
 * 충돌체와 장식이 같이 쓰는 두께만 여기서 정한다. 장식은 이 값을 기준으로 놀이 공간(바닥 위, 네 벽 안, 벽 높이 아래) 바깥에 놓는다.
 */

export const { floorHalf: FLOOR_HALF, wallHeight: WALL_HEIGHT, chuteWallHeight: CHUTE_WALL_HEIGHT } = GAME_CONFIG.cabinet;
export const CABINET_LAYOUT = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);

export const FLOOR_HALF_THICKNESS = 0.5;
export const WALL_HALF_THICKNESS = 0.1;
export const PARTITION_HALF_THICKNESS = 0.06;

/** 바닥 판 아랫면 높이 */
export const FLOOR_BOTTOM_Y = -FLOOR_HALF_THICKNESS * 2;
/** 벽 두께의 가운데 줄. 모서리 기둥이 여기에 선다. */
export const WALL_CENTER_OFFSET = FLOOR_HALF + WALL_HALF_THICKNESS;
/** 뒷벽 안쪽 면의 z. 간판·차양은 이 면에 붙인다. */
export const BACK_WALL_FACE_Z = -FLOOR_HALF;
/** 네 모서리 기둥 반지름. 차양은 뒤쪽 두 기둥 사이에 걸린다. */
export const PILLAR_RADIUS = 0.14;
