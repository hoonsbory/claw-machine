import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { ReactElement } from 'react';
import type { Vector3Tuple } from 'three';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import { getCabinetLayout } from '../game/dollGeometry';

/** 기계: 바닥·네 벽·배출구 칸막이 두 장은 고정 충돌체, 배출구 바닥과 받침대는 모양만 있다 */
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
          <mesh key={slab.name} position={slab.center} receiveShadow>
            <boxGeometry args={[slab.half[0] * 2, slab.half[1] * 2, slab.half[2] * 2]} />
            <meshStandardMaterial {...LOOKS[slab.look]} />
          </mesh>
        );
      })}
      <mesh position={CHUTE_FLOOR_CENTER} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[chuteSize, chuteSize]} />
        <meshStandardMaterial color={CHUTE_FLOOR_COLOR} />
      </mesh>
      <mesh position={BASE_CENTER}>
        <boxGeometry args={BASE_SIZE} />
        <meshStandardMaterial color={BASE_COLOR} />
      </mesh>
    </>
  );
}

type SlabLook = 'floor' | 'backWall' | 'glass' | 'acrylic';

/** 충돌체와 모양을 함께 만드는 상자 하나. look 이 null 이면 보이지 않는다. */
interface Slab {
  name: string;
  center: Vector3Tuple;
  half: Vector3Tuple;
  look: SlabLook | null;
}

interface SlabMaterial {
  color: string;
  transparent?: boolean;
  opacity?: number;
}

const LOOKS: Record<SlabLook, SlabMaterial> = {
  floor: { color: '#fff3f8' },
  backWall: { color: '#ffb3d1' },
  glass: { color: '#ffffff', transparent: true, opacity: 0.12 },
  acrylic: { color: '#ff7fb0', transparent: true, opacity: 0.45 },
};
const CHUTE_FLOOR_COLOR = '#7a2f55';
const BASE_COLOR = '#ff6fa5';

const FLOOR_HALF_THICKNESS = 0.5;
const WALL_HALF_THICKNESS = 0.1;
const PARTITION_HALF_THICKNESS = 0.06;
/** 배출구 바닥이 기계 바닥과 겹쳐 깜빡이지 않도록 살짝 띄운다 */
const CHUTE_FLOOR_LIFT = 0.01;
const BASE_HEIGHT = 6;
const BASE_OVERHANG = 0.3;

const { floorHalf, wallHeight, chuteWallHeight } = GAME_CONFIG.cabinet;
const { chuteSize, chuteMinX, chuteMaxX, chuteMinZ, chuteMaxZ } = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
const wallHalfHeight = wallHeight / 2;
const wallOffset = floorHalf + WALL_HALF_THICKNESS;
const partitionHalfHeight = chuteWallHeight / 2;
const chuteCenterX = (chuteMinX + chuteMaxX) / 2;
const chuteCenterZ = (chuteMinZ + chuteMaxZ) / 2;

const SLABS: readonly Slab[] = [
  { name: 'floor', center: [0, -FLOOR_HALF_THICKNESS, 0], half: [floorHalf, FLOOR_HALF_THICKNESS, floorHalf], look: 'floor' },
  { name: 'back', center: [0, wallHalfHeight, -wallOffset], half: [floorHalf, wallHalfHeight, WALL_HALF_THICKNESS], look: 'backWall' },
  { name: 'front', center: [0, wallHalfHeight, wallOffset], half: [floorHalf, wallHalfHeight, WALL_HALF_THICKNESS], look: null },
  { name: 'left', center: [-wallOffset, wallHalfHeight, 0], half: [WALL_HALF_THICKNESS, wallHalfHeight, floorHalf], look: 'glass' },
  { name: 'right', center: [wallOffset, wallHalfHeight, 0], half: [WALL_HALF_THICKNESS, wallHalfHeight, floorHalf], look: 'glass' },
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
const BASE_SIZE: Vector3Tuple = [(floorHalf + BASE_OVERHANG) * 2, BASE_HEIGHT, (floorHalf + BASE_OVERHANG) * 2];
const BASE_CENTER: Vector3Tuple = [0, -FLOOR_HALF_THICKNESS * 2 - BASE_HEIGHT / 2, 0];
