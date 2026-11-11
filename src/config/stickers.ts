import type { DollKind } from '../game/types';
import { DOLL_KINDS } from './dollCatalog';
import { resolvePublicUrl } from './publicUrl';

/** 종류 하나의 스티커 그림 주소. 그림은 public/stickers/<id>.png 이고 tools/stickers.html 로 만든다(docs/dolls.md). */
export function getStickerUrl(kindId: string): string {
  return resolvePublicUrl(`stickers/${kindId}.png`);
}

/**
 * 장식 자리 번호(0부터)에 붙일 종류 id. 카탈로그 순서대로 돌아가며 고르므로, 자리를 종류 수만큼 이상 두면 모든 종류가 한 번씩은 나온다.
 * 종류를 바꿔도 장식 코드는 고치지 않는다.
 */
export function getStickerKindId(slot: number, kinds: readonly DollKind[] = DOLL_KINDS): string {
  return kinds[slot % kinds.length].id;
}
