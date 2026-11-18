# Xã hội, Đội, PvP & Sự kiện

> **Trạng thái:** Draft v0.1 · **Phụ thuộc:** [combat](04-combat-and-progression.md) · [economy](08-economy-and-monetization.md)

## 1. Liên lạc

### 1.1 Kênh chat

| Kênh | Phạm vi | Điều kiện | Ghi chú |
|------|---------|-----------|---------|
| **Map** | Cùng khu | Mặc định | Giãn 1s |
| **Thế giới** | Cả máy chủ | Lv≥20, phí 100 Quan | Giãn 10s |
| **Nhóm** | Nhóm | Trong nhóm | |
| **Đội** | Thành viên Đội | Trong một Đội | |
| **Thì thầm** | 1 người | Trực tuyến | Có thể chặn |
| **Hệ thống** | Toàn server | — | Thông báo boss, sự kiện |
| **Tuyển người** | Cả server | Lv≥10, giãn 30s | Gắn nhãn tuyển Đội/nhóm |

- **Lọc từ cấm** ở server, **mute** tự động khi spam.
- Người chơi có thể **báo cáo** tin nhắn; GM xem log 30 ngày.

### 1.2 Bạn bè & chặn

- Bạn bè tối đa **100**, chặn tối đa **50**.
- **Bạn thân** (cùng làm nhiệm vụ đủ 7 ngày): +5% EXP khi chung nhóm.
- Hiển thị trạng thái: trực tuyến, map hiện tại, đang bận.

### 1.3 Thư (Bác Phu Trạm, NPC028)

- Thư hệ thống, thư người chơi (kèm tối đa 5 vật phẩm + Quan, phí 100 Quan).
- Hạn **30 ngày**, tối đa 100 thư, thư có quà hết hạn sẽ **trả về người gửi** nếu có thể.
- Phần thưởng boss thế giới/Chiến Trường gửi qua thư.

## 2. Nhóm (Party)

| Quy tắc | Giá trị |
|---------|---------|
| Số người | Tối đa **5** |
| Tạo | Mời trực tiếp hoặc *Tìm nhóm* |
| Chế độ nhặt đồ | Tự do / Luân phiên |
| Bonus EXP | +10% mỗi thành viên thêm (xem [combat §2.3](04-combat-and-progression.md)) |
| Hiển thị | Thanh HP thành viên, vị trí trên bản đồ nhỏ |
| Tìm nhóm | Bảng *Tìm Nhóm Hầm Ngục* theo hầm ngục (vai trò chỉ để tham khảo). **Không bắt buộc**: hầm ngục vào một mình được, xem [maps §6.1](05-world-maps-monsters.md) |
| Nhóm Raid | Gộp nhiều nhóm tối đa 15 người trong Raid |

## 3. Đội (bang hội do người chơi lập)

### 3.1 Khởi tạo

| Điều kiện | Giá trị |
|-----------|---------|
| Cấp tối thiểu để lập | Lv20 |
| Phí | 50.000 Quan |
| Tên | 3–20 ký tự, duy nhất theo máy chủ |
| Biểu tượng | Chọn từ bộ biểu tượng có sẵn (8 biểu tượng quẻ của Tám Viện và bộ hình tự ghép) |
| Cô Ký Đội | NPC047 (M008) |

### 3.2 Cấp Đội và sức chứa

| Cấp | Sức chứa | Điểm Cống Hiến cần để lên | Mở khóa |
|-----|----------|---------------------------|---------|
| 1 | 20 | — | Chat Đội, kho Đội cơ bản |
| 2 | 25 | 5.000 | Sảnh Đội |
| 3 | 30 | 15.000 | Nhiệm vụ Đội, buff 1 |
| 4 | 35 | 40.000 | Cửa hàng Đội |
| 5 | 40 | 90.000 | Buff 2, Chiến Đội |
| 6 | 45 | 180.000 | Kho Đội mở rộng |
| 7 | 50 | 320.000 | Buff 3 |
| 8 | 55 | 520.000 | Hầm Ngục Đội |
| 9 | 60 | 800.000 | Buff 4 |
| 10 | 70 | 1.200.000 | Danh hiệu Đội, trang phục độc quyền |

### 3.3 Chức vụ & quyền

| Chức vụ | Số lượng | Quyền |
|---------|----------|-------|
| **Đội Trưởng** | 1 | Tất cả, giải tán, chuyển quyền |
| **Đội Phó** | 2 | Mời/đuổi, duyệt đơn, đăng thông báo |
| **Pháp Vệ Tinh Anh** | 10 | Dùng kho Đội mức cao, mời |
| **Thành viên** | — | Chat, nhiệm vụ, dùng buff |

- **Tự chuyển quyền:** nếu Đội Trưởng không đăng nhập **14 ngày**, quyền chuyển cho Đội Phó hoạt động gần nhất.
- **Rời Đội** → chờ **24 giờ** mới gia nhập Đội khác; bị đuổi không phạt.

### 3.4 Tính năng Đội

| Tính năng | Mô tả |
|-----------|-------|
| **Sảnh Đội** (`I010`) | Map riêng, có NPC bảng nhiệm vụ, kho, Đài Huyền Thư |
| **Quỹ Đội & Điểm Cống Hiến** | Góp Quan → CH; CH để lên cấp, đổi vật phẩm |
| **Nhiệm vụ Đội** | 5 nhiệm vụ/ngày, thưởng CH, EXP |
| **Buff Đội** | +5% EXP / +5% rơi Quan / +3% HP / +3% ATK, mỗi buff bật 1 giờ, tiêu CH |
| **Kho Đội** | Chia vật phẩm, ghi log |
| **Chiến Đội** | §4 |
| **Bảng xếp hạng Đội** | Theo Công Trạng, Chiến Đội, hoạt động |

## 4. Chiến Đội

| Tham số | Giá trị |
|---------|---------|
| Thời gian | **Thứ Bảy 20:00**, kéo dài 30 phút |
| Điều kiện | Đội cấp ≥ 5, có ≥ 10 thành viên đăng ký |
| Ghép đội | Theo xếp hạng và quy mô, ghép **Đội vs Đội** |
| Bản đồ | Instance **Đấu Trường Đội** |
| Số người | 10–20 mỗi bên |
| Mục tiêu | Chiếm 3 điểm kiểm soát; mỗi điểm giữ cộng 2 điểm/10 giây; đánh bại người chơi cộng 5 điểm |
| Kết thúc | Hết 30 phút hoặc 1000 điểm |
| Thưởng | Điểm Cống Hiến, Công Trạng Đội, rương, danh hiệu tuần |

## 5. Chiến Trường Lục–Xích

PvP quy mô lớn giống chiến trường Hắc/Bạch của Ninja School.

| Tham số | Giá trị |
|---------|---------|
| Phe | **Lục Nguyên** vs **Xích Sa** (tự phân phe để cân bằng) |
| Lịch | 19:00 và 21:30 mỗi ngày, 30 phút |
| Điều kiện | Lv≥50, qua Chương 5 |
| Quy mô | 20 vs 20 (có thể 30 vs 30 khi đông) |
| Hàng đợi | Đăng ký tại NPC, vào tự động |
| Mục tiêu | Giữ **Cột Ma Lực** ở giữa; giết người cộng điểm; hạ **Tướng** đối phương |
| Cờ PK | **Cưỡng chế** trong map |
| Chết | Hồi sinh tại căn cứ sau 10s |
| Thưởng | Huy hiệu Quân Công, Công Trạng, rương theo hạng cống hiến; phe thắng ×2 |
| Cân bằng | Sát thương PvP ×0,6, giới hạn buff Ngọc |

## 6. Đấu Trường Pháp Vệ (PvP 1v1)

| Tham số | Giá trị |
|---------|---------|
| Vị trí | M007, NPC026 Đấu Sư Hoàng Thạch |
| Thể thức | 1v1, 3 phút |
| Xếp hạng | Hệ số kiểu Elo, 7 bậc: Đồng, Bạc, Vàng, Bạch Kim, Kim Cương, Pháp Vệ, **Chấp Bút** (top 10) |
| Mùa giải | 4 tuần, reset mềm |
| Vé | 5 trận miễn phí/ngày, thêm trận tốn Quan |
| Cân bằng | Chỉ số được **chuẩn hóa** một phần (trần Lực Chiến theo bậc), sát thương ×0,6 |
| Thưởng | HQ, trang phục độc quyền cuối mùa |

### 6.1 Thách đấu (duel)

- Thách đấu bạn bè/người cùng map khi cả hai đồng ý. Không mất EXP, không ảnh hưởng Điểm Tội Lỗi.

## 7. Cờ PK & Điểm Tội Lỗi

### 7.1 Trạng thái PK

| Trạng thái | Mô tả |
|------------|-------|
| **Hòa Bình** (mặc định) | Không tấn công được và không bị tấn công bởi người chơi khác (ngoại trừ map cưỡng chế) |
| **PK Tự Nguyện** | Bật cờ đỏ; tấn công và bị tấn công bởi người cũng bật cờ |
| **Cưỡng Chế** | Trong Chiến Trường, Chiến Đội, Đấu Trường |

- PK chỉ cho phép ở **Field cấp ≥ 30** (xem [maps](05-world-maps-monsters.md)).
- Bật cờ có **thời gian chờ 60 giây**; tắt cờ chỉ khi **10 phút không giao tranh**.

### 7.2 Điểm Tội Lỗi (chống chơi xấu)

| Hành vi | Điểm |
|---------|------|
| Giết người chơi cấp thấp hơn ≥ 10 cấp | +3 |
| Giết cùng một người > 3 lần trong 10 phút | +5 mỗi lần thêm |
| Tấn công người đang AFK/bị trói trong Town gần cổng | +5 |
| Giết người chơi **đang tắt cờ** (không thể xảy ra, ghi nhận lỗi) | Báo động |

| Mốc | Hậu quả |
|-----|---------|
| ≥ 10 điểm | Tên đỏ, không vào Town |
| ≥ 50 điểm | Giam 30 phút tại **Ngục Pháp Vệ**, không thể PK |
| Giảm điểm | −1 mỗi 10 phút trực tuyến hoặc làm nhiệm vụ cải tạo |

## 8. Sự kiện

### 8.1 Lịch sự kiện định kỳ

| Tần suất | Sự kiện | Thời gian |
|----------|---------|-----------|
| Hằng ngày | Boss thế giới | Xem [maps §5.1](05-world-maps-monsters.md) |
| Hằng ngày | Chiến Trường Lục–Xích | 19:00 / 21:30 |
| Hằng ngày | Điểm danh Pháp Vệ | 00:00 làm mới |
| Hằng tuần | Chiến Đội | T7 20:00 |
| Hằng tuần | Raid | Reset T2 05:00 |
| Hằng tuần | **Săn Trang Rời** | T7 21:00 (xem §9) |
| Hằng tháng | **Lễ Tuyên Công** | Cuối tháng, chốt bảng xếp hạng |
| Theo mùa | Lễ Hội (Xuân, Halloween, Giáng Sinh…) | Theo lịch |

### 8.2 Sự kiện thế giới: Đêm Thư Cháy

- Thông báo toàn máy chủ **10 phút trước**.
- Thượng Đô (M005) bị tấn công theo **5 đợt**, mỗi đợt có quái và một boss nhỏ; đợt cuối **BOSS009**.
- Mọi người trong map nhận thưởng theo đóng góp (sát thương, hồi máu, phòng thủ).
- Thất bại: cổng Thượng Đô bị phong 30 phút; thành công: rương hiếm toàn máy chủ.

### 8.3 Sự kiện mùa (mẫu)

| Sự kiện | Nội dung |
|---------|----------|
| **Hội Xuân (Tết)** | Lì xì Quan, bánh, boss hóa trang, trang phục giới hạn |
| **Đêm Quỷ** | Quái Ma Quỷ xuất hiện ở Town, đổi kẹo lấy trang phục |
| **Lễ Tuyên Công** | Vinh danh người nhiều Công Trạng nhất, trao danh hiệu |
| **Giải Đấu Pháp Vệ** | Giải 1v1 loại trực tiếp, 128 người, 4 vòng |

## 9. Săn 7 Trang Rời

| Tham số | Giá trị |
|---------|---------|
| Điều kiện tham gia | Lv ≥ 60 và đã mở Chương 6 |
| Khởi động | **Thứ Bảy 21:00** mỗi tuần (hoặc ngay sau một lần ước) |
| Phân bố | 7 **Trang Rời** (1★–7★) xuất hiện ngẫu nhiên ở 7 map khác nhau, có thể nhìn thấy bằng **La Bàn Trang** |
| Nhặt | Nhặt khi chạm; **người mang** hiển thị trên bản đồ cho Đội |
| Rơi khi chết | Rơi toàn bộ nếu bị người chơi (PK) hạ |
| Hết hạn | Mỗi viên chỉ giữ được **15 phút**, sau đó tự về chỗ cũ |
| Triệu hồi | Một người gom đủ 7 viên đến **Đài Nguyên Linh** ở M024 để gọi **Tứ Đại Nguyên Linh** |
| Thời gian sự kiện | 60 phút, kết thúc thì đá biến mất |
| Cooldown sau ước | 7 ngày |

### 9.1 Danh sách điều ước (chọn 1)

| Điều ước | Hiệu ứng |
|----------|----------|
| Sức Mạnh Nguyên Linh | +1% HP/ATK/DEF vĩnh viễn (giới hạn 5 lần/nhân vật) |
| Kho Báu Pháp Vệ | 100.000 Quan × (Lv/10) |
| EXP Gấp Ba | EXP ×3 trong 30 phút |
| Hồi Sinh Đồng Đội | Hồi sinh mọi đồng đội trong map |
| Rương Nguyên Linh | 1 rương vật phẩm theo cấp (bảo đảm Hiếm) |
| Đảo Lại Lời Nguyền | Xóa Điểm Tội Lỗi |

## 10. Bảng xếp hạng

| Bảng | Tiêu chí | Chu kỳ | Phần thưởng |
|------|---------|--------|-------------|
| Lực Chiến | Lực Chiến | Thời gian thực | Danh hiệu tháng |
| Công Trạng | Tổng Công Trạng | Tháng | Lễ Tuyên Công |
| Cấp độ | Cấp và EXP | Thời gian thực | — |
| Đội | Công Trạng Đội + Chiến Đội | Tuần | Rương Đội |
| Đấu Trường | Điểm Elo | Mùa | Trang phục |
| Raid | Thời gian hạ boss nhanh nhất | Tuần | Danh hiệu |

## 11. Kiểm duyệt cộng đồng

| Vấn đề | Biện pháp |
|--------|-----------|
| Spam | Giới hạn tốc độ chat, mute tự động |
| Từ ngữ xấu | Lọc từ, báo cáo, GM xử lý |
| Gian lận | Báo cáo bot, xem [security](../architecture/security-and-anticheat.md) |
| Bậc xử phạt | Cảnh báo → mute 1 giờ → mute 24 giờ → khóa 3 ngày → khóa 30 ngày → khóa vĩnh viễn |
