# Mục lục tài liệu

> Bộ tài liệu thiết kế cho **Black Clover Online: Ma Đạo Thư (BCO)**. Trạng thái toàn bộ: **Draft v0.1**, cập nhật 2026-11-18.

## 1. Sản phẩm (`product/`)

| Tài liệu | Nội dung |
|----------|----------|
| [vision-and-scope](product/vision-and-scope.md) | Tầm nhìn, trụ cột, đối tượng, **bảng đối chiếu cơ chế NS/NRO → BCO**, phạm vi, KPI, rủi ro, quyết định mở |
| [requirements](product/requirements.md) | Yêu cầu chức năng (FR) và phi chức năng (NFR), truy vết |
| [roadmap](product/roadmap.md) | 6 phase, mốc, tiêu chí hoàn thành, đội ngũ, rủi ro |
| [legal-and-compliance](product/legal-and-compliance.md) | IP, quy định game, dữ liệu cá nhân, thanh toán, điều khoản |
| [reskin-plan](product/reskin-plan.md) | **Kế hoạch thương mại với IP gốc thay thế:** cần đổi gì, giữ gì, quy trình, danh sách kiểm tra |

## 2. Thiết kế game (`game-design/`)

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 01 | [lore-and-story](game-design/01-lore-and-story.md) | Thế giới, 8 chương cốt truyện, chủ đề |
| 02 | [characters-and-npcs](game-design/02-characters-and-npcs.md) | Nhân vật gốc làm NPC, dịch vụ, phe, boss cốt truyện |
| 03 | [origins-classes-skills](game-design/03-origins-classes-skills.md) | 3 Xuất thân, 7 hệ phép + Phản Ma, 55 kỹ năng, Spirit Dive, Ma Đạo Thư |
| 04 | [combat-and-progression](game-design/04-combat-and-progression.md) | EXP, chỉ số, công thức sát thương, AI, boss, rơi đồ, chết, Auto Hunt |
| 05 | [world-maps-monsters](game-design/05-world-maps-monsters.md) | 31 map, 49 quái, 30 boss (26 cốt truyện + 4 boss thế giới), hầm ngục, spawn |
| 06 | [quests-and-missions](game-design/06-quests-and-missions.md) | Chính tuyến, nhiệm vụ ngày/tuần, phe, thành tích |
| 07 | [items-and-equipment](game-design/07-items-and-equipment.md) | Độ hiếm, 10 ô, set, cường hóa, khảm ngọc, tiêu hao |
| 08 | [economy-and-monetization](game-design/08-economy-and-monetization.md) | Tiền tệ, faucet/sink, chợ, vòng quay, nạp, bảo vệ người chơi |
| 09 | [social-squad-pvp-events](game-design/09-social-squad-pvp-events.md) | Chat, nhóm, Squad, Squad War, Chiến Trường, Đấu Trường, PK, sự kiện, 7 Linh Thạch |
| 10 | [companions-and-mounts](game-design/10-companions-and-mounts.md) | Hiệp Sĩ Tập Sự, Tinh Linh Hộ Mệnh, Chổi Bay |
| 11 | [ui-ux-spec](game-design/11-ui-ux-spec.md) | Luồng màn hình, HUD, điều khiển, cửa sổ, tiếp cận |
| 12 | [art-audio-direction](game-design/12-art-audio-direction.md) | Phong cách, sprite, paper-doll, bản đồ, VFX, âm thanh, dung lượng |

## 3. Kiến trúc (`architecture/`)

| Tài liệu | Nội dung |
|----------|----------|
| [system-architecture](architecture/system-architecture.md) | Ngữ cảnh, container, công nghệ, monorepo, ADR, mở rộng |
| [server-design](architecture/server-design.md) | Tick, ECS nhẹ, zone/instance, AOI, chiến đấu, lưu trữ, scheduler |
| [client-design](architecture/client-design.md) | Phaser, prediction, paper-doll, input, asset, mobile |
| [network-protocol](architecture/network-protocol.md) | Khung gói, bắt tay, **110 opcode**, mã lỗi, REST |
| [database-schema](architecture/database-schema.md) | ERD, **DDL PostgreSQL (37 bảng)**, giao dịch mẫu, Redis, toàn vẹn |
| [security-and-anticheat](architecture/security-and-anticheat.md) | Mô hình đe dọa, chống gian lận/bot/dupe, thanh toán, GM |
| [infrastructure-devops](architecture/infrastructure-devops.md) | Môi trường, CI/CD, giám sát, sao lưu, bảo trì, tải |

## 4. Quy trình (`workflows/`)

| Tài liệu | Nội dung |
|----------|----------|
| [player-journey](workflows/player-journey.md) | Hành trình người chơi, 10 luồng chức năng dạng sơ đồ |
| [development-workflow](workflows/development-workflow.md) | Git, review, kiểm thử, phát hành, hotfix, ADR |
| [content-pipeline](workflows/content-pipeline.md) | Thêm nội dung bằng file dữ liệu, validator, Tiled, art, i18n |

## 5. Use case (`usecases/`)

| Tài liệu | Nội dung |
|----------|----------|
| [use-cases-player](usecases/use-cases-player.md) | 35 use case người chơi, đặc tả chi tiết |
| [use-cases-admin-system](usecases/use-cases-admin-system.md) | Use case GM/Admin và hệ thống tự động, ma trận quyền |

## 6. Hướng dẫn (`guides/`)

| Tài liệu | Dành cho |
|----------|----------|
| [player-guide](guides/player-guide.md) | Người chơi |
| [admin-gm-guide](guides/admin-gm-guide.md) | GM, Support, Admin |
| [developer-setup-guide](guides/developer-setup-guide.md) | Developer |

## 7. Tra cứu

- [glossary](glossary.md): thuật ngữ và quy ước đặt tên.

## 8. Quy ước tài liệu

| Quy ước | Chi tiết |
|---------|----------|
| Ngôn ngữ | Tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh |
| Sơ đồ | **Mermaid** trong Markdown |
| Mã chuẩn | Kiểu YAML/SQL/TypeScript trong khối mã có gắn ngôn ngữ |
| Số liệu | Là **giá trị khởi điểm**, sẽ cân bằng bằng mô phỏng ([content-pipeline §10](workflows/content-pipeline.md)) |
| Liên kết | Dùng đường dẫn tương đối |
| Trạng thái | Ghi ở đầu mỗi file (Draft/Review/Approved) |
| Cập nhật | Đổi cơ chế, giao thức, DB thì cập nhật tài liệu trong cùng PR |

## 9. Nguồn chân lý cho từng loại thông tin

| Thông tin | Tài liệu chuẩn |
|-----------|----------------|
| Tên gọi, thuật ngữ | [glossary](glossary.md) |
| Công thức EXP, sát thương, quái | [04](game-design/04-combat-and-progression.md) |
| Kỹ năng, khắc hệ | [03](game-design/03-origins-classes-skills.md) |
| ID và danh sách map/quái/boss | [05](game-design/05-world-maps-monsters.md) |
| Cường hóa, độ hiếm, chỉ số trang bị | [07](game-design/07-items-and-equipment.md) |
| Tiền tệ, phí, gói nạp | [08](game-design/08-economy-and-monetization.md) |
| Opcode, mã lỗi | [network-protocol](architecture/network-protocol.md) |
| Bảng DB | [database-schema](architecture/database-schema.md) |
| Yêu cầu và ưu tiên | [requirements](product/requirements.md) |

## 10. Những điều cần xác nhận trước khi chốt

1. **Nguyên tác:** Tên và vai trò các nhân vật phản diện (Chương 6–8), danh sách 9 Đội và chi tiết các arc sau cần **đối chiếu với nguyên tác** nếu còn dùng cho bản fan ([lore §0](game-design/01-lore-and-story.md)). Bản thương mại sẽ **không** bám nguyên tác.
2. **Pháp lý:** Hướng IP **đã chọn: reskin** ([reskin-plan](product/reskin-plan.md)). Việc còn lại là World Bible gốc, và **luật sư IP** duyệt cùng các giấy phép game online tại Việt Nam ([legal](product/legal-and-compliance.md)).
3. **Cân bằng:** Mọi con số là điểm khởi đầu, cần mô phỏng và playtest.
4. **Năng lực server:** Ước tính CCU trong [server-design §13](architecture/server-design.md) cần **load test** từ Phase 1.
