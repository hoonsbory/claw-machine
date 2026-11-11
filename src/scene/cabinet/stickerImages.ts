import { getStickerUrl } from '../../config/stickers';
import type { StickerImages } from './bodyTextures';

/**
 * 종류마다 스티커 그림(public/stickers/<id>.png)을 한 번씩 읽고, 모두 끝나면 읽은 그림만 모아 onLoaded 를 한 번 부른다.
 * 받지 못한 그림(없는 파일, 깨진 파일)은 빼고 넘기며 다시 받으려 하지 않는다. 하나도 받지 못하면 부르지 않는다.
 * 돌려준 함수를 부르면 나중에 끝나도 알리지 않는다.
 */
export function whenStickersLoaded(kindIds: readonly string[], onLoaded: (images: StickerImages) => void): () => void {
  let isStopped = false;
  const uniqueIds = [...new Set(kindIds)];

  void Promise.all(uniqueIds.map(loadSticker)).then((entries): void => {
    if (isStopped) return;
    const images = new Map(entries.filter((entry): entry is LoadedSticker => entry !== null));
    if (images.size === 0) return;
    onLoaded(images);
  });

  return (): void => {
    isStopped = true;
  };
}

type LoadedSticker = [string, HTMLImageElement];

async function loadSticker(kindId: string): Promise<LoadedSticker | null> {
  const image = new Image();
  image.src = getStickerUrl(kindId);
  try {
    await image.decode();
    return [kindId, image];
  } catch {
    return null;
  }
}
