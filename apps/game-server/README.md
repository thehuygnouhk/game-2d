# Game server

Server quyết định mọi kết quả ([server-design](../../docs/architecture/server-design.md)). 4 map R01 (M001–M004), mỗi map 3 khu, tick 20 Hz, snapshot 10 Hz theo vùng nhìn 3×3 ô 512 px. Quái, đánh, EXP, cấp, chết, hồi sinh, đồ rơi, bình thuốc, cổng, đổi khu, chat khu và chat thế giới đều chạy ở đây. Từ bậc B3: vào game bằng vé của API, nhân vật và túi đồ lưu ở PostgreSQL.

| Thư mục | Nội dung |
|---------|----------|
| `src/net/session.ts` | Một kết nối: `C_HELLO`, kiểm tra phiên bản, vé khách, schema Zod, giới hạn tốc độ (di chuyển 25/s, kỹ năng 10/s, chat 1/s), đóng sau 3 gói hỏng |
| `src/world/world.ts` | Các map và khu, đồng hồ chung, vào thế giới, qua cổng, đổi khu, hồi sinh về làng |
| `src/world/zone.ts` | Một khu: hàng đợi input (1 bước/tick, để dành 3), sinh và hồi sinh quái, đạn, đồ rơi hết hạn, spawn/despawn theo vùng nhìn, snapshot delta |
| `src/world/combat.ts` | Kỹ năng tân thủ, sát thương, chia EXP theo sát thương, lên cấp (giới hạn Lv9 của Chương 1), gục ngã, bẫy gai, hồi máu và mana, nội tại xuất thân, nhặt đồ, bình thuốc |
| `src/world/mob-ai.ts` | AI quái: lang thang, đuổi, đánh cận chiến hoặc bắn, chạy trốn, quay về |
| `src/world/entities.ts`, `bag.ts` | Người chơi (hàng đợi thao tác tài sản), quái, đồ rơi; bản sao túi đồ trong bộ nhớ |
| `src/world/store.ts` | `PgStore`: nhặt đồ, dùng bình, cộng điểm, lên cấp, lưu định kỳ, đều qua transaction; `MemoryStore` cho nhân vật khách của test |
| `src/server.ts` | Nạp `@htk/content`, nối PostgreSQL và Redis (khi có `DATABASE_URL`, `REDIS_URL`), dựng thế giới, mở WebSocket, bộ lập lịch tick, tắt máy có lưu |
| `test/server.test.ts` | Test không cần DB (nhân vật khách) |
| `test/accounts.int.test.ts` | Test tích hợp tài khoản (`pnpm test:int`) |
| `src/map-check.ts` | `pnpm map:check` |

Biến môi trường (khi phát triển, server tự đọc `.env` ở gốc repo):

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `GAME_WS_PORT` | 7001 | Cổng WebSocket |
| `DATABASE_URL`, `REDIS_URL` | (trống) | Bật tài khoản: vé từ Redis, nhân vật từ PostgreSQL |
| `REALM_ID` | 1 | Realm của máy chủ này |
| `ALLOWED_ORIGINS` | (mọi nơi) | Trang được phép mở WebSocket |
| `DEV_GUEST` | (tắt) | `1` để nhận vé `guest:<tên>` (test của server); không bao giờ bật ở môi trường thật |
| `CONTENT_DIR`, `MAP_DIR` | `packages/content`, `art/prototype/maps` | Nội dung YAML, map Tiled |
| `START_MAP` | M001 | Map vào game |
| `GAME_SEED` | (ngẫu nhiên) | Hạt ngẫu nhiên cố định, chỉ cho test |
| `ZONE_CAP` | theo YAML map | Ghi đè sức chứa mỗi khu (test) |
