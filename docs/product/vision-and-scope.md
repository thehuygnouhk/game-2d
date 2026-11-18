# Tầm nhìn & Phạm vi dự án

> **Trạng thái:** Draft v0.2 (bản reskin) · **Cập nhật:** 2026-11-18 · **Chủ sở hữu:** Product/Design
> **Liên quan:** [requirements](requirements.md) · [roadmap](roadmap.md) · [glossary](../glossary.md)

## 1. Tóm tắt (elevator pitch)

**Huyền Thư Ký (HTK)** là game nhập vai trực tuyến nhiều người chơi (MMORPG) 2D cuộn ngang. Cơ chế lấy từ **Ninja School Online** và **Ngọc Rồng Online (NRO)**: nhân vật chạy nhảy trên các map ngang, đánh quái bằng kỹ năng, làm nhiệm vụ NPC, nâng cấp trang bị, lập bang hội và săn boss. Thế giới là **thế giới gốc của dự án**: một vương quốc nơi mỗi người nhận một cuốn sách phép lúc mười lăm tuổi ([lore](../game-design/01-lore-and-story.md)).

Người chơi bắt đầu là một đứa trẻ ở **Làng Suối Mơ**. Họ nhận **Huyền Thư**, vào **Pháp Vệ Đoàn** qua **Mùa Tuyển Thư**, gia nhập một **Đội**, đi tìm người thầy mất tích, và đi từ dân làng đến **Ứng Viên Chấp Bút**.

> **Lưu ý:** Dự án ở giai đoạn thiết kế, theo hướng **thương mại với IP gốc thay thế**. Xem [reskin-spec](reskin-spec.md) và [legal-and-compliance](legal-and-compliance.md).

## 2. Tầm nhìn & 4 trụ cột thiết kế

| # | Trụ cột | Ý nghĩa với người chơi | Thể hiện trong game |
|---|---------|------------------------|---------------------|
| 1 | **Sách là may, nỗ lực là mình** | Cuốn sách phép có thể không công bằng, nhưng ai cũng tiến lên được bằng nỗ lực | Hệ thống nâng cấp luôn có cách bù (bảo hộ, tích lũy, không phá đồ); ấn bản Huyền Thư nâng bằng nhiệm vụ, không may rủi; cốt truyện về công bằng |
| 2 | **Đồng đội — Đội** | Mạnh nhất khi đi cùng nhau | Đội (bang), nhóm 5 người, hầm ngục, Chiến Đội, buff Đội |
| 3 | **Ma lực & Huyền Thư** | Mỗi người một thuộc tính phép, một cuốn Huyền Thư | 7 hệ phép + Phong Ấn Xạ Thủ, ấn bản Sơ Bản → Tu Bản → Định Bản, Nhập Linh |
| 4 | **Từ dân thường đến Chấp Bút** | Hành trình thăng hạng rõ ràng | Hạng: Dân Làng → Thư Lại Tập Sự → Pháp Vệ → Pháp Vệ Tinh Anh → Đội Phó → Đội Trưởng → Ứng Viên Chấp Bút; hệ thống **Công Trạng** |

**Nguyên tắc đi kèm: Solo-first.** Trụ cột "Đồng đội" nghĩa là *đi cùng nhau thì mạnh hơn và vui hơn*, **không** nghĩa là bắt buộc phải có nhóm. Như Ninja School và Ngọc Rồng, người chơi tự săn quái, làm nhiệm vụ và hoàn thành cốt truyện một mình ở mọi hệ phép. Xem [combat §11](../game-design/04-combat-and-progression.md).

## 3. Đối tượng người chơi

| Persona | Mô tả | Họ cần gì |
|---------|-------|-----------|
| **Fan hoài niệm** (18–30) | Từng chơi Ninja School / NRO | Cảm giác quen: cày quái, nâng cấp trang bị, săn boss, đua top |
| **Fan fantasy kiểu anime** (13–25) | Thích thế giới phép thuật, đội nhóm, nhiệt huyết; chưa chắc từng chơi MMO | Nhân vật dễ mến, cốt truyện cuốn, hệ thống dễ vào |
| **Người chơi xã hội** | Thích bang hội, trò chuyện | Đội, nhóm, chat, sự kiện cuối tuần |
| **Người chơi cày kỹ** | Thích tối ưu build | Cường hóa, khảm ngọc, set bonus, bảng xếp hạng |

## 4. Nền tảng & thông số kỹ thuật tổng quan

| Hạng mục | Quyết định mặc định (có thể đổi, xem §9) |
|----------|-------------------------------------------|
| Nền tảng đầu tiên | **Web (HTML5)** trên PC và mobile browser |
| Nền tảng sau | Android/iOS qua wrapper (Capacitor) ở Phase 4 |
| Độ phân giải logic | 960×540 (16:9), scale giữ tỉ lệ |
| Điều khiển | PC: bàn phím + chuột. Mobile: joystick ảo + nút kỹ năng |
| Ngôn ngữ | Tiếng Việt (chính), tiếng Anh (sau) |
| Mô hình kinh doanh | Free-to-play, nạp **Nén Bạc**, hạn chế pay-to-win (xem [economy](../game-design/08-economy-and-monetization.md)) |
| Quy mô máy chủ | 1 realm ≈ 5.000 CCU, mỗi map chia nhiều **Khu** (zone) |

## 5. Bảng đối chiếu: cơ chế gốc → HTK

Đây là bảng quan trọng nhất của dự án. Mọi cơ chế cốt lõi của Ninja School (NS) và NRO được giữ lại và đặt tên theo thế giới của HTK.

| Cơ chế | Ninja School / NRO | HTK | Tài liệu |
|--------|--------------------|-----|----------|
| Chọn tộc / xuất thân | NRO: Trái Đất, Namek, Xayda | 3 Xuất thân: **Dân Làng**, **Thế Gia**, **Hậu Duệ Tộc Cổ Thư** | [03](../game-design/03-origins-classes-skills.md) |
| Chọn trường / hệ | NS: 6 trường, mỗi trường 1 hệ | 7 hệ phép chọn ở Lv10 qua **Lễ Khai Thư** + hệ ẩn **Phong Ấn Xạ Thủ** | [03](../game-design/03-origins-classes-skills.md) |
| Cộng điểm tiềm năng | NS: điểm mỗi cấp. NRO: tiềm năng | +5 **Điểm Tiềm Năng** mỗi cấp (HP/MP/ATK/DEF/Chí mạng) | [04](../game-design/04-combat-and-progression.md) |
| Sức mạnh hiển thị | NRO: Sức mạnh | **Lực Chiến** (Combat Power) | [04](../game-design/04-combat-and-progression.md) |
| Đệ tử | NRO: đệ tử đi theo, lớn theo sư phụ | **Đệ Tử** (Squire) | [10](../game-design/10-companions-and-mounts.md) |
| Ngọc rồng 7 sao | NRO: gom 7 viên, gọi rồng thần | **7 Trang Rời** → triệu hồi **Tứ Đại Nguyên Linh** | [09](../game-design/09-social-squad-pvp-events.md) |
| Đậu thần | NRO: hồi đầy HP/KI | **Lá Thuốc Cổ** | [07](../game-design/07-items-and-equipment.md) |
| Gia tộc | NS: gia tộc, nhà gia tộc | **Đội** + Sảnh Đội | [09](../game-design/09-social-squad-pvp-events.md) |
| Chiến trường | NS: Hắc vs Bạch | **Chiến Trường Lục–Xích** (Lục Nguyên vs Xích Sa) | [09](../game-design/09-social-squad-pvp-events.md) |
| Hang động | NS: hang động theo nhóm | **Hầm Ngục** (Dungeon) | [05](../game-design/05-world-maps-monsters.md) |
| Nhiệm vụ chính / ngày | Cả hai | Chuỗi chính 8 chương + **Bảng Nhiệm Vụ Pháp Vệ** | [06](../game-design/06-quests-and-missions.md) |
| Khu vực (khu 1…n) | Cả hai | **Khu** (zone), tối đa 30 người/khu | [05](../game-design/05-world-maps-monsters.md) |
| Thú cưỡi / bay | NS: thú cưỡi. NRO: bay | **Chổi Bay** + **Linh Thú** | [10](../game-design/10-companions-and-mounts.md) |
| Boss thế giới | NRO: boss xuất hiện giờ cố định | **Boss Thế Giới** theo lịch | [09](../game-design/09-social-squad-pvp-events.md) |
| Ký gửi / chợ | NRO: ký gửi | **Chợ Ký Gửi** ở Chợ Thượng Đô | [08](../game-design/08-economy-and-monetization.md) |
| Vòng quay may mắn | Cả hai | **Vòng Quay Chữ Vàng** | [08](../game-design/08-economy-and-monetization.md) |
| Cường hóa / khảm sao | NS: nâng cấp; NRO: sao pha lê | **Cường hóa +1…+16** và **khảm Hạt Nguyên** | [07](../game-design/07-items-and-equipment.md) |
| Biến hình | NRO: biến khỉ, Super Saiyan | **Nhập Linh** (hợp thể Nguyên Linh), **Nhất Ấn** (Phong Ấn Xạ Thủ) | [03](../game-design/03-origins-classes-skills.md) |
| Cờ PK | NRO: cờ xanh/đỏ | **Cờ PK** + Điểm Tội Lỗi | [09](../game-design/09-social-squad-pvp-events.md) |
| Nạp thẻ | Cả hai | Nạp **Nén Bạc** qua ví điện tử, chuyển khoản, thẻ | [08](../game-design/08-economy-and-monetization.md) |
| Treo máy | Máy chủ tư nhân | **Auto Hunt** chính thức, có giới hạn | [04](../game-design/04-combat-and-progression.md) |

## 6. Phạm vi theo giai đoạn

### 6.1 MVP (Vertical Slice, Phase 1)
- Đăng ký/đăng nhập, 1 máy chủ, tạo nhân vật (3 xuất thân).
- Khu **Làng Suối Mơ** (M001–M004) và **Thượng Đô** (M005).
- 2 hệ phép (Hỏa, Thủy) với 3 kỹ năng đầu.
- Chiến đấu thời gian thực, quái, nhặt đồ, túi đồ, trang bị cơ bản.
- Chuỗi nhiệm vụ Chương 1 và Lễ Khai Thư.
- Chat map và chat thế giới.

### 6.2 Beta (Phase 2–3)
- Đủ 7 hệ, cấp 1–60, Chương 1–5.
- Nhóm, bạn bè, thư, giao dịch, chợ ký gửi.
- Cường hóa, khảm ngọc, Đội, Hầm Ngục, Boss thế giới.
- Nạp Nén Bạc (sandbox → production).

### 6.3 Launch (Phase 4)
- Cấp 1–100, Chương 1–8, Phong Ấn Xạ Thủ ẩn.
- Chiến Đội, Chiến Trường Lục–Xích, Đấu Trường, 7 Trang Rời.
- Đệ Tử, Chổi Bay, Linh Thú.
- Mobile wrapper, công cụ GM đầy đủ, chống gian lận.

### 6.4 Ngoài phạm vi (v1)
- 3D, voice chat, điều khiển tay cầm.
- Người chơi tự tạo map hoặc nội dung.
- Marketplace giao dịch tiền thật giữa người chơi.
- Nhiều server hợp nhất xuyên server (cross-server) ngoài Chiến Trường.

## 7. Chỉ số thành công (KPI mục tiêu)

| Chỉ số | Beta | Launch + 3 tháng |
|--------|------|------------------|
| Retention D1 / D7 / D30 | 35% / 12% / 4% | 40% / 15% / 6% |
| Thời gian phiên trung bình | ≥ 20 phút | ≥ 25 phút |
| Tỉ lệ nạp (payer conversion) | — | 3–5% |
| Tỉ lệ crash client | < 2% | < 1% |
| Độ trễ p95 (ping tới server) | < 150 ms | < 120 ms |
| Tỉ lệ hoàn thành Chương 1 | ≥ 70% | ≥ 80% |

## 8. Rủi ro chính

| Rủi ro | Mức | Giảm thiểu |
|--------|-----|-----------|
| **Bản quyền IP** (concept còn gần một tác phẩm có sẵn) | Trung bình | Đã chọn reskin mức "đổi tên + 6 điểm nhận diện"; còn điểm chung về concept. Đối chiếu độc lập và luật sư IP trước Closed Beta. Xem [reskin-spec](reskin-spec.md) |
| Gian lận, bot, nhân bản vật phẩm | Cao | Server-authoritative, transaction nghiêm ngặt, log đầy đủ. Xem [security](../architecture/security-and-anticheat.md) |
| Pay-to-win phá cân bằng kinh tế | Cao | Giới hạn Nén Bạc ở tiện ích/thẩm mỹ, chống lạm phát bằng sink. Xem [economy](../game-design/08-economy-and-monetization.md) |
| Phạm vi quá lớn cho đội nhỏ | Cao | Làm theo vertical slice; nội dung theo data-driven pipeline |
| Hiệu năng WebSocket khi đông | Trung bình | Chia Khu, AOI, binary protocol, load test sớm |
| Nghệ thuật tốn thời gian | Trung bình | Paper-doll sprite dùng chung, tái dùng bộ khung animation |

## 9. Giả định & quyết định mở

| # | Chủ đề | Mặc định hiện tại | Ai quyết định |
|---|--------|-------------------|---------------|
| D1 | Tên game chính thức | **Huyền Thư Ký** là tên tạm, **chưa tra cứu nhãn hiệu**. Phương án dự phòng: *Chấp Bút Truyền Kỳ*. Cần tra cứu nhãn hiệu, tên miền, tên trên cửa hàng ứng dụng ([reskin-spec §5.2](reskin-spec.md#52-thế-giới)) | Product owner |
| D2 | Công nghệ client | TypeScript + Phaser 3 (web-first) | Tech lead |
| D3 | Công nghệ server | Node.js + TypeScript, PostgreSQL, Redis | Tech lead |
| D4 | Có cho Auto Hunt chính thức? | Có, giới hạn 3 giờ/ngày | Design |
| D5 | Thương mại hóa hay phi lợi nhuận? | **Đã quyết:** thương mại, với **IP gốc thay thế (reskin)**. Xem [reskin-plan](reskin-plan.md) | Product owner |
| D6 | Mức reskin | **Đã quyết:** giữ concept, đổi toàn bộ tên và thiết kế lại 6 điểm nhận diện; đã áp dụng lên toàn bộ tài liệu (Draft v0.2). Còn chờ duyệt từng mục ở [reskin-spec §9](reskin-spec.md#9-danh-sách-duyệt) | Narrative |
