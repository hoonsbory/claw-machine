import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactElement, type RefObject } from 'react';
import { MathUtils, MeshBasicMaterial, Vector3, type Group, type Mesh, type Vector3Tuple } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { DESIGN_TOKENS } from '../theme/tokens';
import { PASTEL_MATERIALS } from './pastelMaterials';
import type { ClawView } from './useClawLoop';

export interface ClawProps {
  view: RefObject<ClawView>;
  /** 가장 큰 인형의 몸통 반지름(scale 적용 뒤). 손가락 길이와 벌린 폭을 여기에 맞춘다. */
  maxCoreRadius: number;
  showGuide: boolean;
}

/**
 * 집게: 위쪽 레일과 받침, 줄, 몸통과 손가락 셋, 대기 중 바닥 위치 안내선. 모양만 있고 충돌체는 없다.
 * 회색 금속 대신 버터색 레일, 크림색 받침, 갈색 줄, 산호색 둥근 몸통, 끝이 둥근 금색 손가락이다.
 * 크기와 움직임(손가락 길이·벌림 각도·흔들림)은 모양을 바꾸기 전과 같다.
 */
export function Claw({ view, maxCoreRadius, showGuide }: ClawProps): ReactElement {
  const prongShape = useMemo((): ProngShape => getProngShape(maxCoreRadius), [maxCoreRadius]);

  return (
    <>
      <Gantry view={view} />
      <Cable view={view} />
      <ClawHead view={view} prongShape={prongShape} />
      <PositionGuide view={view} isEnabled={showGuide} />
    </>
  );
}

interface ViewProps {
  view: RefObject<ClawView>;
}

/** 가로 레일은 집게와 함께 앞뒤로, 받침은 레일 위를 좌우로 움직인다. 둘 다 흔들리지 않는 실제 위치를 따른다. */
function Gantry({ view }: ViewProps): ReactElement {
  const railRef = useRef<Mesh>(null);
  const carriageRef = useRef<Mesh>(null);

  useFrame((): void => {
    const { x, z } = view.current;
    railRef.current?.position.set(0, RAIL_Y, z);
    carriageRef.current?.position.set(x, CARRIAGE_Y, z);
  });

  return (
    <>
      <mesh ref={railRef} material={PASTEL_MATERIALS.butter} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[RAIL_RADIUS, RAIL_RADIUS, RAIL_LENGTH, RAIL_SEGMENTS]} />
      </mesh>
      <mesh ref={carriageRef} material={PASTEL_MATERIALS.cream} geometry={CARRIAGE_GEOMETRY} />
    </>
  );
}

/** 받침에서 흔들리는 집게 몸통 윗면까지 곧게 이은 줄 */
function Cable({ view }: ViewProps): ReactElement {
  const cableRef = useRef<Mesh>(null);

  useFrame((): void => {
    const cable = cableRef.current;
    if (cable === null) return;

    const { x, z, shownX, shownZ, hubY } = view.current;
    stretchBetween(cable, cableTop.set(x, CARRIAGE_Y, z), cableBottom.set(shownX, hubY + HUB_HEIGHT / 2, shownZ));
  });

  return (
    <mesh ref={cableRef} material={PASTEL_MATERIALS.line}>
      <cylinderGeometry args={[CABLE_RADIUS, CABLE_RADIUS, 1, CABLE_SEGMENTS]} />
    </mesh>
  );
}

interface ClawHeadProps extends ViewProps {
  prongShape: ProngShape;
}

/** 몸통과 손가락 셋. 보이는 위치에 그리고, 흔들릴 때는 윗면이 줄을 따라 받침 쪽으로 살짝 기운다. */
function ClawHead({ view, prongShape }: ClawHeadProps): ReactElement {
  const headRef = useRef<Group>(null);
  const prongRefs = useRef<(Group | null)[]>([]);

  useFrame((): void => {
    const head = headRef.current;
    if (head === null) return;

    const { x, z, shownX, shownZ, hubY, closeAmount, isHolding } = view.current;
    head.position.set(shownX, hubY, shownZ);
    head.rotation.set((z - shownZ) * SWAY_TILT, 0, (shownX - x) * SWAY_TILT);

    // 인형을 쥐고 있으면 인형 몸통에 막혀 덜 오므린다
    const closedAngle = isHolding ? PRONG_HOLDING_ANGLE : PRONG_CLOSED_ANGLE;
    const prongAngle = MathUtils.lerp(prongShape.openAngle, closedAngle, closeAmount);
    for (const prong of prongRefs.current) {
      if (prong !== null) prong.rotation.z = prongAngle;
    }
  });

  return (
    <group ref={headRef}>
      {/* 몸통: 아랫면 반지름 HUB_BOTTOM_RADIUS, 높이 HUB_HEIGHT 인 둥근 지붕. 줄은 꼭대기(HUB_HEIGHT / 2)에 닿는다. */}
      <mesh material={PASTEL_MATERIALS.coral} position-y={-HUB_HEIGHT / 2} scale-y={HUB_HEIGHT / HUB_BOTTOM_RADIUS} castShadow>
        <sphereGeometry args={[HUB_BOTTOM_RADIUS, HUB_SEGMENTS, HUB_RINGS, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={PASTEL_MATERIALS.butter} position-y={-HUB_HEIGHT / 2} rotation-x={Math.PI / 2}>
        <torusGeometry args={[HUB_BOTTOM_RADIUS, HUB_RIM_THICKNESS, HUB_RIM_TUBE_SEGMENTS, HUB_SEGMENTS]} />
      </mesh>
      {PRONG_YAWS.map((yaw, index) => (
        <group key={index} rotation-y={yaw}>
          {/* 손가락은 몸통 가장자리에 달려 z축으로 돌며 벌어지고 오므린다. 끝마디는 안쪽을 향한다. */}
          <group
            ref={(prong): void => {
              prongRefs.current[index] = prong;
            }}
            position-x={PRONG_MOUNT_RADIUS}
          >
            <mesh material={PASTEL_MATERIALS.gold} position-y={-prongShape.length / 2} castShadow>
              <capsuleGeometry args={[PRONG_RADIUS, prongShape.length - PRONG_THICKNESS, CAPSULE_CAP_SEGMENTS, CAPSULE_RADIAL_SEGMENTS]} />
            </mesh>
            <mesh material={PASTEL_MATERIALS.gold} position={[-TIP_INSET, -prongShape.length, 0]} rotation-z={Math.PI / 2} castShadow>
              <capsuleGeometry args={[PRONG_RADIUS, TIP_LENGTH - PRONG_THICKNESS, CAPSULE_CAP_SEGMENTS, CAPSULE_RADIAL_SEGMENTS]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

interface PositionGuideProps extends ViewProps {
  isEnabled: boolean;
}

/** 집게 실제 위치 바로 아래 바닥 고리와 세로 선. 대기 중에만 보인다. */
function PositionGuide({ view, isEnabled }: PositionGuideProps): ReactElement {
  const guideRef = useRef<Group>(null);
  const beamRef = useRef<Mesh>(null);

  useFrame((): void => {
    const guide = guideRef.current;
    const beam = beamRef.current;
    if (guide === null || beam === null) return;

    const { x, z, hubY, phase } = view.current;
    guide.visible = isEnabled && phase === 'idle';
    guide.position.set(x, 0, z);
    beam.scale.y = hubY;
    beam.position.y = hubY / 2;
  });

  return (
    <group ref={guideRef}>
      <mesh material={GUIDE} position-y={GUIDE_RING_Y} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[GUIDE_RING_INNER_RADIUS, GUIDE_RING_OUTER_RADIUS, GUIDE_RING_SEGMENTS]} />
      </mesh>
      <mesh ref={beamRef} material={GUIDE}>
        <cylinderGeometry args={[GUIDE_BEAM_RADIUS, GUIDE_BEAM_RADIUS, 1, GUIDE_BEAM_SEGMENTS]} />
      </mesh>
    </group>
  );
}

interface ProngShape {
  length: number;
  /** 다 벌렸을 때 손가락이 수직에서 바깥으로 기운 각도(라디안) */
  openAngle: number;
}

/** 손가락 길이와 벌린 각도를 가장 큰 인형 몸통에 맞춘다. 다 벌리면 손끝이 그 몸통보다 여유 있게 바깥에 온다. */
function getProngShape(maxCoreRadius: number): ProngShape {
  const length = maxCoreRadius * PRONG_LENGTH_PER_CORE_RADIUS;
  const openReach = maxCoreRadius * OPEN_REACH_PER_CORE_RADIUS;
  const openAngle = Math.asin(MathUtils.clamp((openReach - PRONG_MOUNT_RADIUS) / length, 0, 1));
  return { length, openAngle };
}

/** 높이 1인 원기둥을 두 점 사이에 걸치도록 옮기고 늘이고 돌린다 */
function stretchBetween(mesh: Mesh, from: Vector3, to: Vector3): void {
  const direction = scratchDirection.subVectors(to, from);
  mesh.position.lerpVectors(from, to, MIDPOINT);
  mesh.scale.set(1, direction.length(), 1);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
}

/** 매 프레임 새로 만들지 않으려고 같이 쓰는 계산용 벡터 */
const cableTop = new Vector3();
const cableBottom = new Vector3();
const scratchDirection = new Vector3();
const UP = new Vector3(0, 1, 0);
const MIDPOINT = 0.5;

const GUIDE_OPACITY = 0.8;
const GUIDE = new MeshBasicMaterial({ color: DESIGN_TOKENS.color.coralDeep, transparent: true, opacity: GUIDE_OPACITY });

/** 받침은 기계 벽 윗면보다 이만큼 아래, 레일은 받침보다 이만큼 위에 둔다 */
const CARRIAGE_BELOW_WALL_TOP = 0.4;
const RAIL_ABOVE_CARRIAGE = 0.2;
const CARRIAGE_Y = GAME_CONFIG.cabinet.wallHeight - CARRIAGE_BELOW_WALL_TOP;
const RAIL_Y = CARRIAGE_Y + RAIL_ABOVE_CARRIAGE;
/** 레일은 기계 폭 전체에 걸친 둥근 막대다(예전 상자 레일의 높이 0.12 ~ 깊이 0.2 사이 굵기) */
const RAIL_RADIUS = 0.08;
const RAIL_LENGTH = GAME_CONFIG.cabinet.floorHalf * 2;
const RAIL_SEGMENTS = 12;
/** 받침은 크기는 그대로(0.6 × 0.3 × 0.6) 모서리만 둥글다 */
const CARRIAGE_SIZE: Vector3Tuple = [0.6, 0.3, 0.6];
const CARRIAGE_RADIUS = 0.1;
const CARRIAGE_SEGMENTS = 3;
const CARRIAGE_GEOMETRY = new RoundedBoxGeometry(...CARRIAGE_SIZE, CARRIAGE_SEGMENTS, CARRIAGE_RADIUS);
const CABLE_RADIUS = 0.03;
const CABLE_SEGMENTS = 8;

const HUB_BOTTOM_RADIUS = 0.26;
const HUB_HEIGHT = 0.25;
const HUB_SEGMENTS = 20;
const HUB_RINGS = 8;
/** 몸통 아랫단을 두른 버터색 테두리 */
const HUB_RIM_THICKNESS = 0.035;
const HUB_RIM_TUBE_SEGMENTS = 6;
/** 흔들릴 때 실제 위치와 보이는 위치의 차이 1당 기우는 각도(라디안) */
const SWAY_TILT = 0.9;

const PRONG_COUNT = 3;
const PRONG_YAWS = Array.from({ length: PRONG_COUNT }, (_, index): number => (index * Math.PI * 2) / PRONG_COUNT);
/** 몸통 중심에서 손가락이 달린 곳까지 */
const PRONG_MOUNT_RADIUS = 0.18;
const PRONG_THICKNESS = 0.07;
/** 손가락은 굵기 PRONG_THICKNESS 인 캡슐이라 양 끝이 둥글고, 전체 길이는 예전 상자와 같다 */
const PRONG_RADIUS = PRONG_THICKNESS / 2;
const CAPSULE_CAP_SEGMENTS = 4;
const CAPSULE_RADIAL_SEGMENTS = 8;
/** 손가락 길이 = 가장 큰 인형 몸통 반지름 × 이 값 */
const PRONG_LENGTH_PER_CORE_RADIUS = 1.35;
/** 다 벌린 손끝의 수평 거리 = 가장 큰 인형 몸통 반지름 × 이 값 */
const OPEN_REACH_PER_CORE_RADIUS = 1.15;
const PRONG_CLOSED_ANGLE = 0.1;
const PRONG_HOLDING_ANGLE = 0.32;
const TIP_LENGTH = 0.22;
/** 끝마디 가운데를 손가락보다 안쪽으로 둔 거리 */
const TIP_INSET = 0.08;

/** 바닥과 겹쳐 깜빡이지 않게 고리를 살짝 띄운다 */
const GUIDE_RING_Y = 0.03;
const GUIDE_RING_INNER_RADIUS = 0.47;
const GUIDE_RING_OUTER_RADIUS = 0.64;
const GUIDE_RING_SEGMENTS = 32;
const GUIDE_BEAM_RADIUS = 0.02;
const GUIDE_BEAM_SEGMENTS = 6;
