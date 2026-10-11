import type { GatewayPolicy } from './index.js';
/** Every schema of ../schemas keyed by file name, for cross-file $ref in problems(). */
export declare function loadSchemas(dir?: URL | string): Record<string, unknown>;
/** 'gateway-policy' (reference) or 'gateway-policy-transition'. */
export declare function loadPolicy(name?: string): GatewayPolicy;
