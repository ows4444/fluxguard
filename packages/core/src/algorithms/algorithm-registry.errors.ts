import { FluxGuardError } from '@fluxguard/contracts';

export abstract class AlgorithmRegistryError extends FluxGuardError {}

export class UnsupportedAlgorithmWindowError extends AlgorithmRegistryError {
  constructor(ruleId: string, actual: string, expected: string) {
    super(`Rule "${ruleId}" uses window "${actual}" but algorithm expects "${expected}"`);
  }
}

export class AlgorithmAlreadyRegisteredError extends AlgorithmRegistryError {
  constructor(id: string) {
    super(`Algorithm already registered: ${id}`);
  }
}

export class AlgorithmNotRegisteredError extends AlgorithmRegistryError {
  constructor(id: string) {
    super(`Algorithm not registered: ${id}`);
  }
}
