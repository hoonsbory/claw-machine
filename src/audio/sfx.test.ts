import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSfx, sfxForEvent, vibrate } from './sfx';

afterEach((): void => {
  vi.unstubAllGlobals();
});

it('집게 이벤트를 효과음 이름으로 바꾼다', () => {
  expect(sfxForEvent({ type: 'dropStarted' })).toBe('drop');
  expect(sfxForEvent({ type: 'grabbed', dollId: 'a' })).toBe('grab');
  expect(sfxForEvent({ type: 'missed' })).toBe('miss');
  expect(sfxForEvent({ type: 'slipped', dollId: 'a' })).toBe('slip');
  expect(sfxForEvent({ type: 'released', dollId: null })).toBeNull();
  expect(sfxForEvent({ type: 'tryEnded', won: true })).toBeNull();
});
it('Web Audio 가 없는 환경에서도 오류를 내지 않는다', () => {
  const sfx = createSfx(); // 테스트 환경에는 AudioContext 가 없다
  expect(() => { sfx.unlock(); sfx.play('win'); sfx.setMuted(true); }).not.toThrow();
});

describe('Web Audio 가 있을 때', () => {
  it('잠긴 채 만들어진 오디오를 unlock 이 다시 켜고, 켜지기 전과 음소거 중에는 소리를 예약하지 않는다', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const sfx = createSfx();

    sfx.play('drop');
    expect(FakeAudioContext.instances).toHaveLength(0);

    sfx.unlock();
    const context = FakeAudioContext.instances[0];
    expect(context.resume).toHaveBeenCalledTimes(1);
    sfx.play('drop');
    expect(context.oscillatorCount).toBe(0);

    await context.resume.mock.results[0].value;
    sfx.play('drop');
    expect(context.oscillatorCount).toBeGreaterThan(0);

    const countBeforeMute = context.oscillatorCount;
    sfx.setMuted(true);
    sfx.play('win');
    expect(context.oscillatorCount).toBe(countBeforeMute);

    sfx.setMuted(false);
    sfx.play('win');
    expect(context.oscillatorCount).toBeGreaterThan(countBeforeMute);
  });

  it('브라우저가 아직 사용자 입력으로 쳐 주지 않은 때(터치의 pointerdown 등)에는 오디오를 만들지 않는다', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const userActivation = { hasBeenActive: false };
    vi.stubGlobal('navigator', { userActivation });
    const sfx = createSfx();

    sfx.unlock();
    expect(FakeAudioContext.instances).toHaveLength(0);

    userActivation.hasBeenActive = true;
    sfx.unlock();
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('webkitAudioContext 만 있는 브라우저에서도 소리를 낸다', async () => {
    vi.stubGlobal('webkitAudioContext', FakeAudioContext);
    const sfx = createSfx();

    sfx.unlock();
    const context = FakeAudioContext.instances[0];
    await context.resume.mock.results[0].value;
    sfx.play('complete');
    expect(context.oscillatorCount).toBeGreaterThan(0);
  });

  it('소리를 만들다 실패해도 오류를 내지 않는다', async () => {
    vi.stubGlobal('AudioContext', BrokenAudioContext);
    const sfx = createSfx();

    sfx.unlock();
    await FakeAudioContext.instances[0].resume.mock.results[0].value;
    expect(() => sfx.play('grab')).not.toThrow();
  });
});

describe('진동', () => {
  it('진동을 지원하지 않으면 아무 일도 하지 않는다', () => {
    vi.stubGlobal('navigator', {});
    expect(() => vibrate('grab')).not.toThrow();
  });

  it('잡았을 때보다 획득 때 길게 떤다', () => {
    const vibrateSpy = vi.fn<(duration: number) => boolean>((): boolean => true);
    vi.stubGlobal('navigator', { vibrate: vibrateSpy });

    vibrate('grab');
    vibrate('win');
    const [[grabDuration], [winDuration]] = vibrateSpy.mock.calls;
    expect(winDuration).toBeGreaterThan(grabDuration);
  });

  it('화면을 한 번도 누르기 전에는 떨지 않는다(새로 열자마자 되살린 축하 화면: 브라우저가 막고 콘솔에 오류를 남긴다)', () => {
    const vibrateSpy = vi.fn<(duration: number) => boolean>((): boolean => true);
    const userActivation = { hasBeenActive: false };
    vi.stubGlobal('navigator', { vibrate: vibrateSpy, userActivation });

    vibrate('win');
    expect(vibrateSpy).not.toHaveBeenCalled();

    userActivation.hasBeenActive = true;
    vibrate('win');
    expect(vibrateSpy).toHaveBeenCalledTimes(1);
  });
});

/** 처음에는 잠겨 있고 resume 으로 켜지는 가짜 오디오. 만든 소리 개수만 센다. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = 'suspended';
  currentTime = 0;
  destination = {};
  oscillatorCount = 0;
  /** 실제 브라우저처럼 부른 자리에서 바로 켜지지 않고 조금 뒤에 켜진다 */
  resume = vi.fn(async (): Promise<void> => {
    await Promise.resolve();
    this.state = 'running';
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain(): object {
    return { gain: createFakeParam(), connect: passThrough };
  }

  createOscillator(): object {
    this.oscillatorCount += 1;
    return { type: 'sine', frequency: createFakeParam(), connect: passThrough, start: noop, stop: noop };
  }
}

/** 소리를 만들려고 하면 던지는 오디오 */
class BrokenAudioContext extends FakeAudioContext {
  createOscillator(): object {
    throw new Error('만들 수 없다');
  }
}

afterEach((): void => {
  FakeAudioContext.instances = [];
});

function createFakeParam(): object {
  return { value: 1, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop };
}

function passThrough<T>(node: T): T {
  return node;
}

function noop(): void {}
