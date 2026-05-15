export interface RuntimeDestroyable {
  destroy(): void | Promise<void>;
}
