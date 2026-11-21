# Bảo mật & Chống gian lận

> **Trạng thái:** Draft v0.1 · **Liên quan:** [system-architecture](system-architecture.md) · [server-design](server-design.md) · [network-protocol](network-protocol.md) · [economy](../game-design/08-economy-and-monetization.md)

## 1. Nguyên tắc

1. **Không tin client.** Mọi quyết định (vị trí, sát thương, vật phẩm, tiền) do server.
2. **Phòng thủ nhiều lớp.** Mỗi lớp (mạng, giao thức, logic, dữ liệu, vận hành) có kiểm tra riêng.
3. **Mặc định từ chối.** Không rõ thì từ chối và ghi log.
4. **Ghi lại mọi thứ có giá trị.** Tiền, vật phẩm, quyền admin đều có log bất biến.
5. **Giảm thiệt hại.** Giả định sẽ có lỗi; chuẩn bị sẵn khôi phục và rollback.

## 2. Mô hình mối đe dọa (STRIDE rút gọn)

| Loại | Mối đe dọa | Biện pháp chính |
|------|------------|------------------|
| **S**poofing | Giả mạo tài khoản, đánh cắp token | Argon2id, token ngắn hạn, ticket một lần, 2FA tùy chọn, phát hiện thiết bị mới |
| **T**ampering | Sửa gói tin, sửa bộ nhớ client | Server-authoritative, validate schema, kiểm tra tầm/CD/MP, seq và idempotency |
| **R**epudiation | Chối bỏ hành vi, tranh chấp giao dịch | Ledger bất biến, trade_logs, GM audit log |
| **I**nformation disclosure | Lộ dữ liệu cá nhân, lộ bí mật | TLS, mã hóa tại chỗ, tối thiểu hóa dữ liệu, quản lý bí mật |
| **D**enial of service | DDoS, flood gói | WAF/CDN, rate limit, giới hạn kết nối/IP, giới hạn kích thước gói |
| **E**levation of privilege | Người chơi giành quyền GM, lỗi RBAC | RBAC, MFA cho GM, tách mạng admin, audit |

## 3. Xác thực & phiên

| Hạng mục | Chi tiết |
|----------|----------|
| Mật khẩu | Argon2id (tham số theo OWASP), tối thiểu 8 ký tự, chặn mật khẩu phổ biến |
| Access token | JWT hết hạn **15 phút** |
| Refresh token | Ngẫu nhiên, **băm** khi lưu, quay vòng mỗi lần dùng, hủy được |
| Ticket vào game | Ngẫu nhiên 128 bit, **30 giây**, **dùng một lần**, gắn `accountId + characterId + IP băm` |
| Khóa tài khoản | 5 lần sai/10 phút → chờ tăng dần; cảnh báo email khi đăng nhập thiết bị lạ |
| 2FA | TOTP tùy chọn; **bắt buộc** cho tài khoản có số dư Nén Bạc lớn (tùy chính sách) |
| Một phiên | Đăng nhập mới đá phiên cũ |
| Đặt lại mật khẩu | Link ngẫu nhiên, 30 phút, một lần; thu hồi mọi refresh token |
| Cookie | `HttpOnly`, `Secure`, `SameSite=Lax` (REST web) |

**Bậc B3 đã có** (`apps/api/src/security.ts`, `app.ts`):
- **Mật khẩu:** Argon2id 19 MiB, 2 vòng, 1 luồng (mức tối thiểu của OWASP); tối thiểu 8 ký tự; chặn một danh sách ngắn mật khẩu phổ biến.
- **Token:** JWT HS256 sống 15 phút. Refresh token 256 bit, lưu dạng SHA-256, quay vòng mỗi lần dùng. Dùng lại token đã thu hồi thì thu hồi cả họ.
- **Vé vào game:** 128 bit, 30 s, dùng một lần.
- **Giới hạn đăng nhập:** khóa 10 phút sau 5 lần sai (cố định, chưa tăng dần).
- **Giới hạn tốc độ** trong Redis; IP lưu dạng HMAC.
- **Cookie:** `Secure` bật bằng `COOKIE_SECURE=1` khi chạy HTTPS.
- **Kiểm tra `Origin` của WebSocket** bằng `ALLOWED_ORIGINS` (bản chơi thử bật sẵn).

**Chưa có:**
- cảnh báo email khi đăng nhập thiết bị lạ;
- 2FA;
- đặt lại mật khẩu (chưa có dịch vụ gửi email);
- so khớp IP của vé ([network §3.1.3](network-protocol.md)).

## 4. Bảo vệ giao thức

| Biện pháp | Mô tả |
|-----------|-------|
| WSS/TLS 1.2+ | Bắt buộc, HSTS cho web |
| Kích thước gói | ≤ 16 KB, ngắt khi vượt |
| Validate schema (Zod) | Mọi payload; sai thì `E_INVALID_PAYLOAD`, 3 lần → ngắt |
| Rate limit theo opcode | Xem [network §7](network-protocol.md) |
| Chống replay | `seq` tăng dần mỗi kết nối; lệnh tài sản có `idemKey` |
| Giới hạn kết nối | ≤ 3 kết nối/IP trước đăng nhập, 1 phiên/tài khoản |
| Origin check | Chỉ chấp nhận `Origin` đã cấu hình (web) |
| Phiên bản | Từ chối client quá cũ (`minClient`) |

## 5. Chống gian lận trong game

### 5.1 Di chuyển

| Gian lận | Phát hiện | Xử lý |
|----------|-----------|-------|
| Speed hack | Tốc độ/quãng đường trong cửa sổ > 115% giới hạn | Kéo lại vị trí, tăng điểm nghi ngờ |
| Bay/xuyên tường | Vị trí trong tile đặc, không trên mặt đất lâu | Kéo lại, nghi ngờ cao |
| Teleport | Nhảy vị trí > 400 px/tick | Kéo lại; lặp lại thì ngắt |
| Nhảy vô hạn | Số lần nhảy trên không vượt hệ | Hủy lệnh |

### 5.2 Chiến đấu

| Gian lận | Phát hiện | Xử lý |
|----------|-----------|-------|
| Bỏ hồi chiêu | Cooldown do server giữ | Từ chối `E_COOLDOWN` |
| Đánh ngoài tầm | Kiểm tra khoảng cách (dung sai 50 px) | Từ chối |
| Đánh khi bị khống chế/chết | Kiểm tra trạng thái | Từ chối |
| Sát thương giả | Server tính toàn bộ | Không áp dụng |
| Sửa chỉ số | Chỉ số do server | Không áp dụng |

### 5.3 Vật phẩm & Kinh tế

| Gian lận | Biện pháp |
|----------|-----------|
| **Nhân bản vật phẩm** (dupe) | Mọi chuyển vật phẩm trong **transaction**, khóa dòng, chỉ mục duy nhất `(holder, location, slot)`, `item_instances.id` duy nhất cho mỗi vật phẩm vật lý; kiểm tra toàn vẹn hằng đêm |
| **Dupe qua race condition** | Hàng đợi thao tác theo nhân vật + `FOR UPDATE` + `idemKey` |
| **Lặp lệnh mua/bán** | `idemKey` + sổ cái chỉ mục duy nhất |
| **Rút ngắn cường hóa** | RNG ở server, `version` khóa lạc quan |
| **RMT** (bán tiền thật) | Giới hạn giao dịch cho tài khoản mới, theo dõi chuyển Quan lớn, cảnh báo cặp giao dịch bất thường, Nén Bạc không giao dịch được |
| **Thao túng chợ** | Giới hạn mua số lượng lớn, biên độ giá, cảnh báo giá bất thường |

### 5.4 Điểm nghi ngờ (suspicion score)

Mỗi người chơi có điểm nghi ngờ 0–100 trong bộ nhớ và Redis:

| Sự kiện | Điểm |
|---------|------|
| Vi phạm tốc độ | +5 |
| Vi phạm tầm đánh | +3 |
| Gói sai schema | +2 |
| Tốc độ thao tác phi nhân (APM bất thường) | +4 |
| Hành vi lặp hoàn hảo hàng giờ | +10 |
| Bị báo cáo hợp lệ | +5 mỗi lần |
| Điểm giảm | −1 mỗi 10 phút bình thường |

| Mốc | Phản ứng |
|-----|----------|
| ≥ 30 | Yêu cầu **captcha** khi hoạt động tiếp theo |
| ≥ 60 | Giám sát tăng cường, ghi lại phiên hành vi |
| ≥ 90 | Tạm ngắt kết nối, gắn cờ cho GM |

## 6. Phát hiện bot

| Tín hiệu | Mô tả |
|----------|-------|
| Hành vi lặp | Đường đi, thời gian đánh lặp lại gần như giống hệt |
| Hoạt động liên tục | > 12 giờ không nghỉ |
| Tương tác bất thường | Không chat, không nhặt NPC, chỉ đánh quái |
| Mạng | Nhiều tài khoản cùng IP, cùng dấu vân tay thiết bị |
| Thời gian phản ứng | Phản ứng với sự kiện < 100 ms nhất quán |

**Biện pháp:**
- **Captcha** (kiểu "kéo thả Huyền Thư vào đúng hệ", dễ với người, khó với bot) khi nghi ngờ hoặc khi Auto Hunt chạm mốc giờ.
- Giới hạn **Auto Hunt** chính thức (3 giờ/ngày) để giảm nhu cầu bot.
- **Honeypot**: quái/vật phẩm không nhìn thấy với người chơi, chỉ bot sẽ tương tác.
- Quét hàng loạt log định kỳ (Worker) → danh sách tài khoản nghi ngờ gửi GM.

## 7. Thanh toán

| Rủi ro | Biện pháp |
|--------|-----------|
| Webhook giả mạo | Xác minh **chữ ký HMAC**; chỉ chấp nhận từ IP/phạm vi của nhà cung cấp |
| Gửi lặp webhook | `payment_events (provider, event_id)` duy nhất; xử lý idempotent |
| Sai số tiền | So sánh `amount` webhook với `payment_orders.amount_vnd` |
| Chargeback | Trạng thái `CHARGEBACK`, thu hồi Nén Bạc (có thể âm số dư → khóa), cảnh báo |
| Tài khoản bị chiếm để nạp | Cảnh báo email, hạn mức, 2FA |
| Dữ liệu thẻ | **Không lưu** số thẻ/CVV; dùng cổng thanh toán hosted |
| Đối soát | Hằng ngày so khớp báo cáo nhà cung cấp với `payment_orders` |

## 8. Quản trị (Admin/GM)

| Hạng mục | Chi tiết |
|----------|----------|
| Vai trò | `SUPPORT` (đọc, mute), `GM` (khóa, tặng nhỏ), `ADMIN` (cấu hình, sự kiện), `SUPERADMIN` (mọi quyền, nhân sự) |
| Xác thực | Tên đăng nhập + mật khẩu + **MFA bắt buộc**, truy cập qua VPN/allowlist IP |
| Hành động nhạy cảm | Cần **hai người duyệt** (vd tặng Nén Bạc > 1.000, rollback) |
| Audit | Mọi hành động ghi `gm_audit_logs` (bất biến, không xóa) |
| Tách dữ liệu | GM chỉ thấy dữ liệu cá nhân tối thiểu cần thiết |
| Phiên | Hết hạn 30 phút không hoạt động |

## 9. Hạ tầng

| Lớp | Biện pháp |
|-----|-----------|
| Mạng | WAF + CDN (Cloudflare hoặc tương đương), chống DDoS L3–L7 |
| Phân đoạn | DB, Redis ở mạng riêng, không mở ra Internet |
| Bí mật | Trình quản lý bí mật (Vault/SSM/GitHub Secrets), không commit `.env` |
| Quyền tối thiểu | Tài khoản DB riêng cho từng dịch vụ (đọc/ghi hạn chế) |
| Cập nhật | Cập nhật hệ điều hành/phụ thuộc theo lịch, quét lỗ hổng (Dependabot, Trivy) |
| Sao lưu | Mã hóa, lưu khác vùng, kiểm tra khôi phục |
| Log | Không ghi mật khẩu/token; che dữ liệu cá nhân |

## 10. Bảo mật ứng dụng (OWASP)

| Mục | Cách xử lý |
|-----|------------|
| Injection | Truy vấn tham số hóa (Prisma/pg), không ghép chuỗi SQL |
| XSS | Thoát HTML mọi chuỗi người dùng (tên, chat); CSP nghiêm ngặt, Preact tự thoát |
| CSRF | SameSite cookie, token CSRF cho REST dạng cookie |
| SSRF | Không gọi URL do người dùng cung cấp |
| Phụ thuộc | Khóa phiên bản, SBOM, rà soát |
| Chat | Lọc từ cấm, độ dài, ký tự điều khiển |

## 11. Quyền riêng tư

- Chỉ thu thập dữ liệu cần thiết (xem [legal §3](../product/legal-and-compliance.md)).
- IP lưu **dạng băm** cho phân tích; IP thô chỉ giữ ngắn hạn trong log bảo mật (≤ 30 ngày).
- Người dùng có thể **xuất** và **xóa** dữ liệu qua hỗ trợ; xóa tài khoản = ẩn danh hóa (giữ ledger cần cho kế toán).

## 12. Ứng phó sự cố

| Mức | Ví dụ | Mục tiêu phản hồi |
|-----|-------|--------------------|
| **SEV1** | Lộ dữ liệu, dupe diện rộng, thanh toán sai | Xác nhận ≤ 15 phút, hạn chế ≤ 1 giờ |
| **SEV2** | Gian lận quy mô vừa, dịch vụ chính chậm | ≤ 1 giờ |
| **SEV3** | Lỗi nhỏ, không ảnh hưởng tài sản | Trong ngày làm việc |

Quy trình: **Phát hiện → Phân loại → Hạn chế** (tắt tính năng bằng feature flag, bảo trì khẩn) → **Điều tra** (log, ledger) → **Khắc phục** (patch, rollback) → **Hậu kiểm** (postmortem không đổ lỗi, hành động ngăn chặn).

### 12.1 Xử lý khi phát hiện dupe

1. Tắt ngay tính năng liên quan (flag).
2. Chạy truy vấn toàn vẹn, xác định tài khoản hưởng lợi.
3. Thu hồi vật phẩm, trừ tiền dư, tạo snapshot trước/sau (`character_snapshots`).
4. Xử phạt theo bậc, thông báo cộng đồng khi cần.
5. Vá lỗi, thêm test hồi quy.

## 13. Xử phạt (bậc)

| Mức | Hành vi | Hình phạt |
|-----|---------|-----------|
| 1 | Chat không phù hợp lần đầu | Cảnh báo |
| 2 | Tái phạm chat, spam | Mute 1 giờ → 24 giờ |
| 3 | Dùng bot/auto ngoài quy định | Khóa 3 ngày, xóa lợi ích |
| 4 | RMT, lợi dụng lỗi | Khóa 30 ngày, thu hồi tài sản |
| 5 | Hack, dupe, chargeback gian lận | Khóa vĩnh viễn |

Mọi hình phạt có lý do, bằng chứng, thời hạn, và **cơ chế kháng cáo**.

## 14. Danh sách kiểm tra trước phát hành (security gate)

- [ ] Rà soát toàn bộ endpoint REST và opcode về xác thực, phân quyền, giới hạn tốc độ
- [ ] Test tải/đồng thời cho mọi lệnh tài sản (mua, bán, giao dịch, cường hóa, chợ, thư)
- [ ] Fuzz giao thức (gói sai, quá lớn, thứ tự lạ)
- [ ] Kiểm thử xâm nhập (pentest) bởi bên thứ ba
- [ ] Diễn tập khôi phục DB, rollback nhân vật
- [ ] Rà soát thanh toán: chữ ký, idempotency, đối soát
- [ ] Kiểm tra mô hình quyền GM và MFA
- [ ] Quét phụ thuộc, bí mật, cấu hình
