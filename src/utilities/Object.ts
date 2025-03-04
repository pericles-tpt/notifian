export function DeepCopy(object: any, _n: number): any {
  //   console.log('deep copy for: ', _n);
  return JSON.parse(JSON.stringify(object));
}
