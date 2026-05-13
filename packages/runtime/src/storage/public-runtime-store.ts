export interface PublicRuntimeStore {
  delete(key: string): Promise<void>;
}
