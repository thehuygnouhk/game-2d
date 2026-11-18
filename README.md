# Black Clover Online: Ma Đạo Thư (tên tạm)

> Game nhập vai trực tuyến 2D cuộn ngang, cơ chế theo **Ninja School Online** và **Ngọc Rồng Online**, bối cảnh và cốt truyện lấy cảm hứng từ **Black Clover**.

**Trạng thái dự án:** Giai đoạn **thiết kế**. Repo hiện chứa bộ tài liệu đầy đủ. Mã nguồn sẽ bắt đầu ở Phase 0 (xem [roadmap](docs/product/roadmap.md)).

> **Tuyên bố:** Đây là dự án fan-made, **không liên kết** với tác giả hay chủ sở hữu bản quyền Black Clover. Mọi tên nhân vật, thế giới thuộc về chủ sở hữu tương ứng. Xem [Pháp lý & Tuân thủ](docs/product/legal-and-compliance.md) trước khi nghĩ đến phát hành thương mại.

## Tóm tắt game

- Bạn lớn lên ở **Làng Hage** cùng Asta và Yuno, nhận **Ma Đạo Thư** ở Lv10, chọn một trong **7 hệ phép** (Hỏa, Thủy, Phong, Lôi, Thổ, Mộc, Ám) và một hệ ẩn **Phản Ma**.
- Chạy nhảy trên map 2D, đánh quái, làm nhiệm vụ NPC, nâng cấp trang bị (+1…+16), khảm ngọc, nuôi **Hiệp Sĩ Tập Sự** (đệ tử), cưỡi **Chổi Bay**.
- Lập **Đội Hiệp Sĩ** (bang hội), đánh **Hầm Ngục**, **Raid**, **Boss thế giới**, **Chiến Trường Vương Quốc**, săn **7 Linh Thạch Sao** để triệu hồi **Tứ Đại Tinh Linh**.
- Cốt truyện **8 chương**, từ Nhà Thờ Hage đến **Cõi Quỷ** và Ngai Vua Phép Thuật. Cấp tối đa 100.

## Bắt đầu đọc

| Bạn là… | Đọc theo thứ tự |
|---------|------------------|
| **Người mới, muốn hiểu dự án** | [Tầm nhìn & Phạm vi](docs/product/vision-and-scope.md) → [Cốt truyện](docs/game-design/01-lore-and-story.md) → [Hướng dẫn người chơi](docs/guides/player-guide.md) |
| **Game designer** | [docs/game-design/](docs/game-design/) từ `01` đến `12` |
| **Developer** | [Kiến trúc hệ thống](docs/architecture/system-architecture.md) → [Server](docs/architecture/server-design.md) → [Giao thức](docs/architecture/network-protocol.md) → [Database](docs/architecture/database-schema.md) → [Thiết lập dev](docs/guides/developer-setup-guide.md) |
| **QA / Producer** | [Yêu cầu](docs/product/requirements.md) → [Use case](docs/usecases/use-cases-player.md) → [Roadmap](docs/product/roadmap.md) → [Quy trình phát triển](docs/workflows/development-workflow.md) |
| **GM / Vận hành** | [Hướng dẫn GM](docs/guides/admin-gm-guide.md) → [Use case quản trị](docs/usecases/use-cases-admin-system.md) → [Hạ tầng](docs/architecture/infrastructure-devops.md) |

Mục lục đầy đủ: [docs/README.md](docs/README.md).

## Công nghệ dự kiến

| Lớp | Công nghệ |
|-----|-----------|
| Client | TypeScript, Phaser 3, Preact, Vite, Capacitor (mobile) |
| Server | Node.js 20, TypeScript, `ws`, MessagePack |
| Dữ liệu | PostgreSQL 16, Redis 7 |
| Công cụ | pnpm workspaces, Vitest, Playwright, k6, GitHub Actions |

Chi tiết và lý do: [system-architecture §5](docs/architecture/system-architecture.md).

## Quyết định đang mở

**Đã quyết:** thương mại hóa với **IP gốc thay thế (reskin)**, xem [Kế hoạch Reskin](docs/product/reskin-plan.md). Bộ tài liệu hiện tại là **bản tham khảo nội bộ bám nguyên tác**; bản thương mại sẽ viết lại thế giới, nhân vật, cốt truyện từ một World Bible gốc.

Còn mở (xem [vision §9](docs/product/vision-and-scope.md)): tên game gốc, nội dung World Bible, công nghệ.

## Đóng góp

Mọi thay đổi qua Pull Request. Đọc [quy trình phát triển](docs/workflows/development-workflow.md). **Đổi cơ chế thì cập nhật tài liệu trong cùng PR.**
