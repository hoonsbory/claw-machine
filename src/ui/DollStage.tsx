import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, type ReactElement } from 'react';
import type { Group, Vector3Tuple } from 'three';
import type { DollKind } from '../game/types';
import { DollModel } from '../scene/DollModel';

export interface DollStageProps {
  kind: DollKind;
  isReducedMotion: boolean;
}

/**
 * 축하 화면에서 뽑은 인형 하나만 그리는 작은 3D 캔버스. 물리·그림자 없이 조명 둘만 쓴다.
 * 움직임을 줄인 화면에서는 인형을 멈춰 두고 필요할 때만 그린다. 이 컴포넌트가 빠지면 캔버스도 함께 사라진다.
 */
export function DollStage({ kind, isReducedMotion }: DollStageProps): ReactElement {
  return (
    <Canvas flat dpr={[1, MAX_PIXEL_RATIO]} camera={STAGE_CAMERA} frameloop={isReducedMotion ? 'demand' : 'always'}>
      <hemisphereLight args={[SKY_COLOR, GROUND_COLOR, SKY_INTENSITY]} />
      <directionalLight position={SUN_POSITION} intensity={SUN_INTENSITY} />
      <FloatingDoll kind={kind} isReducedMotion={isReducedMotion} />
    </Canvas>
  );
}

/** 아래에서 커지며 떠올라 살짝 위아래로 흔들리며 천천히 돈다. 종류마다 크기가 달라도 같은 크기로 보여 준다. */
function FloatingDoll({ kind, isReducedMotion }: DollStageProps): ReactElement {
  const groupRef = useRef<Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta): void => {
    const group = groupRef.current;
    if (group === null || isReducedMotion) return;

    elapsed.current += delta;
    const time = elapsed.current;
    const rise = easeOutBack(Math.min(time / RISE_TIME, 1));
    group.position.y = RISE_DEPTH * (rise - 1) + Math.sin(time * BOB_SPEED) * BOB_HEIGHT;
    group.scale.setScalar(RISE_START_SCALE + (1 - RISE_START_SCALE) * rise);
    group.rotation.y = REST_TURN + time * SPIN_SPEED;
  });

  return (
    <group ref={groupRef} rotation={[0, REST_TURN, 0]}>
      <group scale={1 / kind.scale} position={[0, -DOLL_CENTER_Y, 0]}>
        <DollModel kind={kind} />
      </group>
    </group>
  );
}

/** 넘치듯 커졌다가 제자리에 닿는 곡선(0→1) */
function easeOutBack(progress: number): number {
  const shifted = progress - 1;
  return 1 + (EASE_OVERSHOOT + 1) * shifted ** 3 + EASE_OVERSHOOT * shifted ** 2;
}

const MAX_PIXEL_RATIO = 2;
const STAGE_CAMERA = { position: [0, 0, 4.2] as Vector3Tuple, fov: 35 };
const SKY_COLOR = '#ffffff';
const GROUND_COLOR = '#ffc4dc';
const SKY_INTENSITY = 1.6;
const SUN_POSITION: Vector3Tuple = [2, 4, 5];
const SUN_INTENSITY = 1.6;
/** 임시 도형(scale 1)의 몸통 아래 끝(-0.5)과 귀 끝(약 1.05) 사이 가운데. 이만큼 내려 화면 가운데에 둔다. */
const DOLL_CENTER_Y = 0.27;
/** 정면에서 살짝 돌려 둔 각도(라디안). 움직임을 줄여도 입체로 보인다. */
const REST_TURN = -0.35;
const RISE_TIME = 0.7;
const RISE_DEPTH = 1.2;
const RISE_START_SCALE = 0.4;
const EASE_OVERSHOOT = 1.7;
const BOB_SPEED = 2.2;
const BOB_HEIGHT = 0.06;
/** 한 바퀴에 약 8초 */
const SPIN_SPEED = 0.8;
