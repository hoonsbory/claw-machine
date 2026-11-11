import { describe, expect, it } from 'vitest';
import { createMoveInputState } from './moveInputState';

const CENTER = { x: 0, z: 0 };

describe('조이스틱·키보드 입력', () => {
  it('조이스틱과 방향키를 더하고 길이는 1을 넘지 않는다', () => {
    const input = createMoveInputState();
    input.setStick({ x: 0, z: -1 });
    input.keyDown('ArrowRight', false);

    const move = input.readMove();
    expect(Math.hypot(move.x, move.z)).toBeCloseTo(1);
    expect(move.x).toBeGreaterThan(0);
    expect(move.z).toBeLessThan(0);
  });

  it('스페이스는 한 번만 내리기를 요청하고 기본 동작을 막으라고 알린다. 누르고 있는 반복 입력은 요청하지 않는다', () => {
    const input = createMoveInputState();
    expect(input.keyDown('Space', false)).toBe(true);
    expect(input.takeDropRequest()).toBe(true);
    expect(input.takeDropRequest()).toBe(false);

    expect(input.keyDown('Space', true)).toBe(true);
    expect(input.takeDropRequest()).toBe(false);
    expect(input.keyDown('ArrowLeft', false)).toBe(false);
  });

  it('막히는 순간 조이스틱·눌린 키·내리기 요청을 비운다', () => {
    const input = createMoveInputState();
    input.setStick({ x: 0.5, z: 0 });
    input.keyDown('ArrowUp', false);
    input.requestDrop();

    input.setBlocked(true);
    input.setBlocked(false);
    expect(input.readMove()).toEqual(CENTER);
    expect(input.takeDropRequest()).toBe(false);
  });

  it('막힌 동안 조이스틱·내리기·키 누름은 무시하고 브라우저 기본 동작도 막지 않는다', () => {
    const input = createMoveInputState();
    input.setBlocked(true);

    input.setStick({ x: 1, z: 0 });
    input.requestDrop();
    expect(input.keyDown('ArrowLeft', false)).toBe(false);
    expect(input.keyDown('Space', false)).toBe(false);
    expect(input.readMove()).toEqual(CENTER);
    expect(input.takeDropRequest()).toBe(false);

    input.setBlocked(false);
    expect(input.readMove()).toEqual(CENTER);
    expect(input.takeDropRequest()).toBe(false);
  });

  it('막힌 동안에도 키 뗌은 처리해, 풀린 뒤 뗀 키가 눌린 채로 남지 않는다', () => {
    const input = createMoveInputState();
    input.keyDown('ArrowRight', false);
    input.setBlocked(true);
    input.keyUp('ArrowRight');
    input.setBlocked(false);
    expect(input.readMove()).toEqual(CENTER);
  });

  it('풀린 뒤에도 계속 누르고 있는 키는 반복 입력으로 다시 잡힌다', () => {
    const input = createMoveInputState();
    input.keyDown('ArrowRight', false);
    input.setBlocked(true);
    input.setBlocked(false);

    input.keyDown('ArrowRight', true);
    expect(input.readMove()).toEqual({ x: 1, z: 0 });
    input.keyUp('ArrowRight');
    expect(input.readMove()).toEqual(CENTER);
  });

  it('창을 떠나면 눌린 키를 모두 놓는다', () => {
    const input = createMoveInputState();
    input.keyDown('ArrowDown', false);
    input.releaseAllKeys();
    expect(input.readMove()).toEqual(CENTER);
  });
});
