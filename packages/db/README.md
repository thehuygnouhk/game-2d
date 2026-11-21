# @htk/db

PostgreSQL: migration SQL, kết nối, transaction và các hàm đọc ghi ([database-schema](../../docs/architecture/database-schema.md)).

| File | Nội dung |
|------|----------|
| `migrations/0001_init.sql` | Bảng của bậc B3, chép đúng DDL ở database-schema §3–§4 |
| `src/index.ts` | `createDb`, `tx` (BEGIN … COMMIT, ROLLBACK khi lỗi), `migrate`, `resetSchema`, `seed` |
| `src/accounts.ts` | Tài khoản, phiên đăng nhập (refresh token đã băm) |
| `src/characters.ts` | Tạo nhân vật kèm đồ khởi đầu, nạp, khóa dòng, lưu định kỳ, lên cấp, cộng điểm |
| `src/items.ts` | Thêm vào túi (dồn chồng, ô trống, báo túi đầy), dùng một món |
| `src/ledger.ts` | Đổi Quan kèm dòng sổ cái và idemKey; kiểm tra tổng sổ cái |
| `src/cli.ts` | `pnpm db:migrate`, `db:seed`, `db:reset` |
| `test/db.int.test.ts` | Test tích hợp: migration, so khớp schema với tài liệu, ràng buộc duy nhất, túi đồ, sổ cái chạy song song |

Quy tắc: tiền và vật phẩm chỉ đổi bên trong `tx(...)`, sau khi đã khóa dòng nhân vật (`lockCharacter`), và Quan luôn đi qua `addSoft` (CLAUDE.md quy tắc 5).
