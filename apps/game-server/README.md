# Game server

Server quyết định mọi kết quả ([server-design](../../docs/architecture/server-design.md)). Bậc B1: một khu của M001, tick 20 Hz, snapshot 10 Hz theo vùng nhìn 3×3 ô 512 px.

| Thư mục | Nội dung |
|---------|----------|
| `src/net/session.ts` | Một kết nối: `C_HELLO`, kiểm tra phiên bản, vé khách, schema Zod, giới hạn tốc độ, đóng sau 3 gói hỏng |
| `src/world/zone.ts` | Khu: hàng đợi input, hạn mức 1 bước/tick (để dành 3), mô phỏng bằng `@htk/shared`, spawn/despawn theo vùng nhìn, snapshot delta |
| `src/server.ts` | Mở WebSocket, nạp map Tiled, bộ lập lịch tick |
| `src/map-check.ts` | `pnpm map:check` |

Biến môi trường: `GAME_WS_PORT` (7001), `DEV_GUEST=1` (vé `guest:<tên>`, chỉ dùng khi phát triển), `MAP_DIR`, `START_MAP` (M001).
