export function getPathUpToLimit(path: string, limit: number) {
  const pathParts = path.split('/');
  const partsUnderLimit = [];
  let totalLength = 0;
  for (let i = 0; i < pathParts.length; i++) {
    const curr = pathParts[pathParts.length - 1 - i];
    totalLength += curr.length + 1;
    if (totalLength > limit) {
      break;
    }
    partsUnderLimit.unshift(curr);
  }
  return partsUnderLimit.join('/');
}
