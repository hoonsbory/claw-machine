import type { GameConfig } from '../config/gameConfig';
import { getDollMetrics, getGrabTuning } from './dollGeometry';
import { clamp } from './math';
import type { DollKind, DollLookup, DollMetrics, DollSnapshot, GrabTuning, HeldDoll, Vec2 } from './types';

/** 끝까지 들고 가는 인형의 놓치는 시점 */
const HOLDS_TO_END = Infinity;

interface KindEntry {
  metrics: DollMetrics;
  tuning: GrabTuning;
}

interface GrabInput {
  claw: Vec2;
  /** 집게 중심 높이 */
  hubY: number;
  dolls: readonly DollSnapshot[];
  /** 연속으로 실패한 횟수 */
  failStreak: number;
  lookup: DollLookup;
  config: GameConfig;
  /** 0 이상 1 미만 난수 */
  rng: () => number;
}

interface GrabTarget {
  doll: DollSnapshot;
  distance: number;
  metrics: DollMetrics;
}

/** 종류별 치수와 난이도를 미리 계산해 두고 종류 id로 찾는다. 카탈로그에 없는 id는 코드 실수이므로 바로 던진다. */
export function createDollLookup(kinds: readonly DollKind[], config: GameConfig): DollLookup {
  const entries = new Map(
    kinds.map((kind): [string, KindEntry] => [kind.id, { metrics: getDollMetrics(kind, config), tuning: getGrabTuning(kind, config) }]),
  );

  const entryOf = (kindId: string): KindEntry => {
    const entry = entries.get(kindId);
    if (entry === undefined) throw new Error(`카탈로그에 없는 인형 종류: ${kindId}`);
    return entry;
  };

  return {
    metricsOf: (kindId: string): DollMetrics => entryOf(kindId).metrics,
    tuningOf: (kindId: string): GrabTuning => entryOf(kindId).tuning,
  };
}

function getHorizontalDistance(from: Vec2, to: Vec2): number {
  return Math.hypot(to.x - from.x, to.z - from.z);
}

/** 집게 아래를 막는 인형 중 가장 높은 것 위에서 멈춘다. 바닥 근처보다 낮게 내려가지는 않는다. */
export function findStopHeight(claw: Vec2, dolls: readonly DollSnapshot[], lookup: DollLookup, config: GameConfig): number {
  return dolls.reduce((highest, doll) => {
    const metrics = lookup.metricsOf(doll.kindId);
    const isBlocking = getHorizontalDistance(claw, doll) <= metrics.blockRadius;
    if (!isBlocking) return highest;
    return Math.max(highest, doll.y + metrics.stopOffset);
  }, config.claw.hubMinY);
}

/** 닿는 범위 안이고 집게가 감쌀 수 있는 높이(매달릴 위치 + 몸통 반지름)보다 낮은 인형 중 가장 가까운 것 */
function findGrabTarget(claw: Vec2, hubY: number, dolls: readonly DollSnapshot[], lookup: DollLookup): GrabTarget | null {
  let nearest: GrabTarget | null = null;

  for (const doll of dolls) {
    const metrics = lookup.metricsOf(doll.kindId);
    const distance = getHorizontalDistance(claw, doll);
    const isInReach = distance < metrics.reachRadius;
    const isBelowClaw = doll.y < hubY - metrics.holdOffset + metrics.coreRadius;
    const isCloserThanNearest = nearest === null || distance < nearest.distance;
    if (isInReach && isBelowClaw && isCloserThanNearest) nearest = { doll, distance, metrics };
  }

  return nearest;
}

/** 잘 잡을수록(quality가 클수록), 집게 힘이 셀수록 끝까지 들 확률이 커진다 */
function getHoldChance(grip: number, quality: number, config: GameConfig): number {
  const { holdChanceScale, holdChanceBase } = config.grab;
  return clamp(grip * holdChanceScale * (holdChanceBase + (1 - holdChanceBase) * quality), 0, 1);
}

/**
 * 오므리는 순간 무엇을 잡고 언제 놓칠지 정한다.
 * rng는 보정으로 결과가 정해지지 않을 때만 쓴다: 첫 값으로 끝까지 들지 정하고, 놓치면 두 번째 값으로 놓칠 시점을 정한다.
 */
export function decideGrab({ claw, hubY, dolls, failStreak, lookup, config, rng }: GrabInput): HeldDoll | null {
  const target = findGrabTarget(claw, hubY, dolls, lookup);
  if (target === null) return null;

  const { pityAfterFails, pityMinQuality, slipMinTime, slipMaxTime } = config.grab;
  const quality = 1 - target.distance / target.metrics.reachRadius;
  const holdUntil = (slipAt: number): HeldDoll => ({ dollId: target.doll.id, kindId: target.doll.kindId, slipAt, heldTime: 0 });

  const isPityGrab = failStreak >= pityAfterFails && quality >= pityMinQuality;
  if (isPityGrab) return holdUntil(HOLDS_TO_END);

  const holdChance = getHoldChance(lookup.tuningOf(target.doll.kindId).grip, quality, config);
  if (rng() < holdChance) return holdUntil(HOLDS_TO_END);

  return holdUntil(slipMinTime + rng() * (slipMaxTime - slipMinTime));
}
