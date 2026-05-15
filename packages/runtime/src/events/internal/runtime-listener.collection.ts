export class RuntimeListenerCollection<T> {
  readonly #listeners = new Set<(event: T) => void>();

  add(listener: (event: T) => void): () => void {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  emit(event: T, onError: (error: unknown) => void): void {
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch (error) {
        onError(error);
      }
    }
  }
}
