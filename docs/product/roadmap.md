# Lộ trình (Roadmap)

> **Trạng thái:** Draft v0.1 · **Giả định:** đội 6–8 người, bắt đầu **Tuần 1 = bắt đầu Phase 0**. Các mốc là **ước lượng** để lập kế hoạch, điều chỉnh sau mỗi phase.

## 1. Đội ngũ giả định

| Vai trò | Số người | Ghi chú |
|---------|----------|---------|
| Producer / PM | 1 | Kiêm QA điều phối |
| Game Designer / Narrative | 1 | Cân bằng, nội dung, kịch bản |
| Backend / Server | 2 | Game server, DB, thanh toán |
| Client | 2 | Phaser, UI |
| Artist (pixel, animation) | 2 | 1 nhân vật/quái, 1 map/UI/VFX |
| DevOps / QA (bán thời gian) | 1 | CI/CD, giám sát, kiểm thử |

## 2. Dòng thời gian

```mermaid
gantt
    title Lộ trình BCO (tuần)
    dateFormat  YYYY-MM-DD
    axisFormat  W%W
    section Phase 0
    Nền tảng kỹ thuật          :p0, 2026-12-01, 4w
    section Phase 1
    Vertical Slice             :p1, after p0, 8w
    section Phase 2
    Alpha nội bộ               :p2, after p1, 12w
    section Phase 3
    Closed Beta                :p3, after p2, 12w
    section Phase 4
    Launch                     :p4, after p3, 12w
    section Phase 5
    Live Ops (Mùa 2+)          :p5, after p4, 12w
```

## 3. Các Phase

### Phase 0 — Nền tảng (4 tuần)

| Hạng mục | Chi tiết |
|----------|----------|
| Kỹ thuật | Monorepo, CI, lint/test, Docker Compose, schema DB v0 |
| Mạng | WebSocket skeleton, giao thức binary, tick loop 20 Hz |
| Client | Phaser boot, tải map Tiled, di chuyển có dự đoán |
| Đặc tả reskin | **[reskin-spec](reskin-spec.md)** (giữ concept, đổi tên + 6 điểm nhận diện): duyệt đặc tả, đặt tên 40 NPC, 31 bản đồ, 30 boss. Chạy **song song** với phần kỹ thuật. **Art chỉ bắt đầu sau khi đặc tả được duyệt** |
| Nội dung | Style guide, nhân vật mẫu, bảng màu (sau khi đặc tả được duyệt) |
| **Tiêu chí hoàn thành** | 2 client cùng thấy nhau di chuyển trên M001, ping < 100 ms cục bộ, CI xanh; **đặc tả reskin được duyệt** |

### Phase 1 — Vertical Slice (8 tuần)

| Hạng mục | Chi tiết |
|----------|----------|
| Gameplay | Chiến đấu cơ bản, AI quái, rơi đồ, Hỏa & Thủy 3 kỹ năng đầu |
| Hệ thống | Túi đồ, trang bị 4 ô, nhiệm vụ Chương 1, Lễ Nhận Ma Đạo Thư |
| Nội dung | M001–M005, 7 quái R01, Slime Vua, 12 nhiệm vụ |
| Hạ tầng | Đăng ký/đăng nhập, lưu nhân vật, 1 realm dev |
| **Tiêu chí hoàn thành** | Playtest 30 phút liền mạch với 20 người, không crash, load test 50 CCU, retention test nội bộ ≥ 60% hoàn thành Chương 1 |

### Phase 2 — Alpha nội bộ (12 tuần)

| Hạng mục | Chi tiết |
|----------|----------|
| Gameplay | 7 hệ phép, cấp 1–60, hiệu ứng trạng thái |
| Hệ thống | Nhóm, bạn bè, thư, giao dịch, cường hóa, chat đầy đủ |
| Nội dung | R01–R05, Chương 1–4, nhiệm vụ ngày |
| Hạ tầng | Staging, giám sát cơ bản, backup tự động |
| **Tiêu chí** | 200 CCU, 0 lỗi mất dữ liệu trong 2 tuần, bộ test công thức pass, kinh tế mô phỏng ổn định |

### Phase 3 — Closed Beta (12 tuần)

| Hạng mục | Chi tiết |
|----------|----------|
| Gameplay | Squad, Hầm Ngục, Boss thế giới, PK, Auto Hunt, Khảm ngọc, Chợ |
| Thương mại | Nạp **sandbox → production**, Thẻ Tháng |
| Công cụ | Admin panel, GM tool, ledger, dashboard |
| Bảo mật | Anti-cheat v1, rate limit, captcha |
| **Tiêu chí** | 1.000 CCU load test, D1 ≥ 35%, crash < 2%, thanh toán đối soát đúng 100% |

### Phase 4 — Launch (12 tuần)

| Hạng mục | Chi tiết |
|----------|----------|
| Gameplay | Cấp 100, Chương 5–8, Raid, Chiến Trường, Squad War, Phản Ma, Spirit Dive |
| Nền tảng | Android/iOS wrapper, tối ưu hiệu năng |
| Vận hành | Sự kiện mùa, Battle Pass, hạn mức nạp theo độ tuổi |
| Tuân thủ | Giấy phép, xác thực tài khoản, chính sách (xem [legal](legal-and-compliance.md)) |
| **Tiêu chí** | 5.000 CCU load test, p95 ≤ 150 ms, uptime thử ≥ 99,5%, bảo mật được đánh giá độc lập |

### Phase 5 — Live Ops (liên tục)

- **Mùa 2:** nâng cấp tối đa lên 120, khu vực mới, hệ phép mới.
- Sự kiện hàng tuần/tháng, cân bằng định kỳ, mở máy chủ mới theo CCU.
- Nội dung theo **mùa 3 tháng**.

## 4. Cột mốc nội dung

| Phase | Map | Quái | Boss | Nhiệm vụ chính | Hệ phép đầy đủ |
|-------|-----|------|------|----------------|----------------|
| 1 | 5 | 7 | 1 | 12 | 2 (3 kỹ năng) |
| 2 | 19 | 28 | 12 | 48 | 7 |
| 3 | 22 | 33 | 20 | 58 | 7 |
| 4 | 31 | 49 | 26 + 4 boss thế giới | 90 | 7 + Phản Ma |

## 5. Rủi ro & cách xử lý

| Rủi ro | Xác suất | Ảnh hưởng | Xử lý |
|--------|----------|-----------|-------|
| Phạm vi phình | Cao | Cao | Cắt P2 trước, mỗi phase đóng băng tính năng |
| Nghệ thuật nghẽn | Trung bình | Cao | Paper-doll tái dùng, nhờ ngoài làm VFX, palette swap |
| Hiệu năng WebSocket | Trung bình | Cao | Load test từ Phase 1, giới hạn AOI |
| Bản quyền IP | Cao | Rất cao | **Đã chọn reskin mức "đổi tên + 6 điểm nhận diện"** (rủi ro còn lại trung bình). Chốt đặc tả ở Phase 0, trước khi sản xuất art; luật sư IP duyệt trước Closed Beta. Xem [reskin-spec](reskin-spec.md) |
| Gian lận/bot | Cao | Cao | Anti-cheat từ Phase 2, log đầy đủ |
| Lạm phát kinh tế | Trung bình | Cao | Mô phỏng + giám sát + công cụ điều chỉnh |
| Mất nhân sự chủ chốt | Thấp | Cao | Tài liệu, review chéo, ADR |

## 6. Definition of Done theo hạng mục

| Loại | Điều kiện hoàn thành |
|------|----------------------|
| Tính năng | Code review, test tự động, tài liệu cập nhật, có metric, QA pass, không lỗi P0/P1 |
| Nội dung | Qua validator, playtest, i18n đầy đủ, asset đúng giới hạn dung lượng |
| Cân bằng | Có báo cáo mô phỏng và dữ liệu playtest |
| Release | Đã chạy trên staging ≥ 48h, có kế hoạch rollback |

## 7. Chỉ số theo dõi dự án

| Chỉ số | Mục tiêu |
|--------|----------|
| Velocity | Ổn định ±20% sau Phase 1 |
| Lỗi mở P0/P1 | 0 trước mỗi phase gate |
| Tỉ lệ build CI pass | ≥ 95% |
| Thời gian từ PR đến merge | ≤ 2 ngày làm việc |
| Độ phủ test (core formulas) | ≥ 90% |
