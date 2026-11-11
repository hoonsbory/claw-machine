import { expect, it } from 'vitest';
import { isChargeRoute, removeHash } from './chargeRoute';

it('주소 해시가 정확히 #charge 일 때만 충전 페이지다', () => {
  expect(isChargeRoute('#charge')).toBe(true);
  for (const hash of ['', '#', '#charge2', '#/charge', '#Charge']) {
    expect(isChargeRoute(hash), hash).toBe(false);
  }
});

it('주소에서 해시만 떼고 경로와 쿼리는 그대로 둔다', () => {
  expect(removeHash('https://example.com/sub/#charge')).toBe('https://example.com/sub/');
  expect(removeHash('https://example.com/sub/?debug#charge')).toBe('https://example.com/sub/?debug');
  expect(removeHash('https://example.com/sub/#')).toBe('https://example.com/sub/');
  expect(removeHash('https://example.com/')).toBe('https://example.com/');
});
