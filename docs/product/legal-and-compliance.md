# Pháp lý & Tuân thủ

> **Quan trọng:** Tài liệu này là **danh sách việc cần kiểm tra**, **không phải tư vấn pháp lý**. Trước khi phát hành thương mại, hãy tham vấn luật sư chuyên về sở hữu trí tuệ và game online tại Việt Nam. Các văn bản pháp luật có thể thay đổi, cần **xác minh phiên bản hiện hành**.

## 1. Sở hữu trí tuệ (IP) — Black Clover

Black Clover (tác giả Yūki Tabata, nhà xuất bản và chủ sở hữu bản quyền) là tác phẩm có bản quyền. Tên nhân vật, thế giới, kỹ năng, biểu tượng đều được bảo hộ.

| Mức độ sử dụng | Rủi ro | Khuyến nghị |
|----------------|--------|-------------|
| **Dự án fan phi lợi nhuận**, không thu tiền, không quảng cáo, chỉ để học tập/cộng đồng | Trung bình | Ghi rõ "fan-made, không liên kết với chủ sở hữu", không dùng tài sản gốc, sẵn sàng gỡ khi có yêu cầu |
| **Thương mại** (nạp thẻ, quảng cáo, bán vật phẩm) với IP gốc | **Rất cao** | **Phải có giấy phép (license)** từ chủ sở hữu; nếu không, đổi sang IP gốc |
| **Thương mại với IP gốc thay thế** (Reskin) | Thấp đến trung bình, **tùy mức khác biệt thực chất** | **Hướng đã chọn.** Phải khác về **thực chất**, không chỉ đổi tên: nhân vật, cốt truyện, tổ chức, thiết kế hình ảnh, thuật ngữ đặc trưng đều phải làm mới. Chỉ giữ ý tưởng và cơ chế chung. Xem [reskin-plan](reskin-plan.md) |

### 1.1 Quy tắc dự án trong giai đoạn hiện tại

1. **Không sử dụng** hình ảnh, sprite, nhạc, lồng tiếng, logo từ anime/manga. Mọi tài sản phải **tự tạo** hoặc **có giấy phép**.
2. **Thoại viết mới**, không sao chép thoại hoặc văn bản của nguyên tác.
3. Tên "Black Clover" trong tiêu đề là **tên tạm** (xem [vision §9](vision-and-scope.md)). **Đã chọn hướng thương mại với IP gốc thay thế (reskin)**: World Bible gốc phải được chốt **trước khi sản xuất art** (Phase 0). Xem [reskin-plan](reskin-plan.md).
4. Khuyến nghị **thiết kế lớp tên** (i18n key) để **thay toàn bộ tên IP** mà không sửa code.
5. Bắt buộc có **dòng tuyên bố** trong README, màn hình đăng nhập, điều khoản.

### 1.2 Reskin: đổi tên là chưa đủ

> **Đính chính:** bản trước của mục này gợi ý các tên thay thế dịch sát nghĩa ("Sách Phép", "Hiệp Sĩ Ma Pháp", "Hệ Phá Phép", "nhân vật tự sáng tạo cùng vai trò") và đánh giá rủi ro là "Thấp". Cách đó **không đủ**: dịch từ hay giữ nguyên vai trò, tính cách, trình tự cốt truyện vẫn tạo ra bản phái sinh. Đã bỏ bảng đó.

Nguyên tắc: **ý tưởng và cơ chế dùng tự do; cách thể hiện cụ thể (nhân vật, cốt truyện, hình ảnh, văn bản, nhạc) và tên gọi thì phải làm mới.** Danh sách đầy đủ những thứ cần đổi, những thứ giữ được, quy trình và danh sách kiểm tra nằm ở [reskin-plan](reskin-plan.md).

## 2. Giấy phép và quản lý trò chơi điện tử tại Việt Nam

Cần kiểm tra các quy định hiện hành về dịch vụ **trò chơi điện tử trên mạng** (nhiều người chơi đồng thời, tương tác). Các hạng mục thường gặp:

| Hạng mục | Mô tả | Hành động |
|----------|-------|-----------|
| Phân loại game (thường gọi **G1**) | Game nhiều người chơi, tương tác | Xác định phân loại đúng |
| Phê duyệt nội dung, kịch bản | Cơ quan quản lý duyệt | Nộp hồ sơ nội dung, kịch bản trước phát hành |
| Giấy chứng nhận cung cấp dịch vụ | Doanh nghiệp cần được cấp | Có pháp nhân phù hợp |
| Phân loại độ tuổi | Hiển thị nhãn độ tuổi | Mục tiêu 12+; kiểm duyệt nội dung |
| **Xác thực tài khoản người chơi** | Quy định về định danh/xác minh | Triển khai FR-AUTH-04 |
| Quản lý thời gian chơi trẻ em | Giới hạn theo quy định | Theo dõi, áp dụng nếu bắt buộc |
| Thông báo quy chế | Điều khoản, chính sách | Công bố trước khi mở |

> Cần **xác minh** văn bản hiện hành (nghị định, thông tư về quản lý, cung cấp, sử dụng dịch vụ trò chơi điện tử trên mạng).

## 3. Bảo vệ dữ liệu cá nhân

Dự án thu thập: tên đăng nhập, email, số điện thoại (nếu xác thực), IP, log hành vi, dữ liệu thanh toán.

| Yêu cầu | Biện pháp |
|---------|-----------|
| Cơ sở pháp lý | Người dùng **đồng ý** rõ ràng khi đăng ký, có thể rút lại |
| Tối thiểu hóa dữ liệu | Không thu thập thứ không cần |
| Trẻ em | Cần sự đồng ý của người giám hộ với người dưới độ tuổi quy định; hạn chế thu thập |
| Bảo mật | Mã hóa mật khẩu (argon2id), HTTPS, phân quyền |
| Lưu trữ | Thời hạn lưu: log gameplay 90 ngày; log giao dịch ≥ theo quy định kế toán/thuế |
| Quyền người dùng | Truy cập, chỉnh sửa, xóa dữ liệu; có quy trình qua hỗ trợ |
| Chuyển dữ liệu ra nước ngoài | Kiểm tra quy định khi dùng dịch vụ đám mây ngoài VN |
| Thông báo sự cố | Quy trình báo cáo vi phạm dữ liệu |

Tham chiếu pháp luật bảo vệ dữ liệu cá nhân của Việt Nam (nghị định về bảo vệ dữ liệu cá nhân); cần xác minh văn bản hiện hành.

## 4. Thanh toán & thuế

| Hạng mục | Lưu ý |
|----------|-------|
| Cổng thanh toán | Chọn đơn vị được cấp phép, ký hợp đồng, bảo mật webhook |
| Ghi nhận doanh thu | Ngọc Mana là **dịch vụ số**; ghi nhận theo chuẩn kế toán |
| Thuế | Thuế GTGT, thu nhập doanh nghiệp, thuế nhà thầu nước ngoài (nếu có) |
| Hoàn tiền | Chính sách hoàn tiền công bố rõ, xử lý khiếu nại trong thời hạn |
| Bảo vệ người tiêu dùng | **Công khai tỉ lệ** ở Vòng Quay và mọi cơ chế ngẫu nhiên có tính phí |
| Hạn mức người chưa thành niên | Xem [economy §7.4](../game-design/08-economy-and-monetization.md) |

## 5. Điều khoản & chính sách cần có

| Văn bản | Nội dung chính |
|---------|----------------|
| **Điều khoản sử dụng (ToS)** | Quyền và nghĩa vụ, hành vi bị cấm, xử phạt, tài sản ảo không phải tài sản thật, quyền thay đổi game |
| **Chính sách bảo mật** | Dữ liệu thu thập, mục đích, chia sẻ, thời hạn, quyền người dùng |
| **Chính sách thanh toán & hoàn tiền** | Điều kiện, thời gian xử lý |
| **Quy tắc cộng đồng** | Ngôn từ, gian lận, bot, RMT |
| **Chính sách bản quyền / gỡ nội dung** | Quy trình báo cáo vi phạm, phản hồi |
| **Tuyên bố fan-made** | Không liên kết với chủ sở hữu IP |

## 6. Giấy phép phần mềm & tài sản

| Loại | Quy định |
|------|----------|
| Thư viện mã nguồn mở | Lập **danh mục SBOM**, kiểm tra tương thích giấy phép (MIT/Apache OK; copyleft GPL cần xem xét) |
| Phông chữ | Chỉ dùng phông có giấy phép cho game (ví dụ OFL) |
| Âm nhạc, SFX | Tự sáng tác, hoặc có giấy phép thương mại |
| Nghệ thuật | Hợp đồng chuyển nhượng quyền với họa sĩ |
| Công cụ (Aseprite, Tiled…) | Kiểm tra điều khoản xuất bản |

## 7. Tuân thủ nền tảng phân phối

| Nền tảng | Lưu ý |
|----------|-------|
| Web | Chính sách thanh toán, cookie |
| Google Play | Chính sách thanh toán trong ứng dụng, hiển thị tỉ lệ ngẫu nhiên |
| App Store | Chính sách thanh toán trong ứng dụng, quyền xóa tài khoản |

## 8. Danh sách kiểm tra trước các mốc

### Trước Closed Beta
- [ ] Quyết định hướng IP (license hoặc reskin)
- [ ] ToS, chính sách bảo mật bản đầu
- [ ] Đồng ý thu thập dữ liệu khi đăng ký
- [ ] Tỉ lệ vòng quay công khai

### Trước Launch
- [ ] Giấy phép/phê duyệt cần thiết theo quy định
- [ ] Xác thực tài khoản và hạn mức theo độ tuổi
- [ ] Hợp đồng cổng thanh toán, đối soát
- [ ] Quy trình xử lý khiếu nại và hoàn tiền
- [ ] SBOM và rà soát giấy phép tài sản
- [ ] Quy trình báo cáo sự cố dữ liệu
