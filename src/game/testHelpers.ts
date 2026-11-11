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
