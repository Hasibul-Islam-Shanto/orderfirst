declare module 'opossum' {
  import { EventEmitter } from 'node:events';

  export interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
  }

  export default class CircuitBreaker<
    TI extends any[] = any[],
    TR = any,
  > extends EventEmitter {
    constructor(
      action: (...args: TI) => Promise<TR>,
      options?: CircuitBreakerOptions,
    );
    fire(...args: TI): Promise<TR>;
  }
}

