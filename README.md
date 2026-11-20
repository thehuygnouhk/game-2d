# Huyền Thư Ký (tên tạm)

> Game nhập vai trực tuyến 2D cuộn ngang, cơ chế theo dòng game **Ninja School Online** và **Ngọc Rồng Online**: cày quái, nhiệm vụ NPC, nâng cấp trang bị, bang hội, săn boss.

**Trạng thái dự án:** Giai đoạn **thiết kế**. Repo hiện chứa bộ tài liệu đầy đủ (bản reskin, Draft v0.2). Mã nguồn sẽ bắt đầu ở Phase 0 (xem [roadmap](docs/product/roadmap.md)).

## Tóm tắt game

- Ở **Vương quốc Lục Nguyên**, năm mười lăm tuổi mỗi người nhận một **Huyền Thư** (sách phép) tại **Lễ Khai Thư**. Bạn chọn một trong **7 hệ phép** (Hỏa, Thủy, Phong, Lôi, Thổ, Mộc, Ám); hệ ẩn **Phong Ấn Xạ Thủ** mở ở cuối game.
- Bạn lớn lên ở **Làng Suối Mơ** cùng **Lam Nhi** và **Khôi**. Ngày nhận sách cũng là ngày **Thầy Bạch Vân** mất tích, để lại lời nhắn về **Mười Hai Quyển Gốc**.
- Chạy nhảy trên map 2D, đánh quái, làm nhiệm vụ, cường hóa trang bị (+1…+16), khảm **Hạt Nguyên**, nuôi **Đệ Tử**, cưỡi **Chổi Bay**. **Mọi hệ chơi một mình được.**
- Lập **Đội** (bang hội), đánh **Hầm Ngục**, **Raid**, **Boss thế giới**, **Chiến Trường Lục–Xích**, săn **7 Trang Rời** để triệu hồi **Tứ Đại Nguyên Linh**.
- Cốt truyện **8 chương**: từ Làng Suối Mơ tới **Chương Trắng**, đối đầu **Hội Hiệu Đính**, những người muốn viết lại luật phép thuật cho "công bằng". Cấp tối đa 100, danh hiệu cuối **Ứng Viên Chấp Bút**.

## Bắt đầu đọc

| Bạn là… | Đọc theo thứ tự |
|---------|------------------|
| **Người mới, muốn hiểu dự án** | [Tầm nhìn & Phạm vi](docs/product/vision-and-scope.md) → [Cốt truyện](docs/game-design/01-lore-and-story.md) → [Hướng dẫn người chơi](docs/guides/player-guide.md) |
| **Game designer** | [docs/game-design/](docs/game-design/) từ `01` đến `12`, và [thuật ngữ](docs/glossary.md) |
| **Developer** | [Kiến trúc hệ thống](docs/architecture/system-architecture.md) → [Server](docs/architecture/server-design.md) → [Giao thức](docs/architecture/network-protocol.md) → [Database](docs/architecture/database-schema.md) → [Thiết lập dev](docs/guides/developer-setup-guide.md) |
| **QA / Producer** | [Yêu cầu](docs/product/requirements.md) → [Use case](docs/usecases/use-cases-player.md) → [Roadmap](docs/product/roadmap.md) → [Quy trình phát triển](docs/workflows/development-workflow.md) |
| **GM / Vận hành** | [Hướng dẫn GM](docs/guides/admin-gm-guide.md) → [Use case quản trị](docs/usecases/use-cases-admin-system.md) → [Hạ tầng](docs/architecture/infrastructure-devops.md) |

Mục lục đầy đủ: [docs/README.md](docs/README.md).

**Bản thử:** art thử (nhân vật, NPC, quái, boss, bản đồ Chương 1) ở [`art/prototype`](art/prototype/README.md); bản chơi thử Chương 1 trên trình duyệt ở [`prototype/playable`](prototype/playable/README.md).

**Bản online (bậc B1):** khung dự án thật, server quyết định mọi thứ. Hai người vào cùng làng thấy nhau đi lại.

```bash
corepack enable && pnpm install && pnpm dev
```

Mở `http://localhost:5173` ở hai cửa sổ. Chi tiết: [developer-setup-guide](docs/guides/developer-setup-guide.md).

## Công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| Client | TypeScript, Phaser 3, Preact, Vite, Capacitor (mobile) |
| Server | Node.js 20, TypeScript, `ws`, MessagePack |
| Dữ liệu | PostgreSQL 16, Redis 7 |
| Công cụ | pnpm workspaces, Vitest, Playwright, k6, GitHub Actions |

Chi tiết và lý do: [system-architecture §5](docs/architecture/system-architecture.md).

## Hướng IP

Thương mại với **IP gốc thay thế**, mức **giữ concept, đổi tên và 6 điểm nhận diện** ([Đặc tả Reskin](docs/product/reskin-spec.md), nội bộ). Mức này vẫn còn **rủi ro trung bình** vì concept còn gần tác phẩm tham khảo: cần **đối chiếu độc lập** và **luật sư IP** trước Closed Beta ([Pháp lý](docs/product/legal-and-compliance.md)).

Còn mở (xem [vision §9](docs/product/vision-and-scope.md)): tên game chính thức (cần tra cứu nhãn hiệu), công nghệ.

## Đóng góp

Mọi thay đổi qua Pull Request. Đọc [quy trình phát triển](docs/workflows/development-workflow.md). **Đổi cơ chế thì cập nhật tài liệu trong cùng PR.** Tên mới phải qua kiểm tra rò rỉ tên IP ([reskin-spec §10](docs/product/reskin-spec.md)).
