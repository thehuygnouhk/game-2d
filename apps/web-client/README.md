# Web client

Phaser 3 + Vite + TypeScript ([client-design](../../docs/architecture/client-design.md)).

| Thư mục | Nội dung |
|---------|----------|
| `src/net/connection.ts` | WebSocket, khung gói, dispatcher, ping |
| `src/world/prediction.ts` | Dự đoán người chơi cục bộ và đối chiếu với server |
| `src/world/remote.ts` | Nội suy người khác (trễ 100 ms, ngoại suy tối đa 200 ms) |
| `src/scenes/WorldScene.ts` | Vẽ map, nhân vật, tên; bước cố định 50 ms theo đồng hồ thật |
| `e2e/two-players.spec.ts` | Tiêu chí bậc B1: hai trình duyệt thấy nhau đi và nhảy |

Asset (map, sprite) bậc B1 dùng chung với bản chơi thử (`publicDir` trỏ vào `prototype/playable/assets`), sẽ chuyển sang `packages/content` ở bậc B2. Địa chỉ server: `?ws=ws://host:7001`, biến `VITE_GAME_WS_URL`, hoặc mặc định `ws://<host>:7001`.
