/**
 * Frontend Types Exports
 * 
 * This barrel export provides convenient access to all TypeScript type definitions.
 * Following the separation of concerns principle:
 * - types/api.ts = Pure type definitions only (no implementations)
 * - lib/api.ts = API client + endpoint configs
 * - lib/index.ts = Re-exports both for convenience
 * 
 * USAGE:
 *   import type { Hackathon, User, Evaluation } from '@/types'
 */

export type * from './api'
