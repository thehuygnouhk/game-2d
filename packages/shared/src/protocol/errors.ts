/** Error codes (docs/architecture/network-protocol.md §8). */
export const ErrorCode = {
  E_VERSION: 1001,
  E_AUTH: 1002,
  E_DUPLICATE_LOGIN: 1003,
  E_MAINTENANCE: 1005,
  E_RATE_LIMIT: 1100,
  E_INVALID_PAYLOAD: 1101,
  E_INTERNAL: 9000,
} as const;
export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
