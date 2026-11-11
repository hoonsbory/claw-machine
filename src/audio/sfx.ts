import type { ClawEvent } from '../game/types';

/** 효과음 이름. 배경 음악은 없다. */
export type SfxName = 'drop' | 'grab' | 'miss' | 'slip' | 'win' | 'complete';

/** 집게 이벤트에 붙는 효과음. 획득·완료 소리는 축하 화면이 뜰 때 따로 낸다. */
export function sfxForEvent(event: ClawEvent): SfxName | null {
  switch (event.type) {
    case 'dropStarted':
      return 'drop';
    case 'grabbed':
      return 'grab';
    case 'missed':
      return 'miss';
    case 'slipped':
      return 'slip';
    case 'released':
    case 'tryEnded':
      return null;
  }
}

export interface Sfx {
  /** 사용자 입력 안에서 불러 오디오를 켠다(브라우저 자동 재생 제한). 이미 켜져 있으면 아무 일도 없다. */
  unlock(): void;
  /** 오디오가 켜져 있고 음소거가 아닐 때만 소리를 낸다. 어떤 경우에도 오류를 던지지 않는다. */
  play(name: SfxName): void;
  setMuted(muted: boolean): void;
}

/**
 * Web Audio 로 짧은 소리를 합성한다. 오디오 파일은 쓰지 않는다.
 * 오디오는 브라우저가 사용자 입력으로 쳐 준 뒤의 첫 unlock 때 만든다. 그 전에 만들면 잠긴 채로 만들어지고 경고가 남는다.
 * 아이폰처럼 만든 뒤에도 잠겨 있거나 앱 전환으로 멈춘 오디오는 다음 unlock 때 다시 켠다.
 * Web Audio 를 지원하지 않으면 아무 일도 하지 않는 구현을 돌려준다.
 */
export function createSfx(): Sfx {
  const AudioContextClass = findAudioContextClass();
  if (AudioContextClass === null) return SILENT_SFX;

  let audio: OpenAudio | null = null;
  let isMuted = false;

  return {
    unlock(): void {
      try {
        if (!hasUserActivation()) return;
        audio ??= openAudio(AudioContextClass, isMuted);
        if (audio.context.state === 'running') return;
        audio.context.resume().catch(ignoreAudioError);
      } catch {
        // 오디오를 만들거나 켜지 못하면 소리 없이 계속한다. 다음 입력 때 다시 시도한다.
      }
    },
    play(name: SfxName): void {
      if (isMuted || audio === null || audio.context.state !== 'running') return;
      try {
        const startAt = audio.context.currentTime + SCHEDULE_AHEAD;
        for (const tone of RECIPES[name]) scheduleTone(audio, tone, startAt);
      } catch {
        // 소리 하나를 못 내도 게임은 계속한다
      }
    },
    setMuted(muted: boolean): void {
      isMuted = muted;
      if (audio !== null) audio.master.gain.value = getMasterVolume(muted);
    },
  };
}

/** 진동 이름: 잡았을 때 짧게, 획득 때 길게 */
export type VibrationName = 'grab' | 'win';

/**
 * 진동을 지원하는 기기(안드로이드)에서만 떤다. 아이폰 브라우저에는 navigator.vibrate 가 없다. 음소거와 상관없다.
 * 화면을 한 번도 누르기 전(새로 열자마자 닫지 않은 축하를 되살릴 때)에는 브라우저가 진동을 막고 콘솔에 오류를 남기므로 부르지 않는다.
 */
export function vibrate(name: VibrationName): void {
  const device = (globalThis as Partial<Pick<typeof globalThis, 'navigator'>>).navigator;
  if (typeof device?.vibrate !== 'function') return;
  if (!hasUserActivation()) return;
  try {
    device.vibrate(VIBRATION_MS[name]);
  } catch {
    // 진동이 막혀 있어도 게임은 계속한다
  }
}

/** 소리 하나를 이루는 음 하나. 시각·길이는 초, 높이는 Hz, 크기는 0~1 이다. */
interface Tone {
  at: number;
  from: number;
  to: number;
  duration: number;
  wave: OscillatorType;
  volume: number;
}

interface OpenAudio {
  context: AudioContext;
  /** 모든 음이 지나가는 전체 크기. 음소거하면 0 이 되어 울리던 소리도 끊긴다. */
  master: GainNode;
}

/** 지원하지 않는 브라우저용: 아무 일도 하지 않는다 */
const SILENT_SFX: Sfx = {
  unlock(): void {},
  play(): void {},
  setMuted(): void {},
};

const VIBRATION_MS: Record<VibrationName, number> = { grab: 40, win: 300 };

const MASTER_VOLUME = 0.6;
/** 예약한 음이 바로 시작돼 앞부분이 잘리지 않도록 두는 여유(초) */
const SCHEDULE_AHEAD = 0.01;
const ATTACK_TIME = 0.01;
/** 지수 곡선은 0 에 닿을 수 없어 들리지 않는 작은 값에서 시작하고 끝낸다 */
const SILENT_GAIN = 0.0001;
const STOP_MARGIN = 0.05;

/** 음 높이(Hz) */
const NOTE = {
  C4: 261.63,
  D4: 293.66,
  G4: 392,
  A3: 220,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
} as const;

const ARPEGGIO_GAP = 0.09;
const COMPLETE_CHORD_AT = 0.6;

/** 짧고 귀여운 소리들: 내려가는 미끄럼, 딸깍 두 번, 낮게 두 번, 떨어지는 미끄럼, 올라가는 화음 */
const RECIPES: Record<SfxName, readonly Tone[]> = {
  drop: [{ at: 0, from: NOTE.G5, to: NOTE.C5, duration: 0.25, wave: 'triangle', volume: 0.3 }],
  grab: [
    { at: 0, from: NOTE.A5, to: NOTE.A5, duration: 0.06, wave: 'square', volume: 0.08 },
    { at: 0.07, from: NOTE.E6, to: NOTE.E6, duration: 0.08, wave: 'square', volume: 0.08 },
  ],
  miss: [
    { at: 0, from: NOTE.G4, to: NOTE.G4, duration: 0.12, wave: 'triangle', volume: 0.3 },
    { at: 0.15, from: NOTE.D4, to: NOTE.C4, duration: 0.3, wave: 'triangle', volume: 0.3 },
  ],
  slip: [{ at: 0, from: NOTE.A5, to: NOTE.A3, duration: 0.45, wave: 'sine', volume: 0.35 }],
  win: arpeggio([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0, 0.25),
  complete: [
    ...arpeggio([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6], 0, 0.25),
    ...[NOTE.C6, NOTE.E6, NOTE.G6].map((note): Tone => ({
      at: COMPLETE_CHORD_AT,
      from: note,
      to: note,
      duration: 0.9,
      wave: 'triangle',
      volume: 0.2,
    })),
  ],
};

/** 음을 차례로 하나씩 올려 치는 화음 */
function arpeggio(notes: readonly number[], at: number, duration: number): Tone[] {
  return notes.map((note, index): Tone => ({
    at: at + index * ARPEGGIO_GAP,
    from: note,
    to: note,
    duration,
    wave: 'triangle',
    volume: 0.25,
  }));
}

interface AudioGlobals {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/** 브라우저 밖(테스트)이나 오래된 브라우저에는 없을 수 있어 globalThis 에서 찾아본다 */
function findAudioContextClass(): typeof AudioContext | null {
  const globals = globalThis as AudioGlobals;
  return globals.AudioContext ?? globals.webkitAudioContext ?? null;
}

/**
 * 브라우저가 이 페이지에서 사용자 입력을 받은 적이 있는지. 터치는 손을 뗄 때, 키는 Shift 같은 보조 키가 아닐 때 인정된다.
 * 이 정보를 주지 않는 오래된 브라우저에서는 있다고 보고 그냥 시도한다.
 */
function hasUserActivation(): boolean {
  const device = (globalThis as Partial<Pick<typeof globalThis, 'navigator'>>).navigator;
  return device?.userActivation?.hasBeenActive ?? true;
}

function openAudio(AudioContextClass: typeof AudioContext, isMuted: boolean): OpenAudio {
  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = getMasterVolume(isMuted);
  master.connect(context.destination);
  return { context, master };
}

function getMasterVolume(isMuted: boolean): number {
  if (isMuted) return 0;
  return MASTER_VOLUME;
}

/** 음 하나를 예약한다. 빠르게 커졌다가 길이 끝까지 지수 곡선으로 줄어든다. */
function scheduleTone({ context, master }: OpenAudio, tone: Tone, startAt: number): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const begin = startAt + tone.at;
  const end = begin + tone.duration;

  oscillator.type = tone.wave;
  oscillator.frequency.setValueAtTime(tone.from, begin);
  if (tone.to !== tone.from) oscillator.frequency.exponentialRampToValueAtTime(tone.to, end);
  envelope.gain.setValueAtTime(SILENT_GAIN, begin);
  envelope.gain.exponentialRampToValueAtTime(tone.volume, begin + ATTACK_TIME);
  envelope.gain.exponentialRampToValueAtTime(SILENT_GAIN, end);

  oscillator.connect(envelope).connect(master);
  oscillator.start(begin);
  oscillator.stop(end + STOP_MARGIN);
}

function ignoreAudioError(): void {
  // 켜지지 않으면 다음 입력 때 다시 시도한다
}
