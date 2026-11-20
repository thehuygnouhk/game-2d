# Web client

Phaser 3 + Vite + TypeScript ([client-design](../../docs/architecture/client-design.md)).

| Thư mục | Nội dung |
|---------|----------|
| `src/net/connection.ts` | WebSocket, khung gói, dispatcher, giữ gói trong lúc đổi map, ping |
| `src/state.ts` | Chỉ số, túi, kỹ năng, hồi chiêu của nhân vật mình |
| `src/ui/hud.ts` | HUD DOM: khung nhân vật, khu, chat, ô hành động, bảng gục ngã, thông báo |
| `src/world/prediction.ts` | Dự đoán người chơi cục bộ (cả leo thang) và đối chiếu với server |
| `src/world/remote.ts` | Nội suy người khác và quái (trễ 100 ms, ngoại suy tối đa 200 ms) |
| `src/scenes/WorldScene.ts` | Map, nhân vật, quái, đồ rơi, cổng; đánh, khóa mục tiêu, số sát thương; bước cố định 50 ms theo đồng hồ thật |
| `e2e/two-players.spec.ts` | Tiêu chí bậc B1: hai trình duyệt thấy nhau đi và nhảy |
| `e2e/hunt-together.spec.ts` | Tiêu chí bậc B2: chat map, qua cổng, đánh quái lấy EXP và đồ, người kia thấy quái chết, đổi khu |

Phím: A D hoặc ← → đi, Space nhảy, W hoặc ↑ nhảy, leo thang, qua cổng, S hoặc ↓ xuống nền mỏng và xuống thang, J Đòn Thường, 1 Tụ Mana Chấn (Lv5), Q E bình HP và MP, Tab hoặc nhấp chuột chọn quái, Enter chat.

Asset (map, sprite, `sprites/items.json`) dùng chung với bản chơi thử (`publicDir` trỏ vào `prototype/playable/assets`), do `tools/art-proto/build.py` sinh ra. Địa chỉ server: `?ws=ws://host:7001`, biến `VITE_GAME_WS_URL`, hoặc mặc định `ws://<host>:7001`.
