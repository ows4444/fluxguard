export class RuntimeKeyNormalizer {
  normalize(value: string): string {
    return value.trim().replaceAll(':', '_').replaceAll(' ', '_');
  }
}
