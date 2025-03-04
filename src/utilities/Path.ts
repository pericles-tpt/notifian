export function isUriSubdirectoryOfChosen(rootUri: string, subUri: string) {
    const rootParts = rootUri.split('%3A');
    const subParts = subUri.split('%3A');

    if (rootParts.length < 2 || subParts.length < 2) {
        return false;
    }

    const rootPath = rootParts.slice(-1)[0];
    const subPath = subParts.slice(-1)[0];
    return subPath.length > rootPath.length && subPath.startsWith(rootPath);
}
