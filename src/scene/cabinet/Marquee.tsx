import { useEffect, type ReactElement } from 'react';
import { MeshBasicMaterial, type Vector3Tuple } from 'three';
import { whenDisplayFontReady } from '../../theme/displayFont';
import { BACK_WALL_FACE_Z, PILLAR_RADIUS, WALL_CENTER_OFFSET, WALL_HEIGHT } from './cabinetDimensions';
import {
  AWNING_CANVAS_HEIGHT,
  AWNING_CANVAS_WIDTH,
  createAwningTexture,
  createSignTexture,
  repaintSign,
  SIGN_CANVAS_HEIGHT,
  SIGN_CANVAS_WIDTH,
  SIGN_TEXT,
} from './marqueeTextures';

/**
 * 기계 머리 장식: 뒷벽 윗변을 따라 늘어진 줄무늬 차양과, 그 가운데 위로 솟은 `인형뽑기` 간판.
 *
 * 카메라가 고정이라 화면 맨 위에서 뒷벽 윗변까지는 기준 화면(390×844)에서 약 37px 뿐이다. 그래서 진짜 기계처럼 유리 앞 위쪽에
 * 큰 간판을 달면 레일과 집게를 가리게 된다. 간판과 차양은 뒷벽 안쪽 면에 붙여 그 좁은 띠 안에 넣었고,
 * 놀이 공간의 모든 것(레일·집게·인형)보다 뒤에 있어 아무것도 가리지 않는다. 충돌체와 그림자는 없다.
 *
 * 간판 글자는 캔버스에 그린다. 화면 글꼴(Jua)이 늦게 오면 받는 즉시 다시 그려, 대체 글꼴로 남거나 빈 판이 되지 않는다.
 */
export function Marquee(): ReactElement {
  useEffect((): (() => void) => whenDisplayFontReady(SIGN_TEXT, (): void => repaintSign(SIGN_TEXTURE)), []);

  return (
    <>
      <mesh position={AWNING_CENTER} material={AWNING_MATERIAL}>
        <planeGeometry args={[AWNING_WIDTH, AWNING_HEIGHT]} />
      </mesh>
      <mesh position={SIGN_CENTER} material={SIGN_MATERIAL}>
        <planeGeometry args={[SIGN_WIDTH, SIGN_HEIGHT]} />
      </mesh>
    </>
  );
}

/** 뒷벽 면에서 띄우는 거리. 차양 위에 간판이 겹친다. */
const AWNING_LIFT = 0.012;
const SIGN_LIFT = 0.024;

/** 차양은 뒤쪽 두 기둥 사이, 뒷벽 윗변에 걸려 아래 물결이 뒷벽 위쪽으로 늘어진다(위 구석의 뽑은 수 배지와 겹치지 않을 만큼만 솟는다) */
const AWNING_WIDTH = (WALL_CENTER_OFFSET - PILLAR_RADIUS) * 2;
const AWNING_HEIGHT = (AWNING_WIDTH * AWNING_CANVAS_HEIGHT) / AWNING_CANVAS_WIDTH;
const AWNING_RISE = 0.06;
const AWNING_CENTER: Vector3Tuple = [0, WALL_HEIGHT + AWNING_RISE - AWNING_HEIGHT / 2, BACK_WALL_FACE_Z + AWNING_LIFT];

/** 간판은 화면 맨 위에 닿지 않을 만큼 솟는다(판 윗변 ≈ 벽 높이 + 0.72) */
const SIGN_WIDTH = 3.4;
const SIGN_HEIGHT = (SIGN_WIDTH * SIGN_CANVAS_HEIGHT) / SIGN_CANVAS_WIDTH;
const SIGN_TOP_ABOVE_WALL = 0.78;
const SIGN_CENTER: Vector3Tuple = [0, WALL_HEIGHT + SIGN_TOP_ABOVE_WALL - SIGN_HEIGHT / 2, BACK_WALL_FACE_Z + SIGN_LIFT];

/** 간판은 불을 켠 간판처럼 조명과 상관없이 제 색으로 보인다 */
const SIGN_TEXTURE = createSignTexture();
const SIGN_MATERIAL = new MeshBasicMaterial({ map: SIGN_TEXTURE, transparent: true });
const AWNING_MATERIAL = new MeshBasicMaterial({ map: createAwningTexture(), transparent: true });
