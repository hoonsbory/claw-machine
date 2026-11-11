import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { ReactElement } from 'react';
import { MeshBasicMaterial, MeshStandardMaterial, type Material, type Vector3Tuple } from 'three';
import { GAME_CONFIG } from '../config/gameConfig';
import { DESIGN_TOKENS } from '../theme/tokens';
import { CabinetBody } from './cabinet/CabinetBody';
import {
  CABINET_LAYOUT,
  CHUTE_WALL_HEIGHT,
  FLOOR_HALF,
  FLOOR_HALF_THICKNESS,
  PARTITION_HALF_THICKNESS,
  WALL_HALF_THICKNESS,
  WALL_HEIGHT,
} from './cabinet/cabinetDimensions';
import { Marquee } from './cabinet/Marquee';
import { createChuteTexture, createFloorTexture, createSkyWallTexture } from './cabinet/playSpaceTextures';

/**
 * 기계: 바닥·네 벽·배출구 칸막이 두 장은 고정 충돌체다. 보이는 것은 구름 하늘 뒷벽, 점무늬 민트 바닥, 투명한 옆 유리,
 * 반투명 복숭아색 칸막이, 크림 테두리의 갈색 배출구, 그리고 모양만 있는 몸체(CabinetBody)와 머리 장식(Marquee)이다.
 */
export function Cabinet(): ReactElement {
  const { friction, restitution } = GAME_CONFIG.physics.wall;

  return (
    <>
      <RigidBody type="fixed">
        {SLABS.map((slab) => (
          <CuboidCollider key={slab.name} args={slab.half} position={slab.center} friction={friction} restitution={restitution} />
        ))}
      </RigidBody>
      {SLABS.map((slab) => {
        if (slab.look === null) return null;
        return (
          <mesh key={slab.name} position={slab.center} material={LOOKS[slab.look]} receiveShadow>
            <boxGeometry args={[slab.half[0] * 2, slab.half[1] * 2, slab.half[2] * 2]} />
          </mesh>
        );
      })}
      <mesh rotation-x={-Math.PI / 2} material={FLOOR_MATERIAL} receiveShadow>
        <planeGeometry args={[FLOOR_HALF * 2, FLOOR_HALF * 2]} />
      </mesh>
      <mesh position={CHUTE_FLOOR_CENTER} rotation-x={-Math.PI / 2} material={CHUTE_MATERIAL} receiveShadow>
        <planeGeometry args={[chuteSize, chuteSize]} />
      </mesh>
      <CabinetBody />
      <Marquee />
    </>
  );
}

type SlabLook = 'backWall' | 'glass' | 'acrylic';

/** 충돌체와 모양을 함께 만드는 상자 하나. look 이 null 이면 보이지 않는다(바닥 판은 버터색 띠와 민트 바닥 면이 대신 보인다). */
interface Slab {
  name: string;
  center: Vector3Tuple;
  half: Vector3Tuple;
  look: SlabLook | null;
}

const { color } = DESIGN_TOKENS;
const GLASS_OPACITY = 0.14;
const ACRYLIC_OPACITY = 0.55;
const MATTE_ROUGHNESS = 0.9;

const LOOKS: Record<SlabLook, Material> = {
  // 뒷벽은 그려 둔 하늘 배경막이라 조명에 물들지 않고 제 색으로 보인다
  backWall: new MeshBasicMaterial({ map: createSkyWallTexture() }),
  glass: new MeshStandardMaterial({ color: color.cream, transparent: true, opacity: GLASS_OPACITY }),
  acrylic: new MeshStandardMaterial({ color: color.peach, transparent: true, opacity: ACRYLIC_OPACITY }),
};
const FLOOR_MATERIAL = new MeshStandardMaterial({ map: createFloorTexture(), roughness: MATTE_ROUGHNESS });
const CHUTE_MATERIAL = new MeshStandardMaterial({ map: createChuteTexture(), roughness: MATTE_ROUGHNESS });

/** 배출구 바닥이 기계 바닥과 겹쳐 깜빡이지 않도록 살짝 띄운다 */
const CHUTE_FLOOR_LIFT = 0.01;

const { chuteSize, chuteMinX, chuteMaxX, chuteMinZ, chuteMaxZ } = CABINET_LAYOUT;
const wallHalfHeight = WALL_HEIGHT / 2;
const wallOffset = FLOOR_HALF + WALL_HALF_THICKNESS;
const partitionHalfHeight = CHUTE_WALL_HEIGHT / 2;
const chuteCenterX = (chuteMinX + chuteMaxX) / 2;
const chuteCenterZ = (chuteMinZ + chuteMaxZ) / 2;

const SLABS: readonly Slab[] = [
  { name: 'floor', center: [0, -FLOOR_HALF_THICKNESS, 0], half: [FLOOR_HALF, FLOOR_HALF_THICKNESS, FLOOR_HALF], look: null },
  { name: 'back', center: [0, wallHalfHeight, -wallOffset], half: [FLOOR_HALF, wallHalfHeight, WALL_HALF_THICKNESS], look: 'backWall' },
  { name: 'front', center: [0, wallHalfHeight, wallOffset], half: [FLOOR_HALF, wallHalfHeight, WALL_HALF_THICKNESS], look: null },
  { name: 'left', center: [-wallOffset, wallHalfHeight, 0], half: [WALL_HALF_THICKNESS, wallHalfHeight, FLOOR_HALF], look: 'glass' },
  { name: 'right', center: [wallOffset, wallHalfHeight, 0], half: [WALL_HALF_THICKNESS, wallHalfHeight, FLOOR_HALF], look: 'glass' },
  {
    name: 'chuteSide',
    center: [chuteMaxX, partitionHalfHeight, chuteCenterZ],
    half: [PARTITION_HALF_THICKNESS, partitionHalfHeight, (chuteMaxZ - chuteMinZ) / 2],
    look: 'acrylic',
  },
  {
    name: 'chuteBack',
    center: [chuteCenterX, partitionHalfHeight, chuteMinZ],
    half: [(chuteMaxX - chuteMinX) / 2, partitionHalfHeight, PARTITION_HALF_THICKNESS],
    look: 'acrylic',
  },
];

const CHUTE_FLOOR_CENTER: Vector3Tuple = [chuteCenterX, CHUTE_FLOOR_LIFT, chuteCenterZ];
