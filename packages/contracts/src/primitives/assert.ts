export function assertNever(value: never, message = 'Unhandled discriminated union member'): never {
  let serialized = '[unserializable]';

  try {
    serialized = typeof value === 'object' && value !== null ? Object.prototype.toString.call(value) : typeof value;

    if (serialized.length > 500) {
      serialized = `${serialized.slice(0, 500)}...`;
    }
  } catch {
    //
  }

  throw new Error(`${message}: ${serialized}`);
}
