import { RuntimeConfigurationError } from '../../errors/index';
import type { RuntimeLimiterDefinition } from '../engine/runtime-limiter.definition';

export class RuntimeRegistry {
  readonly #definitions = new Map<string, RuntimeLimiterDefinition>();

  register(definition: RuntimeLimiterDefinition): void {
    if (this.#definitions.has(definition.name)) {
      throw new RuntimeConfigurationError(`Limiter already registered: ${definition.name}`);
    }

    this.#definitions.set(definition.name, definition);
  }

  get(name: string): RuntimeLimiterDefinition | undefined {
    return this.#definitions.get(name);
  }

  getOrThrow(name: string): RuntimeLimiterDefinition {
    const definition = this.#definitions.get(name);

    if (!definition) {
      throw new RuntimeConfigurationError(`Unknown limiter: ${name}`);
    }

    return definition;
  }

  getAll(): readonly RuntimeLimiterDefinition[] {
    return [...this.#definitions.values()];
  }
}
