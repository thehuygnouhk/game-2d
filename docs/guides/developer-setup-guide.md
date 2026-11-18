# Hướng dẫn thiết lập cho Developer

> **Trạng thái:** Draft v0.1 · **Liên quan:** [system-architecture](../architecture/system-architecture.md) · [development-workflow](../workflows/development-workflow.md) · [infrastructure](../architecture/infrastructure-devops.md)

> **Lưu ý quan trọng:** Repo hiện mới chứa **tài liệu thiết kế**. Các lệnh dưới đây là **đích đến của Phase 0** ([roadmap](../product/roadmap.md)), chưa tồn tại cho tới khi khung dự án được tạo. Tài liệu này là **hợp đồng** để khung dự án được dựng theo.

## 1. Yêu cầu

| Công cụ | Phiên bản | Ghi chú |
|---------|-----------|---------|
| Git | ≥ 2.40 | |
| Node.js | 20 LTS | Dùng `nvm`/`fnm`, có file `.nvmrc` |
| pnpm | ≥ 9 | `corepack enable` |
| Docker + Compose | ≥ 24 | Chạy PostgreSQL, Redis |
| Trình duyệt | Chrome mới nhất | Để debug |
| (Tùy chọn) Aseprite | — | Sửa sprite |
| (Tùy chọn) Tiled | ≥ 1.10 | Sửa map |
| (Tùy chọn) k6 | — | Load test |

Hệ điều hành: Linux, macOS, Windows (WSL2 khuyến nghị).

## 2. Bắt đầu nhanh

```bash
git clone <repo-url> game-2d
cd game-2d
corepack enable
pnpm install
cp .env.example .env
```

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis mailhog
```

```bash
pnpm db:migrate
pnpm db:seed
```

```bash
pnpm dev
```

`pnpm dev` chạy song song: `api`, `game-server`, `worker`, `web-client`.

| Dịch vụ | Địa chỉ |
|---------|---------|
| Web client | http://localhost:5173 |
| API | http://localhost:3000 |
| Game server (WebSocket) | ws://localhost:7001 |
| Admin | http://localhost:3100 |
| Email thử (Mailhog) | http://localhost:8025 |

Tài khoản thử từ seed: `dev1` … `dev5`, mật khẩu `devpass` (chỉ ở local).

## 3. Cấu trúc repo

Xem [system-architecture §6](../architecture/system-architecture.md).

```text
apps/       web-client, api, game-server, worker, admin
packages/   shared, content, db, config
tools/      content-cli, balance-sim, bot-client, map-pipeline
docs/       tài liệu thiết kế
infra/      docker-compose, k8s, terraform
```

## 4. Biến môi trường

File `.env` (không commit). Mẫu `.env.example`:

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `DATABASE_URL` | `postgresql://bco:bco@localhost:5432/bco` | Kết nối PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Kết nối Redis |
| `JWT_SECRET` | `change-me` | Khóa ký token (**đổi ở mọi môi trường thật**) |
| `API_PORT` | `3000` | |
| `GAME_WS_PORT` | `7001` | |
| `REALM_ID` | `1` | Realm của game server |
| `TICK_RATE` | `20` | Hz |
| `CONTENT_DIR` | `packages/content` | Thư mục nội dung |
| `LOG_LEVEL` | `debug` | |
| `SMTP_URL` | `smtp://localhost:1025` | Mailhog |
| `PAYMENT_WEBHOOK_SECRET` | `dev-secret` | Chỉ cho sandbox |
| `GM_REQUIRE_MFA` | `false` (local) | **Bắt buộc `true` ở staging/production** |

## 5. Lệnh thường dùng

| Lệnh | Mô tả |
|------|-------|
| `pnpm dev` | Chạy toàn bộ dịch vụ ở chế độ phát triển |
| `pnpm dev:client` / `dev:server` / `dev:api` | Chạy riêng từng phần |
| `pnpm build` | Build tất cả |
| `pnpm lint` / `pnpm typecheck` | Kiểm tra mã |
| `pnpm test` | Unit test |
| `pnpm test:int` | Integration test (cần Docker) |
| `pnpm test:e2e` | E2E Playwright |
| `pnpm content:validate` | Kiểm chứng nội dung |
| `pnpm content:build` | Đóng gói nội dung + `contentVersion` |
| `pnpm map:check` | Kiểm tra map Tiled |
| `pnpm db:migrate` | Chạy migration |
| `pnpm db:seed` | Nạp dữ liệu thử |
| `pnpm db:reset` | **Xóa** và dựng lại DB local |
| `pnpm sim:ttk` / `sim:exp` / `sim:economy` | Mô phỏng cân bằng |
| `pnpm bots -- --count 50` | Chạy 50 bot |
| `pnpm load:ws` | Load test WebSocket (k6) |

## 6. Quy trình làm việc hằng ngày

1. `git switch main && git pull`
2. `git switch -c feat/fr-xxx-ten-ngan`
3. Viết mã + test, cập nhật `docs/` nếu đổi cơ chế.
4. `pnpm lint && pnpm typecheck && pnpm test`
5. Commit theo [Conventional Commits](../workflows/development-workflow.md).
6. Push và mở PR; điền mẫu PR; đợi CI xanh.

## 7. Hướng dẫn tham quan code

| Muốn tìm… | Xem |
|-----------|-----|
| Công thức sát thương, EXP | `packages/shared/src/formulas/` |
| Định nghĩa giao thức, opcode | `packages/shared/src/protocol/` |
| Schema nội dung | `packages/content/schema/` |
| Vòng lặp tick | `apps/game-server/src/world/` |
| Xử lý kỹ năng | `apps/game-server/src/systems/combat/` |
| Nhiệm vụ | `apps/game-server/src/domain/quest/` |
| Giao dịch vật phẩm | `apps/game-server/src/domain/inventory/`, `persistence/` |
| Scene gameplay | `apps/web-client/src/scenes/WorldScene.ts` |
| HUD / UI | `apps/web-client/src/ui/` |
| Schema DB | `packages/db/prisma/schema.prisma` |

## 8. Bài tập đầu tiên: thêm một con quái từ đầu đến cuối

Mục tiêu: hiểu pipeline nội dung.

1. Tạo `packages/content/monsters/mob050.yaml` (Lv 3, hệ Mộc, AI PASSIVE).
2. Thêm tên vào `packages/content/i18n/vi/mobs.json`.
3. Đặt vào `spawns[]` của `maps/m002_hage_meadow.yaml`.
4. `pnpm content:validate monsters maps`.
5. `pnpm dev`, đăng nhập `dev1`, dùng `/gm map M002`, quan sát quái xuất hiện.
6. Đánh quái; kiểm tra EXP/Yul/drop khớp công thức ([combat §5](../game-design/04-combat-and-progression.md)).
7. `pnpm sim:exp` để xem ảnh hưởng.
8. Mở PR (`content(monsters): thêm MOB050`).

## 9. Gỡ lỗi

| Vấn đề | Cách xử lý |
|--------|-----------|
| `ECONNREFUSED` Postgres/Redis | `docker compose ps`; khởi động lại `docker compose up -d postgres redis` |
| Port đã dùng | Đổi `API_PORT`/`GAME_WS_PORT` trong `.env` |
| Client báo `E_VERSION` | Build lại `packages/shared`; `pnpm build --filter shared`; kiểm tra `contentVersion` |
| Content validate lỗi `V003` | Có ID tham chiếu không tồn tại; xem đường dẫn trong báo lỗi |
| Tick > 50 ms khi dev | Giảm số bot; bật profiler: `LOG_LEVEL=debug PROFILE_TICK=1 pnpm dev:server` |
| Migration lỗi | `pnpm db:reset` (chỉ local) hoặc kiểm tra tương thích ngược |
| Âm thanh không phát | Cần thao tác người dùng đầu tiên (chính sách trình duyệt) |
| Windows: lỗi đường dẫn | Dùng WSL2 hoặc Git Bash; tránh dấu cách trong đường dẫn |

### 9.1 Gỡ lỗi mạng
- Bật `?debug=net` trên URL client để hiển thị RTT, gói/giây, `ack`, vị trí server và dự đoán.
- Log gói tin ở server: `LOG_LEVEL=trace` (rất ồn).
- Trình xem gói: `tools/bot-client --dump` in các gói đã giải mã.

## 10. Chất lượng mã

| Quy ước | Chi tiết |
|---------|----------|
| TypeScript | `strict`, không `any` ngầm; dùng `unknown` + validate |
| Định dạng | Prettier; ESLint (kèm quy tắc cấm `console.log` ở server) |
| Đặt tên | `camelCase` biến, `PascalCase` kiểu, `SCREAMING_SNAKE` hằng; ID nội dung giữ định dạng ở [glossary §4](../glossary.md) |
| Hàm | Thuần khiết ở `formulas`, không I/O |
| Lỗi | Dùng mã lỗi chuẩn ([network §8](../architecture/network-protocol.md)); không ném chuỗi |
| Thời gian | Luôn UTC trong mã, chuyển múi giờ ở lớp trình bày; lịch game dùng `Asia/Ho_Chi_Minh` |
| Số tiền | `bigint`/số nguyên; không dùng số thực |
| Ngẫu nhiên | Qua `Rng` có thể gieo hạt (seed) để test lặp lại |
| Bí mật | Không commit; chạy quét bí mật trong pre-commit |

## 11. Kiểm thử

- Đặt tên test kèm mã yêu cầu: `it('FR-CMB-02: chí mạng nhân CRITDMG', ...)`.
- Test công thức cần **kiểm thử dựa trên thuộc tính** (property-based) và các ví dụ từ bảng trong [combat §5.1](../game-design/04-combat-and-progression.md).
- Test giao dịch phải có **kịch bản đồng thời** (hai lệnh cùng lúc) để chống dupe.

## 12. Đóng góp tài liệu

- Sửa tài liệu bằng PR như mã nguồn.
- Giữ nguyên **bảng thuật ngữ** ở [glossary](../glossary.md); thêm thuật ngữ mới ở đó trước.
- Đổi số liệu cân bằng: cập nhật `docs/game-design/*` và `packages/content/balance/*` cùng PR, kèm báo cáo mô phỏng.
