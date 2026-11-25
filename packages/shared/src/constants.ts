/** Tick and network rates (docs/architecture/server-design.md §1.1, network-protocol.md §5). */
export const TICK_MS = 50;
export const TICK_RATE = 1000 / TICK_MS; // 20 Hz
export const SNAPSHOT_EVERY_TICKS = 2; // 10 Hz
export const PROTOCOL_VERSION = 3; // 2: step B2 (monsters, combat, drops, zones, chat); 3: step B4 (Chapter 1)
export const FRAME_VERSION = 1;
export const MAX_FRAME_BYTES = 16 * 1024;
export const DEFAULT_GAME_WS_PORT = 7001;
/** Area of interest: 512 px cells, players see the 3x3 cells around them (server-design §5). */
export const AOI_CELL = 512;
/** Rate limits per connection (network-protocol §7). */
export const MAX_MOVE_INPUTS_PER_S = 25;
export const MAX_PACKETS_PER_S = 120;
/** Strikes before a connection sending bad frames is closed (network-protocol §2). */
export const MAX_BAD_FRAMES = 3;
export const MAX_SKILLS_PER_S = 10;
/** Map chat: one message per second (network-protocol §7). */
export const CHAT_MAP_INTERVAL_MS = 1000;
/** World chat: one message per 10 seconds (network-protocol §7). */
export const CHAT_WORLD_INTERVAL_MS = 10_000;
/** Shop commands: 5 per second (network-protocol §7). */
export const MAX_SHOP_PER_S = 5;
/** How close a player must stand to talk to an NPC or use a map object, px (lag included). */
export const NPC_RANGE = 120;
export const OBJECT_RANGE = 80;
