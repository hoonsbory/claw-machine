import { expect, it } from 'vitest';
import { DOLL_KINDS } from '../config/dollCatalog';
import { applyWin, createInstances } from './collection';

it('종류당 3개씩 15개를 만든다', () => {
  expect(createInstances(DOLL_KINDS, 3, new Set())).toHaveLength(15);
});
it('이미 뽑은 종류는 만들지 않는다', () => {
  const list = createInstances(DOLL_KINDS, 3, new Set(['bear']));
  expect(list).toHaveLength(12);
  expect(list.some((d) => d.kindId === 'bear')).toBe(false);
});
it('한 종류를 뽑으면 같은 종류가 모두 빠진다', () => {
  const all = createInstances(DOLL_KINDS, 3, new Set());
  const result = applyWin(all, new Set(), 'bear-1', 5);
  expect(result?.removedIds.sort()).toEqual(['bear-0', 'bear-1', 'bear-2']);
  expect(result?.remaining).toHaveLength(12);
  expect(result?.isComplete).toBe(false);
});
it('같은 종류가 연달아 들어와도 획득은 한 번이다 (Review Focus 2)', () => {
  const all = createInstances(DOLL_KINDS, 3, new Set());
  const first = applyWin(all, new Set(), 'bear-1', 5);
  expect(applyWin(first!.remaining, first!.wonKindIds, 'bear-2', 5)).toBeNull();
  expect(applyWin(all, new Set(['bear']), 'bear-2', 5)).toBeNull();
});
it('다섯 번째 종류를 뽑으면 완료다', () => {
  const won = new Set(['bear', 'bunny', 'cat', 'chick']);
  expect(applyWin(createInstances(DOLL_KINDS, 3, won), won, 'frog-0', 5)?.isComplete).toBe(true);
});
it('모르는 인형은 무시한다', () => {
  expect(applyWin([], new Set(), 'ghost-0', 5)).toBeNull();
});
it('넘겨받은 목록과 집합은 바꾸지 않고 새로 만들어 돌려준다', () => {
  const all = createInstances(DOLL_KINDS, 3, new Set());
  const won = new Set<string>();
  const result = applyWin(all, won, 'bear-1', 5);
  expect(all).toHaveLength(15);
  expect(won.size).toBe(0);
  expect(result?.remaining).not.toBe(all);
  expect(result?.wonKindIds).not.toBe(won);
  expect(result?.wonKindIds).toEqual(new Set(['bear']));
});
