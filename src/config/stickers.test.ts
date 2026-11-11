import { describe, expect, it } from 'vitest';
import { TEST_DOLL_KINDS } from '../game/testFixtures';
import { getDecoUrl, getStickerKindId, getStickerUrl } from './stickers';

describe('스티커 주소', () => {
  it('종류 id 로 public/stickers/<id>.png 주소를 앱 경로 뒤에 만든다', () => {
    expect(getStickerUrl('usagi')).toBe(`${import.meta.env.BASE_URL}stickers/usagi.png`);
  });

  it('장식 그림 파일 이름으로 public/deco/ 주소를 앱 경로 뒤에 만든다', () => {
    expect(getDecoUrl('car-usagi.png')).toBe(`${import.meta.env.BASE_URL}deco/car-usagi.png`);
  });
});

describe('장식 자리에 붙일 종류', () => {
  it('자리 번호 순서대로 카탈로그 종류를 고른다', () => {
    expect(getStickerKindId(0, TEST_DOLL_KINDS)).toBe(TEST_DOLL_KINDS[0].id);
    expect(getStickerKindId(3, TEST_DOLL_KINDS)).toBe(TEST_DOLL_KINDS[3].id);
  });

  it('종류 수를 넘는 자리는 처음부터 다시 돌아가 고르고, 종류 수만큼 자리를 두면 모든 종류가 나온다', () => {
    expect(getStickerKindId(TEST_DOLL_KINDS.length, TEST_DOLL_KINDS)).toBe(TEST_DOLL_KINDS[0].id);
    const slots = Array.from({ length: TEST_DOLL_KINDS.length + 1 }, (_, slot) => getStickerKindId(slot, TEST_DOLL_KINDS));
    expect(new Set(slots)).toEqual(new Set(TEST_DOLL_KINDS.map((kind) => kind.id)));
  });
});
