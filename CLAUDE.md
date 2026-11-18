# CLAUDE.md

Hướng dẫn cho Claude Code (và cộng tác viên) khi làm việc trong repo này.

## Dự án

**Huyền Thư Ký (HTK, tên tạm)** là MMORPG 2D cuộn ngang theo cơ chế Ninja School Online / Ngọc Rồng Online, với thế giới gốc của dự án (bản reskin, Draft v0.2). Concept tham khảo Black Clover, nhưng đã đổi toàn bộ tên và 6 điểm nhận diện; bản fan cũ chỉ còn trong lịch sử git (commit `6131e84` trở về trước). Repo hiện ở **giai đoạn thiết kế**: chỉ có tài liệu, chưa có mã nguồn. Điểm vào: `README.md`, `docs/README.md`.

## Quy tắc quan trọng

1. **Tài liệu là nguồn chân lý.** Trước khi viết mã hay nội dung, đọc tài liệu liên quan trong `docs/`. Bảng "Nguồn chân lý" ở `docs/README.md` §9 chỉ rõ file chuẩn cho từng loại thông tin.
2. **Đổi cơ chế → cập nhật tài liệu trong cùng thay đổi.** Số liệu, công thức, opcode, bảng DB đều phải đồng bộ với tài liệu chuẩn.
3. **Dùng đúng thuật ngữ** ở `docs/glossary.md` (Xuất thân, Hệ phép, Huyền Thư, Quan, Nén Bạc, Công Trạng, Đội, Khu, …).
4. **Server-authoritative.** Không bao giờ tin dữ liệu từ client cho vị trí, sát thương, vật phẩm, tiền.
5. **Mọi thay đổi tiền/vật phẩm** phải nằm trong một transaction DB, có `idemKey`, có dòng sổ cái (`currency_ledger`). Xem `docs/architecture/database-schema.md` §6.
6. **Không dùng tài sản gốc của anime/manga** (ảnh, nhạc, thoại). Viết thoại mới, tạo art gốc. Tên hiển thị chỉ nằm trong i18n để đổi tên rẻ. Xem `docs/product/legal-and-compliance.md`.
   **Hướng đã chọn: thương mại với IP gốc thay thế (reskin), mức "giữ concept, đổi tên + 6 điểm nhận diện"** (`docs/product/reskin-spec.md`; khung đầy đủ ở `reskin-plan.md`). Đổi tên là chưa đủ. Không thêm tên, nhân vật, địa danh hay tình tiết của Black Clover vào nội dung mới, và không bắt đầu sản xuất art trước khi các mục ở `reskin-spec.md` §9 được duyệt.
7. **Solo-first.** Mọi hệ phép phải tự chơi trọn vẹn một mình; kỹ năng hỗ trợ luôn có tác dụng lên bản thân; không có kỹ năng hồi sinh người khác. Xem `docs/game-design/04-combat-and-progression.md` §11.
8. **Đặc tả reskin là nguồn nội dung của bản thương mại** (`docs/product/reskin-spec.md`, nội bộ, không phát hành). Mức reskin đã chốt và đã áp dụng lên toàn bộ tài liệu; các mục còn chờ duyệt ở §9. Tài liệu game-design (`01`, `02`, `05`, `06`…) là nơi chứa tên đã đặt. `docs/world-bible/` (hướng văn hóa Việt) là **phương án không chọn**: chỉ tham khảo, **không dùng làm nguồn**.
9. **Định danh kỹ thuật trung tính.** Tên bảng, cột, enum, opcode, mã lỗi **không chứa tên riêng của IP**. Dùng `soft_currency`/`premium_currency` (cột), `soft`/`premium` (payload, YAML), `SOFT`/`PREMIUM`/`GUILD_POINT`/`MERIT` (enum), `guilds`, `tome_edition`, `ARCHER`… và đưa tên hiển thị vào i18n. Bảng quy ước: `docs/product/reskin-spec.md` §7.
10. **Nội dung dạng dữ liệu** (map, quái, vật phẩm, nhiệm vụ) viết bằng YAML trong `packages/content`, có schema và validator. Xem `docs/workflows/content-pipeline.md`.

## Ngôn ngữ

- **Tài liệu và văn bản trong game:** tiếng Việt (thuật ngữ kỹ thuật giữ tiếng Anh).
- **Mã nguồn, tên biến, commit message, comment mã:** tiếng Anh. Commit theo Conventional Commits (`docs/workflows/development-workflow.md` §3).

## Công nghệ dự kiến

TypeScript monorepo (pnpm): client **Phaser 3 + Preact + Vite**; server **Node.js 20 + `ws` + MessagePack**; dữ liệu **PostgreSQL 16 + Redis 7**; kiểm thử **Vitest, Playwright, k6**. Cấu trúc thư mục kế hoạch: `docs/architecture/system-architecture.md` §6.

## Lệnh (kế hoạch, Phase 0)

Chưa tồn tại cho đến khi khung dự án được tạo. Danh sách mục tiêu: `docs/guides/developer-setup-guide.md` §5. Khi tạo khung dự án, phải bám đúng danh sách lệnh này.

## Khi chỉnh sửa tài liệu

- Giữ sơ đồ **Mermaid** hợp lệ; đặt nhãn có ký tự đặc biệt trong dấu ngoặc kép.
- Dùng liên kết **tương đối**; không để liên kết gãy.
- Số liệu là **giá trị khởi điểm**; đổi số liệu cân bằng phải kèm lý do, và (khi có công cụ) báo cáo mô phỏng.
- DDL trong `database-schema.md` phải **chạy được** trên PostgreSQL 16. Kiểm tra bằng cách chạy các khối `sql` ở §3–§4 trên một cơ sở dữ liệu trống.
- Sau khi thêm hay đổi tên, chạy **kiểm tra rò rỉ tên IP** (`docs/product/reskin-spec.md` §10). Các file nội bộ được phép nhắc nguyên tác: `reskin-spec.md`, `reskin-plan.md`, `legal-and-compliance.md`, `CLAUDE.md`, `docs/world-bible/`. Mọi file khác không được nhắc.
