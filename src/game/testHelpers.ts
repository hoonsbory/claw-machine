import type { KeyValueStorage } from './progressStore';

/** 메모리에만 두는 저장소. 처음 들어 있을 값을 넣어 줄 수 있다. */
export function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      values.set(key, value);
    },
    removeItem: (key: string): void => {
      values.delete(key);
    },
  };
}

/** 어떤 접근이든 예외를 던지는 저장소(저장소가 막힌 브라우저 흉내) */
export function throwingStorage(): KeyValueStorage {
  const fail = (): never => {
    throw new Error('저장소를 쓸 수 없다');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

/** 넣어 준 값을 차례로 돌려주는 난수. 준비한 값보다 많이 부르면 실패해서 부르는 횟수까지 고정한다. */
export function seq(...values: number[]): () => number {
  let index = 0;
  return (): number => {
    if (index >= values.length) throw new Error(`난수를 ${values.length}번보다 많이 불렀다`);
    const value = values[index];
    index += 1;
    return value;
  };
}
