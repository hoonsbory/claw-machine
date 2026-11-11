import { useFrame } from '@react-three/fiber';
import { BallCollider, CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Group, Vector3Tuple } from 'three';
import { DOLL_KINDS } from '../config/dollCatalog';
import { GAME_CONFIG } from '../config/gameConfig';
import type { DollInstance } from '../game/collection';
import { getCabinetLayout } from '../game/dollGeometry';
import { isFirstFall, needsRedrop, pickSpawnPoint, type FallState } from '../game/spawn';
import type { DollCollider, DollKind, Vec3 } from '../game/types';
import { DollModel } from './DollModel';

/** 집게 쪽에서 인형 하나의 물리 몸을 다루는 손잡이 */
export interface DollHandle {
  getPosition(): Vec3;
  /** (target − 지금 위치) × follow 를 속도로 주고, 회전은 줄여서 매달린 채 팽이처럼 돌지 않게 한다 */
  setVelocityToward(target: Vec3, follow: number): void;
  /** 그 자리로 옮기고 멈춘 상태에서 다시 떨어지게 한다. 처음 떨어지는 것으로 다시 친다. */
  respawn(position: Vec3): void;
  /** 처음 떨어지는 중인지. 이때 배출구에 들어간 인형은 뽑은 것이 아니라 다시 떨어뜨릴 인형이다. */
  isFirstFalling(): boolean;
}

export interface DollProps {
  instance: DollInstance;
  kind: DollKind;
  /** 처음 놓일 자리. 처음 그릴 때만 읽는다. */
  spawnAt: Vec3;
  isVanishing: boolean;
  onVanished: (id: string) => void;
  register: (id: string, handle: DollHandle | null) => void;
}

/** 인형 하나: 강체 하나에 종류별 충돌 도형과 모양을 같은 배율로 붙인다 */
export function Doll({ instance, kind, spawnAt, isVanishing, onVanished, register }: DollProps): ReactElement {
  const bodyRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<Group>(null);
  const vanishElapsed = useRef(0);
  const hasReportedVanish = useRef(false);
  const fall = useRef<FallState>({ sinceSpawn: 0, hasSettled: false });
  const [initialPosition] = useState((): Vector3Tuple => [spawnAt.x, spawnAt.y, spawnAt.z]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body === null) return;

    const handle: DollHandle = {
      getPosition: (): Vec3 => readPosition(body),
      setVelocityToward(target: Vec3, follow: number): void {
        // 집게에 들린 인형은 이미 게임 안에 있다. 배출구에 넣으면 다시 떨어뜨리지 않고 뽑은 것이 된다.
        fall.current.hasSettled = true;
        pullToward(body, target, follow);
      },
      respawn(position: Vec3): void {
        restartFall(fall.current);
        placeAt(body, position);
      },
      isFirstFalling: (): boolean => isFirstFall(fall.current, GAME_CONFIG),
    };
    register(instance.id, handle);
    return (): void => register(instance.id, null);
  }, [instance.id, register]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (body === null) return;

    if (isVanishing) {
      vanishElapsed.current += delta;
      const progress = Math.min(vanishElapsed.current / GAME_CONFIG.dolls.vanishTime, 1);
      modelRef.current?.scale.setScalar(1 - progress);
      if (progress < 1 || hasReportedVanish.current) return;

      hasReportedVanish.current = true;
      onVanished(instance.id);
      return;
    }

    const fallState = fall.current;
    fallState.sinceSpawn += delta;
    if (body.isSleeping()) fallState.hasSettled = true;
    if (!needsRedrop(body.translation(), fallState, CABINET_LAYOUT, GAME_CONFIG)) return;

    restartFall(fallState);
    placeAt(body, pickSpawnPoint(RESPAWN_INDEX, CABINET_LAYOUT, GAME_CONFIG, Math.random));
  });

  const { doll } = GAME_CONFIG.physics;
  return (
    <RigidBody
      ref={bodyRef}
      position={initialPosition}
      colliders={false}
      linearDamping={doll.linearDamping}
      angularDamping={doll.angularDamping}
    >
      {kind.colliders.map((collider, index) => (
        <ScaledCollider key={index} collider={collider} scale={kind.scale} />
      ))}
      <group ref={modelRef}>
        <DollModel kind={kind} />
      </group>
    </RigidBody>
  );
}

const CABINET_LAYOUT = getCabinetLayout(DOLL_KINDS, GAME_CONFIG);
/** 다시 떨어뜨리는 인형은 처음 넣는 인형 전부보다 한 칸 위에서 떨어져, 쌓인 인형 속에 끼지 않는다 */
const RESPAWN_INDEX = DOLL_KINDS.length * GAME_CONFIG.dolls.perKind;
const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

interface ScaledColliderProps {
  collider: DollCollider;
  scale: number;
}

/** 충돌체는 부모의 배율을 믿을 수 없어서 치수와 위치에 배율을 직접 곱한다 */
function ScaledCollider({ collider, scale }: ScaledColliderProps): ReactElement {
  const [x, y, z] = collider.offset;
  const position: Vector3Tuple = [x * scale, y * scale, z * scale];
  const { friction, restitution } = GAME_CONFIG.physics.doll;

  if (collider.shape === 'ball') {
    return <BallCollider args={[collider.radius * scale]} position={position} friction={friction} restitution={restitution} />;
  }
  return (
    <CapsuleCollider
      args={[collider.halfHeight * scale, collider.radius * scale]}
      position={position}
      friction={friction}
      restitution={restitution}
    />
  );
}

/** 다시 떨어뜨릴 때 처음 떨어지기를 새로 시작한다 */
function restartFall(fallState: FallState): void {
  fallState.sinceSpawn = 0;
  fallState.hasSettled = false;
}

/** 속도와 회전을 없애고 그 자리로 옮긴다 */
function placeAt(body: RapierRigidBody, position: Vec3): void {
  body.setTranslation(position, true);
  body.setLinvel(ZERO, true);
  body.setAngvel(ZERO, true);
}

function readPosition(body: RapierRigidBody): Vec3 {
  const { x, y, z } = body.translation();
  return { x, y, z };
}

/** (target − 지금 위치) × follow 를 속도로 주고, 회전 속도는 매번 줄여 매달린 채 팽이처럼 돌지 않게 한다 */
function pullToward(body: RapierRigidBody, target: Vec3, follow: number): void {
  const position = body.translation();
  body.setLinvel(
    { x: (target.x - position.x) * follow, y: (target.y - position.y) * follow, z: (target.z - position.z) * follow },
    true,
  );
  const spin = body.angvel();
  const damping = GAME_CONFIG.grab.holdSpinDamping;
  body.setAngvel({ x: spin.x * damping, y: spin.y * damping, z: spin.z * damping }, true);
}
