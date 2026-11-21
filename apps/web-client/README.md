# Web client

Phaser 3 + Vite + TypeScript ([client-design](../../docs/architecture/client-design.md)).

| Thư mục | Nội dung |
|---------|----------|
| `src/main.ts` | Màn đăng nhập, đăng ký, chọn và tạo nhân vật; vào game bằng vé |
| `src/net/api.ts` | Gọi REST API (`/api`), tự làm mới token bằng cookie |
| `src/net/connection.ts` | WebSocket, khung gói, dispatcher, giữ gói trong lúc đổi map, ping |
| `src/state.ts` | Chỉ số, túi, kỹ năng, hồi chiêu của nhân vật mình |
| `src/ui/hud.ts` | HUD DOM: khung nhân vật, khu, chat (kênh Khu và Thế giới), ô hành động, nút Nhân vật và Đổi nhân vật, bảng gục ngã, thông báo |
| `src/ui/charwin.ts` | Cửa sổ Nhân vật: chỉ số, cộng điểm tiềm năng |
| `src/world/prediction.ts` | Dự đoán người chơi cục bộ (cả leo thang) và đối chiếu với server |
| `src/world/remote.ts` | Nội suy người khác và quái (trễ 100 ms, ngoại suy tối đa 200 ms) |
| `src/scenes/WorldScene.ts` | Map, nhân vật, quái, đồ rơi, cổng; đánh, khóa mục tiêu, số sát thương; bước cố định 50 ms theo đồng hồ thật |
| `e2e/two-players.spec.ts` | Tiêu chí bậc B1: hai trình duyệt thấy nhau đi và nhảy |
| `e2e/hunt-together.spec.ts` | Tiêu chí bậc B2: chat map, qua cổng, đánh quái lấy EXP và đồ, người kia thấy quái chết, đổi khu |
| `e2e/accounts.spec.ts` | Tiêu chí bậc B3: đăng ký, cộng điểm, đóng trang rồi vào lại thấy nhân vật ở chỗ cũ, đăng xuất, đăng nhập |

Test e2e chạy cả API, game server và client với PostgreSQL và Redis thật (`E2E_DATABASE_URL`, `E2E_REDIS_URL`); cơ sở dữ liệu e2e bị xóa sạch mỗi lần chạy.

Phím: C cửa sổ Nhân vật, A D hoặc ← → đi, Space nhảy, W hoặc ↑ nhảy, leo thang, qua cổng, S hoặc ↓ xuống nền mỏng và xuống thang, J Đòn Thường, 1 Tụ Mana Chấn (Lv5), Q E bình HP và MP, Tab hoặc nhấp chuột chọn quái, Enter chat.

Asset (map, sprite, `sprites/items.json`) dùng chung với bản chơi thử (`publicDir` trỏ vào `prototype/playable/assets`), do `tools/art-proto/build.py` sinh ra. Địa chỉ game server lấy từ vé (realm); ghi đè bằng `?ws=ws://host:7001` hoặc `VITE_GAME_WS_URL`. API: `VITE_API_URL` (mặc định `/api`), khi phát triển Vite chuyển `/api` sang `VITE_API_PROXY` (mặc định `http://127.0.0.1:3000`).
