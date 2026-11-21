# API

REST API: tài khoản, đăng nhập, nhân vật, vé vào game ([network-protocol §10](../../docs/architecture/network-protocol.md), [security §3](../../docs/architecture/security-and-anticheat.md)). Fastify, Zod; dữ liệu qua `@htk/db`, vé và giới hạn tốc độ trong Redis.

| File | Nội dung |
|------|----------|
| `src/app.ts` | Các route dưới `API_PREFIX` (mặc định `/api`): `auth/register`, `auth/login`, `auth/refresh`, `auth/logout`, `me`, `realms`, `realms/:id/characters` (xem, tạo), `session/ticket`, `status` |
| `src/security.ts` | Argon2id, JWT 15 phút, token ngẫu nhiên, băm token và IP, danh sách mật khẩu phổ biến |
| `src/main.ts` | Đọc biến môi trường (khi phát triển tự đọc `.env`), mở cổng `API_PORT` |
| `test/security.test.ts` | Unit test |
| `test/api.int.test.ts` | Test tích hợp với PostgreSQL và Redis thật (`pnpm test:int`) |
| `Dockerfile` | Ảnh chạy API, kèm `dist/db.js migrate | seed` |

Biến môi trường: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (bắt buộc; 32+ ký tự ở môi trường thật), `API_PORT` (3000), `API_PREFIX` (`/api`), `COOKIE_SECURE`, `TRUST_PROXY`, `MAX_CHARACTERS` (3), `RATE_LIMIT_SCALE` (1), `CONTENT_DIR`, `MAP_DIR`, `API_LOG` (`0` để tắt log).
