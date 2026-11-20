# Game server

Server quyết định mọi kết quả ([server-design](../../docs/architecture/server-design.md)). Bậc B2: 4 map R01 (M001–M004), mỗi map 3 khu, tick 20 Hz, snapshot 10 Hz theo vùng nhìn 3×3 ô 512 px. Quái, đánh, EXP, cấp, chết, hồi sinh, đồ rơi, bình thuốc, cổng, đổi khu và chat map đều chạy ở đây.

| Thư mục | Nội dung |
|---------|----------|
| `src/net/session.ts` | Một kết nối: `C_HELLO`, kiểm tra phiên bản, vé khách, schema Zod, giới hạn tốc độ (di chuyển 25/s, kỹ năng 10/s, chat 1/s), đóng sau 3 gói hỏng |
| `src/world/world.ts` | Các map và khu, đồng hồ chung, vào thế giới, qua cổng, đổi khu, hồi sinh về làng |
| `src/world/zone.ts` | Một khu: hàng đợi input (1 bước/tick, để dành 3), sinh và hồi sinh quái, đạn, đồ rơi hết hạn, spawn/despawn theo vùng nhìn, snapshot delta |
| `src/world/combat.ts` | Kỹ năng tân thủ, sát thương, chia EXP theo sát thương, lên cấp (giới hạn Lv9 của Chương 1), gục ngã, bẫy gai, hồi máu và mana, nội tại xuất thân, nhặt đồ, bình thuốc |
| `src/world/mob-ai.ts` | AI quái: lang thang, đuổi, đánh cận chiến hoặc bắn, chạy trốn, quay về |
| `src/world/entities.ts`, `bag.ts` | Người chơi, quái, đồ rơi; túi tạm của phiên (chưa lưu, bậc B3) |
| `src/server.ts` | Nạp `@htk/content`, dựng thế giới, mở WebSocket, bộ lập lịch tick |
| `src/map-check.ts` | `pnpm map:check` |

Biến môi trường (khi phát triển, server tự đọc `.env` ở gốc repo):

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `GAME_WS_PORT` | 7001 | Cổng WebSocket |
| `DEV_GUEST` | (tắt) | `1` để nhận vé `guest:<tên>`; chỉ dùng khi phát triển |
| `CONTENT_DIR`, `MAP_DIR` | `packages/content`, `art/prototype/maps` | Nội dung YAML, map Tiled |
| `START_MAP` | M001 | Map vào game |
| `GAME_SEED` | (ngẫu nhiên) | Hạt ngẫu nhiên cố định, chỉ cho test |
| `ZONE_CAP` | theo YAML map | Ghi đè sức chứa mỗi khu (test) |
