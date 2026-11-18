# Hướng dẫn Quản trị & GM

> **Dành cho:** Support, GM, Admin · **Liên quan:** [use cases admin](../usecases/use-cases-admin-system.md) · [security](../architecture/security-and-anticheat.md) · [infrastructure](../architecture/infrastructure-devops.md)
> **Trạng thái:** Draft v0.1. Lệnh và màn hình sẽ được triển khai theo [roadmap](../product/roadmap.md) (Phase 3).

## 1. Nguyên tắc nghề nghiệp

1. **Công bằng:** Không dùng quyền GM để chơi hay giúp người quen.
2. **Quyền riêng tư:** Chỉ xem dữ liệu cần thiết cho việc xử lý; không chia sẻ ra ngoài.
3. **Dấu vết:** Mọi hành động đều được ghi vào `gm_audit_logs`. Không có "hành động không dấu vết".
4. **Hai người duyệt** với hành động nhạy cảm (Ngọc Mana, rollback, khóa vĩnh viễn).
5. **Không bao giờ** hỏi người chơi mật khẩu, OTP.
6. **Phản hồi trung thực:** Không hứa điều không thể thực hiện.

## 2. Truy cập

| Hạng mục | Quy định |
|----------|----------|
| Địa chỉ | Admin web nội bộ, chỉ truy cập qua **VPN** hoặc IP allowlist |
| Đăng nhập | Tên GM + mật khẩu + **MFA (TOTP)** bắt buộc |
| Phiên | Tự thoát sau 30 phút không hoạt động |
| Vai trò | Support / GM / Admin / Super Admin (xem [ma trận quyền](../usecases/use-cases-admin-system.md)) |
| Mất thiết bị MFA | Liên hệ Super Admin để đặt lại sau khi xác minh danh tính |

## 3. Bảng điều khiển

| Module | Chức năng |
|--------|-----------|
| **Tổng quan** | CCU, DAU, trạng thái realm, cảnh báo |
| **Tra cứu** | Tài khoản, nhân vật, Squad, vật phẩm, giao dịch |
| **Hồ sơ nhân vật** | Chỉ số, túi đồ, kỹ năng, nhiệm vụ, sổ cái, lịch sử đăng nhập |
| **Xử phạt** | Mute, khóa, lịch sử, kháng cáo |
| **Báo cáo** | Hàng đợi báo cáo người chơi |
| **Thư & Quà** | Gửi thư hệ thống, tặng, mã quà |
| **Thanh toán** | Đơn nạp, đối soát, hoàn tiền |
| **Sự kiện** | Tạo, lịch, dừng |
| **Cấu hình** | Rate EXP/Drop, feature flag |
| **Bảo trì** | Lịch, thông báo, trạng thái |
| **Kinh tế** | Faucet/sink, giá chợ, cảnh báo |
| **Gian lận** | Danh sách điểm nghi ngờ, bot, dupe |
| **Nhật ký GM** | Tìm kiếm audit |

## 4. Lệnh GM trong game

Lệnh gõ ở khung chat, bắt đầu bằng `/gm`. Chỉ tài khoản GM có quyền thích hợp mới thực hiện được. Mọi lệnh được ghi log.

### 4.1 Thông tin & di chuyển

| Lệnh | Quyền | Mô tả |
|------|-------|-------|
| `/gm who <tên>` | Support | Xem thông tin nhanh nhân vật |
| `/gm goto <tên>` | GM | Dịch chuyển tới nhân vật |
| `/gm summon <tên>` | GM | Kéo nhân vật tới chỗ GM |
| `/gm map <mapId> [x y]` | GM | Dịch chuyển tới map |
| `/gm unstuck <tên>` | Support | Đưa nhân vật bị kẹt về thành |
| `/gm invisible on|off` | GM | Ẩn hình (không tương tác) |

### 4.2 Kiểm soát người chơi

| Lệnh | Quyền | Mô tả |
|------|-------|-------|
| `/gm kick <tên> [lý do]` | Support | Ngắt kết nối |
| `/gm mute <tên> <phút> <lý do>` | Support | Cấm chat |
| `/gm unmute <tên>` | GM | Gỡ mute |
| `/gm ban <tài khoản> <thời hạn> <lý do>` | GM (≤ 7 ngày), Admin (dài hơn) | Khóa tài khoản |
| `/gm unban <tài khoản>` | GM | Mở khóa |

### 4.3 Phần thưởng & dữ liệu

| Lệnh | Quyền | Mô tả |
|------|-------|-------|
| `/gm give item <tên> <itemId> <số lượng> <lý do>` | GM (theo ngưỡng) | Tặng vật phẩm |
| `/gm give yul <tên> <số> <lý do>` | GM (theo ngưỡng) | Tặng Yul |
| `/gm give gem <tài khoản> <số> <lý do>` | Admin (duyệt đôi) | Tặng Ngọc Mana |
| `/gm take item <tên> <instanceId> <lý do>` | GM | Thu hồi vật phẩm (ghi ledger) |
| `/gm quest set <tên> <questId> <trạng thái>` | GM | Đặt trạng thái nhiệm vụ (khắc phục lỗi) |
| `/gm snapshot <tên> [lý do]` | GM | Tạo snapshot thủ công |
| `/gm rollback <tên> <snapshotId>` | Admin (duyệt đôi) | Khôi phục nhân vật |

### 4.4 Thế giới & sự kiện

| Lệnh | Quyền | Mô tả |
|------|-------|-------|
| `/gm announce <nội dung>` | GM | Thông báo toàn máy chủ |
| `/gm spawn mob <mobId> [số]` | GM (staging), Admin (production) | Sinh quái |
| `/gm spawn boss <bossId>` | Admin | Sinh boss |
| `/gm event start|stop <eventId>` | Admin | Bật/tắt sự kiện |
| `/gm rate exp|drop <hệ số>` | Admin | Đổi hệ số (có giới hạn) |
| `/gm maintenance <phút> [lý do]` | Admin | Lên lịch bảo trì |
| `/gm flag <tên> on|off` | Admin | Bật/tắt feature flag |

### 4.5 Chỉ dùng trên môi trường **dev/staging** (tắt trên production)

| Lệnh | Mô tả |
|------|-------|
| `/gm setlevel <tên> <cấp>` | Đặt cấp |
| `/gm god on|off` | Bất tử |
| `/gm cooldown reset` | Xóa hồi chiêu |
| `/gm reload content` | Tải lại nội dung |
| `/gm time <HH:MM>` | Giả lập giờ (kiểm thử sự kiện) |

## 5. Quy trình xử lý (runbook)

### 5.1 Hằng ca

**Đầu ca**
- [ ] Xem dashboard: CCU, lỗi, tick, cảnh báo đêm qua
- [ ] Xem hàng đợi báo cáo `OPEN` và vé hỗ trợ
- [ ] Kiểm tra lịch sự kiện, bảo trì trong 24 giờ tới
- [ ] Đọc ghi chú bàn giao ca

**Cuối ca**
- [ ] Hoàn thành hoặc bàn giao báo cáo đang xử lý
- [ ] Ghi chú bàn giao (vụ việc nóng, người chơi cần theo dõi)

### 5.2 Báo cáo người chơi
1. Mở báo cáo → xem **log chat** và **hành vi** gần đây.
2. Xác định vi phạm theo [bậc xử phạt](../architecture/security-and-anticheat.md).
3. Xử phạt, ghi lý do và bằng chứng.
4. Phản hồi người báo cáo (không tiết lộ chi tiết hình phạt).

### 5.3 "Tôi bị mất vật phẩm / Yul"
1. Tra **Sổ cái** và **trade_logs** của nhân vật 7 ngày.
2. Xác định nguyên nhân: tự bán, giao dịch, chợ, thư hết hạn, lỗi game.
3. Nếu **lỗi hệ thống**: tạo issue, hoàn trả (vật phẩm đúng instance nếu còn), gửi thư giải thích.
4. Nếu **người chơi tự thao tác**: giải thích và gợi ý cách tránh. Không hoàn trả.
5. Nếu **bị lừa** giữa người chơi: không hoàn trả; ghi nhận báo cáo lừa đảo, xử phạt kẻ lừa nếu vi phạm.

### 5.4 Khiếu nại nạp tiền chưa nhận Ngọc
1. Nhập mã giao dịch → xem `payment_orders` và `payment_events`.
2. Trạng thái `PENDING` quá 30 phút → đối soát với cổng thanh toán.
3. Cổng báo thành công mà chưa cộng → **cộng bù (duyệt đôi)** kèm ghi chú.
4. Cổng báo thất bại → hướng dẫn người chơi liên hệ ngân hàng/ví.

### 5.5 Nghi ngờ nhân bản vật phẩm (dupe) — **SEV1**
1. **Dừng ngay** tính năng liên quan bằng `/gm flag` (nếu có).
2. Chạy truy vấn toàn vẹn (Admin), xác định tài khoản.
3. Tạo **snapshot** từng nhân vật liên quan.
4. Thu hồi vật phẩm dư/tiền dư, ghi lý do.
5. Xử phạt theo bậc, thông báo cộng đồng nếu cần.
6. Mở postmortem; tạo test hồi quy.

### 5.6 Chiếm tài khoản
1. Khóa tạm tài khoản, thu hồi mọi phiên.
2. Xác minh chủ tài khoản (email gốc, câu hỏi bảo mật, ngày sinh, mã giao dịch nạp).
3. Xem lịch sử đăng nhập, giao dịch trong thời gian bị chiếm.
4. Khôi phục tài sản bị mất (rollback nếu có snapshot), đặt lại mật khẩu, bật 2FA.

### 5.7 Nhân vật bị kẹt
1. Dùng `/gm unstuck <tên>`.
2. Nếu tái diễn ở cùng vị trí → tạo issue (ghi map, tọa độ).

### 5.8 Bảo trì khẩn
Xem [infrastructure §7](../architecture/infrastructure-devops.md) và [A-09](../usecases/use-cases-admin-system.md). Luôn tạo **snapshot trước bảo trì**.

### 5.9 Bồi thường
| Tình huống | Gợi ý bồi thường |
|-----------|-------------------|
| Bảo trì khẩn kéo dài ≥ 2 giờ | Gói quà nhỏ (Bình, Thẻ Auto, 10 Ngọc Mana) |
| Lỗi làm mất EXP/vật phẩm | Hoàn đúng giá trị, kèm 1 gói xin lỗi |
| Sự cố nghiêm trọng (SEV1) | Bồi thường toàn server theo quyết định Admin |

Mọi bồi thường gửi qua **Thư** có ghi lý do.

## 6. Mẫu thông báo

**Bảo trì có kế hoạch**
> Máy chủ **[tên]** sẽ bảo trì từ **[giờ]** đến **[giờ]** (**[N] phút**) để cập nhật phiên bản **[X.Y.Z]**. Vui lòng đăng xuất đúng giờ để dữ liệu được lưu an toàn. Xin cảm ơn!

**Sự cố**
> Chúng tôi ghi nhận sự cố **[mô tả ngắn]** từ **[giờ]**. Đội ngũ đang xử lý. Chúng tôi sẽ cập nhật sau **[giờ]**. Mọi dữ liệu của bạn được bảo vệ. Xin lỗi vì sự bất tiện.

**Kết quả xử phạt (gửi người bị phạt)**
> Tài khoản của bạn bị **[hình phạt]** đến **[thời hạn]** vì **[lý do]**. Nếu cho rằng có nhầm lẫn, bạn có thể **kháng cáo** tại **[liên kết]** trong **7 ngày**.

## 7. Chính sách xử phạt & kháng cáo

| Hành vi | Hình phạt gợi ý |
|---------|-----------------|
| Chat lần đầu vi phạm nhẹ | Cảnh báo |
| Tái phạm / spam | Mute 1 → 24 giờ |
| Dùng phần mềm tự động | Khóa 3 ngày, xóa lợi ích |
| RMT, khai thác lỗi | Khóa 30 ngày, thu hồi tài sản |
| Hack, dupe, chargeback gian lận | Khóa vĩnh viễn |

**Kháng cáo:** người chơi gửi trong 7 ngày; **người xử lý khác** (không phải người ra phạt) xem xét trong **72 giờ**; kết quả ghi audit.

## 8. SLA hỗ trợ

| Loại vé | Phản hồi lần đầu | Giải quyết |
|---------|------------------|------------|
| Mất tài sản, thanh toán | ≤ 4 giờ | ≤ 48 giờ |
| Khiếu nại xử phạt | ≤ 24 giờ | ≤ 72 giờ |
| Báo cáo gian lận/RMT | ≤ 12 giờ | ≤ 24 giờ |
| Lỗi game | ≤ 24 giờ | Theo mức độ |
| Câu hỏi chung | ≤ 24 giờ | ≤ 48 giờ |

## 9. Báo cáo định kỳ

| Báo cáo | Chu kỳ | Nội dung |
|---------|--------|----------|
| Vận hành | Hằng ngày | CCU, sự cố, vé |
| Gian lận | Hằng tuần | Tài khoản bị xử phạt, mẫu hành vi mới |
| Kinh tế | Hằng tuần | Faucet/sink, giá chợ, cảnh báo |
| Doanh thu | Hằng tuần/tháng | Nạp, ARPU, ARPPU, chargeback |
| Hỗ trợ | Hằng tháng | Khối lượng vé, SLA, chủ đề lặp lại |

## 10. Bảo mật cho GM

- Dùng thiết bị công việc, không dùng chung tài khoản.
- Không chụp hay chia sẻ dữ liệu người chơi ngoài kênh nội bộ.
- Báo ngay khi nghi ngờ lộ thông tin đăng nhập.
- Không phê duyệt yêu cầu "khẩn cấp" từ người lạ; xác minh qua kênh nội bộ.
