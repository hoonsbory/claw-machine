import { expect, it } from 'vitest';
import { clampLength } from './math';

it('길이가 한계보다 길면 방향은 그대로 두고 길이만 한계로 줄인다', () => {
  const diagonal = clampLength({ x: 1, z: -1 }, 1);
  expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1);
  expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
  expect(diagonal.z).toBeCloseTo(-Math.SQRT1_2);
});
it('길이가 한계 이하면 그대로 돌려준다', () => {
  expect(clampLength({ x: 0.3, z: 0.4 }, 1)).toEqual({ x: 0.3, z: 0.4 });
  expect(clampLength({ x: 0, z: 0 }, 1)).toEqual({ x: 0, z: 0 });
});
