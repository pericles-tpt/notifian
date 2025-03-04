export function before(a: Date, b: Date): boolean {
  return new Date(a).getTime() < new Date(b).getTime();
}
export function after(a: Date, b: Date): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}
export function equal(a: Date, b: Date): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

export function msToHumanReadable(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms > 1000 && ms < 60 * 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

function pad(num: number) {
  if (num < 10) {
    return `0${num}`;
  }
  return num.toString();
}
