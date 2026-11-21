# Mục lục tài liệu

> Bộ tài liệu thiết kế cho **Huyền Thư Ký (HTK)**. Trạng thái toàn bộ: **Draft v0.2 (bản reskin)**, cập nhật 2026-11-18.

## 1. Sản phẩm (`product/`)

| Tài liệu | Nội dung |
|----------|----------|
| [vision-and-scope](product/vision-and-scope.md) | Tầm nhìn, trụ cột, đối tượng, **bảng đối chiếu cơ chế NS/NRO → HTK**, phạm vi, KPI, rủi ro, quyết định mở |
| [requirements](product/requirements.md) | Yêu cầu chức năng (FR) và phi chức năng (NFR), truy vết |
| [roadmap](product/roadmap.md) | 6 phase, mốc, tiêu chí hoàn thành, đội ngũ, rủi ro; lộ trình bậc thang cho đội nhỏ (§8) |
| [chapter1-pacing](reports/chapter1-pacing.md) | Báo cáo mô phỏng nhịp chơi Chương 1 (`tools/sim/chapter1.py`) |
| [legal-and-compliance](product/legal-and-compliance.md) | IP, quy định game, dữ liệu cá nhân, thanh toán, điều khoản |
| [reskin-plan](product/reskin-plan.md) | **Kế hoạch thương mại với IP gốc thay thế:** cần đổi gì, giữ gì, quy trình, danh sách kiểm tra |
| [reskin-spec](product/reskin-spec.md) | **Đặc tả mức đã chọn (nội bộ; Bước 2 đã áp dụng, chờ duyệt §9):** giữ concept, đổi tên + 6 điểm nhận diện, tám chương mới, thuật ngữ, việc kỹ thuật |

## 1a. World Bible văn hóa Việt (`world-bible/`): **phương án không chọn**

> **Đã loại (2026-11-18):** thay đổi gần như toàn bộ thế giới. Hướng hiện hành là **giữ concept, đổi tên và 6 điểm nhận diện**, xem [reskin-spec](product/reskin-spec.md). Giữ lại để tham khảo, **không dùng làm nguồn nội dung**.

| Tài liệu | Nội dung |
|----------|----------|
| [README](world-bible/README.md) | Tóm tắt một trang, **danh sách duyệt**, việc cần người thật |
| [01 premise-and-pillars](world-bible/01-premise-and-pillars.md) | Tên game, logline, trụ cột, giọng văn, **rào chắn văn hóa** |
| [02 world-and-history](world-bible/02-world-and-history.md) | Vũ trụ quan, lịch sử, Ba Mạch, chín vùng, lễ hội, sinh vật, phong cách hình ảnh |
| [03 magic-linh-system](world-bible/03-magic-linh-system.md) | Linh, Lễ Khai Linh, Linh Vật, Bảy Phái, Thần Nỏ, Hợp Linh, Sổ Tên |
| [04 factions-and-characters](world-bible/04-factions-and-characters.md) | Chín phe, ba bạn, sư phụ, NPC, phản diện |
| [05 main-story](world-bible/05-main-story.md) | Tám chương, cú lật, kết cục, sự kiện |
| [99 internal-mapping-and-audit](world-bible/99-internal-mapping-and-audit.md) | **NỘI BỘ, không phát hành:** ánh xạ sang thiết kế cũ, việc kỹ thuật, đánh giá độc đáo |

## 2. Thiết kế game (`game-design/`)

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 01 | [lore-and-story](game-design/01-lore-and-story.md) | Thế giới, 8 chương cốt truyện, chủ đề |
| 02 | [characters-and-npcs](game-design/02-characters-and-npcs.md) | Nhân vật gốc làm NPC, dịch vụ, phe, boss cốt truyện |
| 03 | [origins-classes-skills](game-design/03-origins-classes-skills.md) | 3 Xuất thân, 7 hệ phép + Phong Ấn Xạ Thủ, 55 kỹ năng, Nhập Linh, Huyền Thư |
| 04 | [combat-and-progression](game-design/04-combat-and-progression.md) | EXP, chỉ số, công thức sát thương, AI, boss, rơi đồ, chết, Auto Hunt |
| 05 | [world-maps-monsters](game-design/05-world-maps-monsters.md) | 31 map, 49 quái, 33 boss (26 cốt truyện + 7 boss theo giờ), hầm ngục, spawn |
| 06 | [quests-and-missions](game-design/06-quests-and-missions.md) | Chính tuyến, nhiệm vụ ngày/tuần, phe, thành tích |
| 07 | [items-and-equipment](game-design/07-items-and-equipment.md) | Độ hiếm, 10 ô, set, cường hóa, khảm ngọc, tiêu hao |
| 08 | [economy-and-monetization](game-design/08-economy-and-monetization.md) | Tiền tệ, faucet/sink, chợ, vòng quay, nạp, bảo vệ người chơi |
| 09 | [social-squad-pvp-events](game-design/09-social-squad-pvp-events.md) | Chat, nhóm, Đội, Chiến Đội, Chiến Trường, Đấu Trường, PK, sự kiện, 7 Trang Rời |
| 10 | [companions-and-mounts](game-design/10-companions-and-mounts.md) | Đệ Tử, Linh Thú, Chổi Bay |
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
| [playtest-hosting](guides/playtest-hosting.md) | Người vận hành đợt chơi thử công khai (bậc B3) |

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
| Thế giới, nhân vật, cốt truyện **bản thương mại** (khi được duyệt) | [reskin-spec](product/reskin-spec.md) |
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

1. **Độc đáo:** cần một người đọc **độc lập**, am hiểu tác phẩm mà concept tham khảo, đối chiếu các tên, nhân vật và tình tiết mới ([reskin-spec §9.1](product/reskin-spec.md)). Mọi tên mới phải qua kiểm tra rò rỉ tên IP ([reskin-spec §10](product/reskin-spec.md)).
2. **Pháp lý:** Hướng IP **đã chọn: reskin mức "đổi tên + 6 điểm nhận diện"** ([reskin-spec](product/reskin-spec.md)). Mức này **vẫn còn rủi ro trung bình** vì cùng concept; việc còn lại là duyệt đặc tả, đối chiếu độc lập, và **luật sư IP** duyệt cùng các giấy phép game online tại Việt Nam ([legal](product/legal-and-compliance.md)).
3. **Cân bằng:** Mọi con số là điểm khởi đầu, cần mô phỏng và playtest.
4. **Năng lực server:** Ước tính CCU trong [server-design §13](architecture/server-design.md) cần **load test** từ Phase 1.
