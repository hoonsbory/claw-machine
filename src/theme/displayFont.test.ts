import { describe, expect, it, vi } from 'vitest';
import { whenDisplayFontReady, type FontSource } from './displayFont';

/** document.fonts 대신 쓰는 가짜. load 가 돌려줄 결과를 차례로 정하고, 글꼴 받기 끝(loadingdone)을 직접 알린다. */
function createFakeFonts(results: (() => Promise<readonly unknown[]>)[]): FontSource & { finishLoading(): void; listenerCount(): number } {
  const listeners = new Set<() => void>();
  let call = 0;
  return {
    load: vi.fn((): Promise<readonly unknown[]> => {
      const next = results[Math.min(call, results.length - 1)];
      call += 1;
      return next();
    }),
    addEventListener: (_type: 'loadingdone', listener: () => void): void => {
      listeners.add(listener);
    },
    removeEventListener: (_type: 'loadingdone', listener: () => void): void => {
      listeners.delete(listener);
    },
    finishLoading: (): void => {
      for (const listener of [...listeners]) listener();
    },
    listenerCount: (): number => listeners.size,
  };
}

const FOUND = (): Promise<readonly unknown[]> => Promise.resolve([{}]);
const NOT_YET = (): Promise<readonly unknown[]> => Promise.resolve([]);
const FAILED = (): Promise<readonly unknown[]> => Promise.reject(new Error('network'));

/** 약속(then)이 처리될 때까지 기다린다 */
async function settle(): Promise<void> {
  await new Promise((resolve): void => {
    setTimeout(resolve, 0);
  });
}

describe('화면 글꼴 준비 알림', () => {
  it('글꼴이 이미 있으면 바로 한 번 알리고 더 듣지 않는다', async () => {
    const fonts = createFakeFonts([FOUND]);
    const onReady = vi.fn();
    whenDisplayFontReady('인형뽑기', onReady, fonts);
    await settle();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(fonts.listenerCount()).toBe(0);
  });

  it('글꼴 스타일시트가 아직 없으면 기다렸다가, 다른 글꼴을 받은 뒤 다시 물어 준비되면 한 번만 알린다', async () => {
    const fonts = createFakeFonts([NOT_YET, NOT_YET, FOUND]);
    const onReady = vi.fn();
    whenDisplayFontReady('인형뽑기', onReady, fonts);
    await settle();
    expect(onReady).not.toHaveBeenCalled();

    fonts.finishLoading();
    await settle();
    expect(onReady).not.toHaveBeenCalled();

    fonts.finishLoading();
    await settle();
    expect(onReady).toHaveBeenCalledTimes(1);

    fonts.finishLoading();
    await settle();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(fonts.listenerCount()).toBe(0);
  });

  it('찾을 글자를 화면 글꼴 이름과 함께 묻는다', async () => {
    const fonts = createFakeFonts([FOUND]);
    whenDisplayFontReady('인형뽑기', vi.fn(), fonts);
    await settle();
    expect(fonts.load).toHaveBeenCalledWith(expect.stringContaining('Jua'), '인형뽑기');
  });

  it('글꼴을 받지 못하면 알리지 않고 오류도 밖으로 내보내지 않는다', async () => {
    const fonts = createFakeFonts([FAILED]);
    const onReady = vi.fn();
    whenDisplayFontReady('인형뽑기', onReady, fonts);
    await settle();
    fonts.finishLoading();
    await settle();
    expect(onReady).not.toHaveBeenCalled();
  });

  it('그만 듣기를 부르면 나중에 준비돼도 알리지 않는다', async () => {
    const fonts = createFakeFonts([NOT_YET, FOUND]);
    const onReady = vi.fn();
    const stop = whenDisplayFontReady('인형뽑기', onReady, fonts);
    await settle();
    stop();
    fonts.finishLoading();
    await settle();
    expect(onReady).not.toHaveBeenCalled();
    expect(fonts.listenerCount()).toBe(0);
  });

  it('그만 듣기 전에 시작한 물음이 늦게 돌아와도 알리지 않는다', async () => {
    const fonts = createFakeFonts([FOUND]);
    const onReady = vi.fn();
    const stop = whenDisplayFontReady('인형뽑기', onReady, fonts);
    stop();
    await settle();
    expect(onReady).not.toHaveBeenCalled();
  });
});
