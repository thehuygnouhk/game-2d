/** Error codes (docs/architecture/network-protocol.md §8). */
export const ErrorCode = {
  E_VERSION: 1001,
  E_AUTH: 1002,
  E_DUPLICATE_LOGIN: 1003,
  E_MAINTENANCE: 1005,
  E_RATE_LIMIT: 1100,
  E_INVALID_PAYLOAD: 1101,
  E_NOT_ENOUGH_MP: 2001,
  E_COOLDOWN: 2002,
  E_OUT_OF_RANGE: 2003,
  E_INVALID_TARGET: 2004,
  E_DEAD: 2005,
  E_ZONE_FULL: 2007,
  E_IN_COMBAT: 2008,
  E_MAP_LOCKED: 2009,
  E_INVENTORY_FULL: 3001,
  E_ITEM_NOT_FOUND: 3005,
  E_LEVEL_REQUIRED: 3006,
  E_INTERNAL: 9000,
} as const;
export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
