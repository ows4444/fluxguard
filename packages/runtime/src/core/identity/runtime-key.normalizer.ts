export class RuntimeKeyNormalizer {
  normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 256);
  }
}
