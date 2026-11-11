import { useEffect, type ReactElement } from 'react';
import { CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, type BufferGeometry, type Vector3Tuple } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PASTEL_MATERIALS } from '../pastelMaterials';
import {
  BODY_DECAL_HEIGHT,
  BODY_DECAL_WIDTH,
  BODY_STICKER_KIND_IDS,
  BUTTON_PLATE,
  createBodyDecalTexture,
  repaintBodyDecal,
} from './bodyTextures';
import {
  FLOOR_BOTTOM_Y,
  FLOOR_HALF,
  PILLAR_RADIUS,
  WALL_CENTER_OFFSET,
  WALL_HALF_THICKNESS,
  WALL_HEIGHT,
} from './cabinetDimensions';
import { createGroundShadowTexture } from './playSpaceTextures';
import { whenStickersLoaded } from './stickerImages';

/**
 * 기계 몸체 장식: 크림색 모서리 기둥과 윗난간, 바닥 판을 두른 버터색 띠, 둥근 복숭아색 아래 몸통과 그 앞면 그림(경품 문·별),
 * 산호색 장식 단추, 발치의 옅은 그림자. 모두 모양만 있고 충돌체도 그림자 드리우기도 없다.
 * 기둥과 난간은 벽 바깥 줄(|x|, |z| ≥ 바닥 절반)에 서고 몸통은 바닥 아래에 있어서, 카메라에서 놀이 공간 안을 가리지 않는다.
 * 기둥·난간은 도형 하나로 합쳐 한 번에 그린다.
 * 앞면 그림의 인형 스티커는 그림을 받으면 같은 텍스처에 다시 그려 넣는다(그리기 수가 늘지 않는다).
 */
export function CabinetBody(): ReactElement {
  useEffect(
    (): (() => void) =>
      whenStickersLoaded(BODY_STICKER_KIND_IDS, (images): void => repaintBodyDecal(BODY_DECAL_TEXTURE, images)),
    [],
  );

  return (
    <>
      <mesh geometry={CREAM_FRAME} material={PASTEL_MATERIALS.cream} />
      <mesh geometry={TRIM_BAND} material={PASTEL_MATERIALS.butter} position={TRIM_CENTER} />
      <mesh geometry={LOWER_BODY} material={PASTEL_MATERIALS.peach} position={LOWER_BODY_CENTER} />
      <mesh material={DECAL_MATERIAL} position={DECAL_CENTER}>
        <planeGeometry args={[BODY_DECAL_WIDTH, BODY_DECAL_HEIGHT]} />
      </mesh>
      <mesh material={PASTEL_MATERIALS.coral} position={BUTTON_CENTER} rotation-x={Math.PI / 2} scale={BUTTON_SQUASH}>
        <sphereGeometry args={[BUTTON_RADIUS, DOME_SEGMENTS, DOME_RINGS, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={GROUND_SHADOW_MATERIAL} position={GROUND_SHADOW_CENTER} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[GROUND_SHADOW_SIZE, GROUND_SHADOW_SIZE]} />
      </mesh>
    </>
  );
}

/** 기계 바깥 테두리(벽 바깥면)에서 띠와 몸통이 더 나온 폭 */
const BODY_OVERHANG = 0.1;
const BODY_HALF = FLOOR_HALF + WALL_HALF_THICKNESS * 2 + BODY_OVERHANG;
const TRIM_RADIUS = 0.12;
const LOWER_BODY_HEIGHT = 6;
const LOWER_BODY_RADIUS = 0.3;
const ROUNDED_SEGMENTS = 3;
/** 띠 윗면을 바닥 면보다 살짝 내려 겹쳐 깜빡이지 않게 한다 */
const TRIM_DROP = 0.01;
const TRIM_HEIGHT = -FLOOR_BOTTOM_Y - TRIM_DROP;
const TRIM_CENTER: Vector3Tuple = [0, FLOOR_BOTTOM_Y + TRIM_HEIGHT / 2, 0];
const TRIM_BAND = new RoundedBoxGeometry(BODY_HALF * 2, TRIM_HEIGHT, BODY_HALF * 2, ROUNDED_SEGMENTS, TRIM_RADIUS);
const LOWER_BODY_CENTER: Vector3Tuple = [0, FLOOR_BOTTOM_Y - LOWER_BODY_HEIGHT / 2, 0];
const LOWER_BODY = new RoundedBoxGeometry(BODY_HALF * 2, LOWER_BODY_HEIGHT, BODY_HALF * 2, ROUNDED_SEGMENTS, LOWER_BODY_RADIUS);
const LOWER_BODY_BOTTOM_Y = FLOOR_BOTTOM_Y - LOWER_BODY_HEIGHT;

/** 앞면 그림은 몸통 앞면에서 살짝 띄운다 */
const DECAL_LIFT = 0.006;
const DECAL_TOP_Y = LOWER_BODY_CENTER[1] + BODY_DECAL_HEIGHT / 2;
const DECAL_LEFT_X = -BODY_DECAL_WIDTH / 2;
const DECAL_CENTER: Vector3Tuple = [0, LOWER_BODY_CENTER[1], BODY_HALF + DECAL_LIFT];
const BODY_DECAL_TEXTURE = createBodyDecalTexture();
const DECAL_MATERIAL = new MeshStandardMaterial({ map: BODY_DECAL_TEXTURE, transparent: true, roughness: 0.85 });

/** 장식 단추: 앞면 그림의 받침 위에 앉은 납작한 반구 */
const BUTTON_TO_PLATE_RATIO = 0.68;
const BUTTON_RADIUS = BUTTON_PLATE.radius * BUTTON_TO_PLATE_RATIO;
const BUTTON_DEPTH_RATIO = 0.6;
const BUTTON_SQUASH: Vector3Tuple = [1, BUTTON_DEPTH_RATIO, 1];
const BUTTON_CENTER: Vector3Tuple = [DECAL_LEFT_X + BUTTON_PLATE.centerX, DECAL_TOP_Y - BUTTON_PLATE.centerY, BODY_HALF + DECAL_LIFT];
const DOME_SEGMENTS = 20;
const DOME_RINGS = 8;

/** 발치 그림자: 몸통 바닥 바로 아래에 깔아 몸통 둘레로 조금만 비친다 */
const GROUND_SHADOW_SIZE = 8.6;
const GROUND_SHADOW_DROP = 0.005;
const GROUND_SHADOW_FORWARD = 0.25;
const GROUND_SHADOW_OPACITY = 0.6;
const GROUND_SHADOW_CENTER: Vector3Tuple = [0, LOWER_BODY_BOTTOM_Y - GROUND_SHADOW_DROP, GROUND_SHADOW_FORWARD];
const GROUND_SHADOW_MATERIAL = new MeshBasicMaterial({
  map: createGroundShadowTexture(),
  transparent: true,
  opacity: GROUND_SHADOW_OPACITY,
  depthWrite: false,
});

const PILLAR_SEGMENTS = 14;
const TOP_RAIL_RADIUS = 0.1;
const TOP_RAIL_SEGMENTS = 10;
/** 앞쪽 두 기둥 위의 둥근 꼭지 */
const FINIAL_RADIUS = 0.17;
const FINIAL_LIFT = 0.08;
const FINIAL_SEGMENTS = 14;
const FINIAL_RINGS = 10;
const SIDES = [-1, 1] as const;

/** 네 모서리 기둥(바닥~벽 높이), 양옆 유리 위 난간, 앞 기둥 꼭지를 도형 하나로 합친다 */
function buildCreamFrame(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const sideX of SIDES) {
    for (const sideZ of SIDES) {
      const pillar = new CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, WALL_HEIGHT, PILLAR_SEGMENTS);
      parts.push(pillar.translate(sideX * WALL_CENTER_OFFSET, WALL_HEIGHT / 2, sideZ * WALL_CENTER_OFFSET));
    }
    const topRail = new CylinderGeometry(TOP_RAIL_RADIUS, TOP_RAIL_RADIUS, WALL_CENTER_OFFSET * 2, TOP_RAIL_SEGMENTS);
    parts.push(topRail.rotateX(Math.PI / 2).translate(sideX * WALL_CENTER_OFFSET, WALL_HEIGHT, 0));
    const finial = new SphereGeometry(FINIAL_RADIUS, FINIAL_SEGMENTS, FINIAL_RINGS);
    parts.push(finial.translate(sideX * WALL_CENTER_OFFSET, WALL_HEIGHT + FINIAL_LIFT, WALL_CENTER_OFFSET));
  }
  return mergeGeometries(parts);
}

const CREAM_FRAME = buildCreamFrame();
