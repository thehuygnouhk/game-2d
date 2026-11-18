# Kinh tế & Kiếm tiền

> **Trạng thái:** Draft v0.1 · **Phụ thuộc:** [items](07-items-and-equipment.md) · [legal](../product/legal-and-compliance.md)
> Mục tiêu: nền kinh tế **ổn định lâu dài** và mô hình thu phí **không phá cân bằng**.

## 1. Tiền tệ

| Tiền | Ký hiệu | Loại | Kiếm bằng | Giao dịch giữa người chơi? |
|------|---------|------|-----------|-----------------------------|
| **Yul** | Y | Mềm | Quái, nhiệm vụ, bán đồ, boss | **Có** |
| **Ngọc Mana** | 💎 | Cao cấp | Nạp tiền, sự kiện (ít), thành tích, Thẻ Tháng | **Không** (khóa tài khoản) |
| **Điểm Cống Hiến** | CH | Đội | Nhiệm vụ Đội, Squad War | Không |
| **Huy hiệu Quân Công** | HQ | Chiến trường | Chiến Trường Vương Quốc, Đấu Trường | Không |
| **Danh Vọng Phe** | DV | Phe | Nhiệm vụ phe | Không |
| **Sao** | ★ | Danh vọng | Thành tích | Không |

**Nguyên tắc:** Ngọc Mana **không giao dịch** được giữa người chơi để chống mua bán tiền thật bên ngoài (RMT) và rửa tiền. Chợ Ký Gửi chỉ dùng **Yul**.

## 2. Nguồn thu và hố chi Yul (faucet & sink)

### 2.1 Nguồn Yul (faucet)

| Nguồn | Mức |
|-------|-----|
| Quái rơi | `4·L` mỗi quái (±20%) |
| Nhiệm vụ chính/ngày | Cố định theo cấp |
| Bán đồ cho NPC | 25% giá trị |
| Boss, hầm ngục | Rương Yul |
| Điểm danh, sự kiện | Gói nhỏ |

Ước tính thu nhập: **~1.200 × L Yul/giờ** săn quái. Lv50 ≈ 60.000 Y/h; Lv100 ≈ 120.000 Y/h.

### 2.2 Hố chi (sink)

| Hố chi | Chi phí tiêu biểu | Tần suất |
|--------|-------------------|----------|
| Cường hóa | Xem [items §6](07-items-and-equipment.md) | Cao |
| Nâng kỹ năng | 60.000 Y lên cấp 7 | Trung |
| Dịch chuyển Finral | `50 × Lv_đích` | Cao |
| Bình thuốc | 20–2.000 Y | Cao |
| Phí giao dịch / Ký gửi | 5% giá bán | Cao |
| Phí lập Squad | 50.000 Y | 1 lần |
| Nâng cấp Squad | Tăng theo cấp | Thấp |
| Mở rộng túi/kho | Tăng dần | Thấp |
| Vòng quay (vé Yul) | 1.000 Y/lượt | Trung |
| Chế tạo | Xem [items §9](07-items-and-equipment.md) | Trung |

**Mục tiêu:** tổng Yul bị rút ≥ **85–95%** tổng Yul sinh ra mỗi tuần. Nếu vượt, bật sink sự kiện hoặc giảm drop.

## 3. Cửa hàng NPC

| NPC | Bán |
|-----|-----|
| Bác Theo (NPC041, M006) | Bình HP/MP, Cuộn Dịch Chuyển, trang bị Thường |
| Charmy (NPC025, M015) | Thức ăn buff |
| Gordon (NPC027) | Thảo dược, thuốc giải độc |
| Zora (NPC030) | Bẫy, vật phẩm chiến đấu |
| Magna (NPC022) | Vũ khí Hỏa tầm thấp |
| Cửa hàng phe | Trang bị, trang phục (dùng Danh Vọng) |
| Cửa hàng Đội | Buff Squad, vật phẩm Đội (dùng Điểm Cống Hiến) |
| Cửa hàng Huy hiệu | Trang bị PvP (dùng HQ) |
| Cửa hàng Ngọc Mana | Tiện ích, thẩm mỹ (xem §6) |

- Giá mua cố định, **giá bán lại 25%** giá trị.
- **Mua lại (buy-back)** vật phẩm vừa bán trong 30 phút.

## 4. Giao dịch người chơi

### 4.1 Giao dịch trực tiếp

- Mở cửa sổ giao dịch (cùng map, khoảng cách ≤ 300 px, **Lv ≥ 10**).
- Mỗi bên đặt tối đa 8 vật phẩm + Yul, hai bên phải **xác nhận hai lần** (xác nhận → khóa → xác nhận lại).
- Server thực hiện **một transaction**: nếu bất kỳ bước lỗi, hủy toàn bộ.
- **Không** giao dịch vật phẩm khóa.
- Mọi giao dịch ghi log (`trade_logs`) để kiểm tra.

### 4.2 Chợ Ký Gửi (NPC044)

| Quy tắc | Giá trị |
|---------|---------|
| Đơn vị tiền | Chỉ **Yul** |
| Phí đăng | 1% giá niêm yết (không hoàn) |
| Phí bán | 5% giá bán |
| Thời hạn | 48 giờ |
| Tối đa | 10 mục / nhân vật |
| Biên độ giá | Thấp nhất = 50% giá NPC, cao nhất = 5.000% |
| Cấp tối thiểu | Lv20 |
| Hiển thị | Lọc theo loại, cấp, độ hiếm, hệ |
| Tìm kiếm | Theo tên, sắp xếp theo giá |
| Chống thao túng | Giới hạn mua tối đa 100 vật phẩm/giờ; cảnh báo giá bất thường |

## 5. Vòng Quay Sợi Chỉ Định Mệnh (NPC024 Vanessa)

| Tham số | Giá trị |
|---------|---------|
| Vé quay | 1.000 Y, hoặc **Vé Chỉ Vàng** từ sự kiện/thành tích. **Không** bán bằng Ngọc Mana trực tiếp |
| Giải thưởng | Yul, Đá Mana, Bình, nguyên liệu, ngọc cấp thấp, trang phục thử |
| **Tỉ lệ công khai** | Hiển thị đầy đủ trong UI |
| Pity | 100 lượt đảm bảo 1 giải **Hiếm** |
| Loại trừ | Không có trang bị Sử Thi trở lên, không có vật phẩm tăng sức mạnh độc quyền |

| Nhóm giải | Xác suất |
|-----------|----------|
| Yul (500–5.000) | 45% |
| Bình, thức ăn | 25% |
| Nguyên liệu | 18% |
| Ngọc cấp 1–2 | 8% |
| Đá Mana Trung/Cao | 3% |
| Trang phục thử (7 ngày) | 0,9% |
| Giải đặc biệt hàng tháng | 0,1% |

## 6. Ngọc Mana — tiện ích, không phải sức mạnh độc quyền

### 6.1 Có thể mua bằng Ngọc Mana

| Nhóm | Ví dụ | Chi phí |
|------|-------|---------|
| Tiện ích | Mở rộng túi/kho, thêm Thẻ Auto, Bùa Bảo Hộ, Bình Rửa Tiềm Năng | 10–100 💎 |
| Hồi sinh | Hồi sinh tại chỗ | 5 💎 |
| Đổi hệ phép | 100 💎 | |
| Đổi tên | 50 💎 | |
| Thẩm mỹ | Trang phục, hiệu ứng, danh hiệu, Chổi Bay | 50–1.000 💎 |
| Tăng tốc | Cuộn EXP ×2 (30 phút) | 20 💎 |
| Slot | Thêm slot nhân vật, Squire phụ | 100–500 💎 |

### 6.2 Không được bán bằng Ngọc Mana

- Trang bị Sử Thi trở lên hoặc **ô khảm** cao.
- Vũ khí Mùa Giải.
- Bảo đảm thành công cường hóa +9 trở lên.
- Ưu thế PvP trực tiếp (miễn nhiễm, sát thương).

Mục tiêu: người **không nạp** vẫn đạt Lv100 và trang bị cao nhất với cùng sự kiện/nhiệm vụ, tốn thời gian hơn khoảng **20–30%**.

## 7. Nạp Ngọc Mana

### 7.1 Gói nạp (mẫu, có thể điều chỉnh theo thị trường)

| Gói | Giá (VND) | Ngọc Mana cơ bản | Thưởng nạp lần đầu |
|-----|-----------|------------------|---------------------|
| Nhỏ | 20.000 | 200 | ×2 (lần đầu mỗi gói) |
| Vừa | 50.000 | 520 | ×2 |
| Lớn | 100.000 | 1.100 | ×2 |
| Siêu | 200.000 | 2.300 | ×2 |
| Cực | 500.000 | 6.000 | ×2 |

### 7.2 Kênh thanh toán

- Ví điện tử (MoMo, ZaloPay), chuyển khoản/QR ngân hàng, thẻ cào điện thoại.
- Cổng thanh toán xác nhận qua **webhook có chữ ký**; hệ thống **idempotent** theo mã giao dịch. Xem [security](../architecture/security-and-anticheat.md).

### 7.3 Sản phẩm định kỳ

| Sản phẩm | Giá | Nội dung |
|----------|-----|----------|
| **Giấy Phép Hiệp Sĩ** (Thẻ Tháng) | 50.000 VND / 30 ngày | 300 💎 ngay + 20 💎/ngày × 30 ngày + 1 giờ Auto/ngày |
| **Hành Trình Hiệp Sĩ** (Battle Pass mùa) | 100.000 VND / mùa | Thưởng thẩm mỹ, vật phẩm tiện ích; phiên bản miễn phí vẫn có thưởng |
| **Cấp Quý Tộc** (VIP) | Theo tổng nạp tích lũy | 10 bậc, quyền lợi tiện ích (ô túi, giờ Auto, quà ngày), **không** thêm chỉ số chiến đấu |

### 7.4 Giới hạn bảo vệ người chơi

| Biện pháp | Quy định |
|-----------|----------|
| Hạn mức nạp theo độ tuổi | Dưới 18 tuổi: tối đa **500.000 VND/tháng** (xác thực tuổi, xem [legal](../product/legal-and-compliance.md)) |
| Cảnh báo | Cảnh báo khi nạp ≥ 1.000.000 VND/ngày |
| Hoàn tiền | Theo chính sách, qua GM (xem [admin guide](../guides/admin-gm-guide.md)) |
| Xác nhận | Màn hình xác nhận hiển thị rõ số tiền và vật phẩm |
| Không dark pattern | Không đếm ngược gây áp lực, không che tỉ lệ vòng quay |

## 8. Giám sát kinh tế

| Chỉ số | Cách đo | Ngưỡng cảnh báo |
|--------|---------|-----------------|
| Tổng Yul lưu hành | Tổng `characters.yul` + Chợ | Tăng > 8%/tuần |
| Tỉ lệ faucet/sink | Log `currency_ledger` | Sink < 85% faucet |
| Giá trung bình Đá Mana | Giá Chợ | Tăng > 30%/tuần |
| Hệ số Gini | Phân bố Yul | > 0,85 |
| Số giao dịch bất thường | Cùng cặp người chơi, giá chênh | Chuyển > 10 triệu Y/ngày |
| Doanh thu / ARPU / ARPPU | Dashboard nạp | Theo KPI |

**Công cụ điều chỉnh** (qua cấu hình, không cần deploy): tỉ lệ rơi Yul và đồ, giá NPC, phí Chợ, sự kiện sink (ví dụ *Cuộc Đấu Giá Đặc Biệt*), tạm dừng drop vật phẩm gây lạm phát.

## 9. Chính sách chống gian lận kinh tế

| Rủi ro | Biện pháp |
|--------|-----------|
| Nhân bản vật phẩm | Mọi chuyển vật phẩm trong **một transaction DB**, khóa dòng (`SELECT … FOR UPDATE`), ràng buộc duy nhất |
| Bán tiền thật (RMT) | Giới hạn giao dịch người mới, theo dõi chuyển Yul bất thường, khóa tài khoản |
| Bot farm | Phát hiện hành vi, captcha, giới hạn Auto Hunt, xem [security](../architecture/security-and-anticheat.md) |
| Lợi dụng lỗi | Cơ chế **rollback** tài khoản/nhân vật theo log (xem [admin guide](../guides/admin-gm-guide.md)) |
| Gian lận thanh toán | Webhook chữ ký, đối soát hằng ngày, khóa tài khoản chargeback |
