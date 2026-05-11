export type RedisErrorType =
  | 'timeout'
  | 'connection_reset'
  | 'connection_timeout'
  | 'readonly'
  | 'clusterdown'
  | 'moved'
  | 'ask'
  | 'loading'
  | 'oom'
  | 'noscript'
  | 'network'
  | 'unknown';

export interface RedisErrorMetadata {
  readonly type: RedisErrorType;

  readonly retryable: boolean;

  readonly infrastructureFailure: boolean;

  readonly topologyRelated: boolean;
}

const NETWORK_CODES = ['ECONNREFUSED', 'EPIPE', 'ENETUNREACH', 'EHOSTUNREACH'];

export class RedisErrorClassifier {
  static classify(error: unknown): RedisErrorMetadata {
    if (!(error instanceof Error)) {
      return {
        type: 'unknown',
        retryable: false,
        infrastructureFailure: true,
        topologyRelated: false,
      };
    }

    const message = error.message.toUpperCase();

    if (message.includes('TIMEOUT') || message.includes('COMMAND TIMED OUT')) {
      return this.build('timeout', true);
    }

    if (message.includes('ETIMEDOUT')) {
      return this.build('connection_timeout', true);
    }

    if (NETWORK_CODES.some((code) => message.includes(code))) {
      return this.build('network', true);
    }

    if (message.includes('ECONNRESET')) {
      return this.build('connection_reset', true);
    }

    if (message.includes('READONLY')) {
      return this.build('readonly', true, true);
    }

    if (message.includes('CLUSTERDOWN')) {
      return this.build('clusterdown', true, true);
    }

    if (message.includes('MOVED')) {
      return this.build('moved', true, true);
    }

    if (message.includes('ASK')) {
      return this.build('ask', true, true);
    }

    if (message.includes('LOADING')) {
      return this.build('loading', true);
    }

    if (message.includes('OOM')) {
      return this.build('oom', false);
    }

    if (message.includes('NOSCRIPT')) {
      return this.build('noscript', true);
    }

    return this.build('unknown', false);
  }

  private static build(type: RedisErrorType, retryable: boolean, topologyRelated = false): RedisErrorMetadata {
    return {
      type,

      retryable,

      infrastructureFailure: true,

      topologyRelated,
    };
  }
}
