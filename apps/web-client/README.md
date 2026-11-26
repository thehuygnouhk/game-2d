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
| `src/ui/dialog.ts` | Hộp thoại NPC (phím 1–6, F, Esc), cảnh Q_MAIN_11 và Q_MAIN_12, thẻ Hết Chương 1 |
| `src/ui/quests.ts` | Bảng theo dõi nhiệm vụ, cửa sổ Nhiệm vụ (L), băng rôn nhận/trả |
| `src/ui/bag.ts` | Hành trang (B): 5 ô trang bị, túi 30 ô, chi tiết món, mặc/tháo/dùng; chế độ tiệm: mua, bán |
| `src/ui/rite.ts` | Cửa sổ Lễ Khai Thư và đổi hệ |
| `src/ui/touch.ts` | Phím ảo cho điện thoại: cần điều khiển, Đánh, Nhảy, Nói, đổi mục tiêu, toàn màn hình |
| `src/world/prediction.ts` | Dự đoán người chơi cục bộ (cả leo thang) và đối chiếu với server |
| `src/world/remote.ts` | Nội suy người khác và quái (trễ 100 ms, ngoại suy tối đa 200 ms) |
| `src/scenes/WorldScene.ts` | Map, nhân vật, quái, đồ rơi, cổng; đánh, khóa mục tiêu, số sát thương; bước cố định 50 ms theo đồng hồ thật |
| `e2e/two-players.spec.ts` | Tiêu chí bậc B1: hai trình duyệt thấy nhau đi và nhảy |
| `e2e/hunt-together.spec.ts` | Tiêu chí bậc B2: chat map, qua cổng, đánh quái lấy EXP và đồ, người kia thấy quái chết, đổi khu |
| `e2e/accounts.spec.ts` | Tiêu chí bậc B3: đăng ký, cộng điểm, đóng trang rồi vào lại thấy nhân vật ở chỗ cũ, đăng xuất, đăng nhập |
| `e2e/mobile.spec.ts` | Điện thoại (giả lập Pixel 7): đăng ký khi cầm dọc; cầm ngang đi bằng cần điều khiển, nói chuyện, nhận nhiệm vụ, đánh; cầm dọc thì nhắc xoay máy |
| `e2e/chapter1.spec.ts` | Tiêu chí bậc B4: hộp thoại Thầy và Bà Mơ, trả Q_MAIN_01, mua ở tiệm Lam Nhi, săn Nấm Lùn cho Q_MAIN_02, mặc Kiếm Gỗ Tập |

Test e2e chạy cả API, game server và client với PostgreSQL và Redis thật (`E2E_DATABASE_URL`, `E2E_REDIS_URL`); cơ sở dữ liệu e2e bị xóa sạch mỗi lần chạy.

Phím: C cửa sổ Nhân vật, B hành trang, L nhiệm vụ, F nói chuyện với NPC (hái, mở rương, Đài Khai Thư), 2 kỹ năng hệ, A D hoặc ← → đi, Space nhảy, W hoặc ↑ nhảy, leo thang, qua cổng, S hoặc ↓ xuống nền mỏng và xuống thang, J Đòn Thường, 1 Tụ Mana Chấn (Lv5), Q E bình HP và MP, Tab hoặc nhấp chuột chọn quái, Enter chat. Trên điện thoại: phím ảo tự bật (thử trên máy tính bằng `?touch=1`).

Asset (map, sprite, `sprites/items.json`) dùng chung với bản chơi thử (`publicDir` trỏ vào `prototype/playable/assets`), do `tools/art-proto/build.py` sinh ra. Địa chỉ game server lấy từ vé (realm); ghi đè bằng `?ws=ws://host:7001` hoặc `VITE_GAME_WS_URL`. API: `VITE_API_URL` (mặc định `/api`), khi phát triển Vite chuyển `/api` sang `VITE_API_PROXY` (mặc định `http://127.0.0.1:3000`).
