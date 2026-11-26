/**
 * Portfolio demo API.
 *
 * The original app talks to the CareCar gateway over fetch. This demo swaps
 * that layer for a localStorage-backed implementation with the same method
 * names and `{ data }` envelopes, so every production component keeps working
 * without any backend, credentials or network access.
 */
export { api, clearApiCache, formatPhoneForApi } from '../demo/mockApi'
