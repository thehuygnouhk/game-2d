# Thuật ngữ (Glossary)

> Bảng này là nguồn duy nhất cho tên gọi trong game. Mọi tài liệu, mã nguồn (key i18n) và UI phải dùng đúng các thuật ngữ dưới đây.

## 1. Thế giới & nhân vật

| Thuật ngữ (VN) | English / Gốc | Giải thích |
|----------------|---------------|-----------|
| Ma lực (Mana) | Mana | Năng lượng phép thuật của mọi sinh vật |
| Ma Đạo Thư | Grimoire | Sách phép, nhận ở tuổi 15. Là một ô trang bị |
| Lá (1–5 lá) | Leaf (clover) | Phẩm cấp Ma Đạo Thư. Mặc định 3 lá, tiến hóa lên 4 lá, 5 lá |
| Hiệp Sĩ Phép Thuật | Magic Knights | Lực lượng quân sự của Vương Quốc Clover |
| Đội Hiệp Sĩ | Squad / Magic Knight Squad | Đơn vị Hiệp Sĩ; trong game là **bang hội** |
| Vua Phép Thuật | Wizard King | Pháp sư mạnh nhất vương quốc, mục tiêu cuối |
| Yul | Yul | Tiền tệ mềm |
| Sao | Star | Điểm danh vọng, nhận qua thành tích |
| Mana Skin | Mana Skin | Gia cố cơ thể bằng ma lực (buff) |
| Mana Zone | Mana Zone | Vùng cảm nhận/kiểm soát ma lực (kỹ năng cao cấp) |
| Spirit Dive | Spirit Dive | Hợp thể với Tinh Linh (kỹ năng tối thượng, Lv85) |
| Tứ Đại Tinh Linh | Four Great Spirits | Salamander (Hỏa), Undine (Thủy), Sylph (Phong), Gnome (Thổ) |
| Phản Ma | Anti-Magic | Hệ ẩn không dùng mana, chém tan phép thuật |
| Quái thú ma lực | Magic Beast | Quái vật có ma lực |
| Cõi Quỷ | Underworld | Khu vực endgame |

## 2. Hệ thống game

| Thuật ngữ | Mô tả | Tương đương trong game gốc |
|-----------|-------|----------------------------|
| Xuất thân (Origin) | Chọn lúc tạo nhân vật, cố định | NRO: Tộc |
| Hệ phép (Class) | Chọn ở Lv10 tại Lễ Nhận Ma Đạo Thư | NS: Trường / Hệ |
| Điểm Tiềm Năng | Điểm cộng chỉ số, +5/cấp | NS: điểm tiềm năng; NRO: tiềm năng |
| Điểm Kỹ Năng (SP) | Dùng nâng cấp kỹ năng, +1/cấp từ Lv10 | NS: điểm kỹ năng |
| Lực Chiến | Chỉ số tổng hợp hiển thị sức mạnh | NRO: Sức mạnh |
| Khu | Bản sao của một map (zone), tối đa 30 người | Khu 1…n |
| Hầm Ngục | Phó bản theo nhóm, có boss | NS: Hang Động |
| Squad / Đội | Bang hội | NS: Gia tộc |
| Squad Hall | Nhà của Đội (map riêng) | NS: Nhà gia tộc |
| Hiệp Sĩ Tập Sự (Squire) | Đồng hành chiến đấu, lớn theo người chơi | NRO: Đệ tử |
| Chổi Bay | Thú cưỡi, tăng tốc di chuyển | NS: Thú cưỡi |
| Tinh Linh Hộ Mệnh | Pet buff chỉ số | NS: Pet |
| Linh Thạch Sao | 7 viên đá 1★–7★ | NRO: Ngọc rồng |
| Lá Thảo Dược Tinh Linh | Hồi đầy HP/MP, có hồi chiêu | NRO: Đậu thần |
| Ngọc Mana | Tiền tệ cao cấp (nạp) | NRO: Ngọc / Thỏi vàng |
| Điểm Cống Hiến | Tiền Đội, kiếm qua hoạt động Squad | NS: điểm gia tộc |
| Cờ PK | Trạng thái được/bị tấn công người chơi | NRO: Cờ xanh/đỏ |
| Điểm Tội Lỗi | Điểm phạt khi giết người chơi vô tội | — |
| Auto Hunt | Tự động đánh quái do server điều khiển | Treo máy |
| Cường hóa | Nâng cấp +1…+16 | NS: Nâng cấp |
| Linh Thạch Ngọc (Gem) | Ngọc khảm vào trang bị | NRO: Sao pha lê |
| Bind (khóa) | Vật phẩm không giao dịch được | — |

## 3. Thuật ngữ kỹ thuật

| Thuật ngữ | Giải thích |
|-----------|-----------|
| Server-authoritative | Server quyết định mọi kết quả (vị trí, sát thương, vật phẩm). Client chỉ gửi ý định |
| Tick | Một vòng cập nhật của server (20 Hz = 50 ms) |
| AOI (Area of Interest) | Vùng quanh người chơi mà server gửi dữ liệu |
| Realm | Một máy chủ game (thế giới độc lập) |
| Instance | Bản sao tạm của map (hầm ngục, Squad Hall) |
| CCU | Số người chơi đồng thời |
| Content pipeline | Quy trình thêm/sửa dữ liệu game (map, quái, vật phẩm) bằng file |
| Write-behind | Ghi DB bất đồng bộ sau khi cập nhật bộ nhớ |
| GM | Game Master, nhân viên vận hành |
| LiveOps | Vận hành sự kiện và cập nhật sau phát hành |
| ADR | Architecture Decision Record |

## 4. Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| Map | `Mxxx` | `M001` Nhà Thờ Hage |
| Quái | `MOBxxx` | `MOB001` Slime Cỏ |
| Boss | `BOSSxxx` | `BOSS001` Slime Vua |
| Vật phẩm | `ITMxxxxx` | `ITM00101` |
| Kỹ năng | `SKL_<hệ>_<n>` | `SKL_FIRE_3` |
| Nhiệm vụ | `Q_<loại>_<nn>` | `Q_MAIN_01`, `Q_DAILY_03` |
| NPC | `NPCxxx` | `NPC001` Sơ Lily |
| Key i18n | `domain.sub.key` | `quest.main.01.title` |
