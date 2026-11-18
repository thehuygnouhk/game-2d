# Nhân vật & NPC

> **Trạng thái:** Draft v0.1 · **Phụ thuộc:** [lore](01-lore-and-story.md) · [maps](05-world-maps-monsters.md)
> Nhân vật gốc được dùng với vai trò **NPC/Boss**. Tính cách và năng lực mô tả ở mức tổng quát, thoại viết lại bằng lời mới. Cần đối chiếu nguyên tác trước khi chốt.

## 1. Nguyên tắc thiết kế NPC

- Mỗi NPC có **một chức năng game rõ ràng** (cửa hàng, huấn luyện, dịch vụ, nhiệm vụ). Cách này giống NPC trong Ngọc Rồng/Ninja School (một NPC = một menu).
- Người chơi nhận ra nhân vật gốc qua **tính cách** và **kỹ năng** của họ.
- NPC đứng cố định theo `map + tọa độ`, một số NPC di chuyển theo chương.
- Mỗi NPC có menu tối đa **5 mục**.

## 2. Nhân vật cốt truyện

| ID | Tên | Vai trò | Vị trí | Chức năng chính |
|----|-----|---------|--------|-----------------|
| NPC001 | **Sơ Lily** | Người nuôi dưỡng, nhà thờ | M001 | Hướng dẫn tân thủ, nhiệm vụ chương 1, **đổi tên nhân vật** (tốn Ngọc) |
| NPC002 | **Cha Orsi** | Linh mục, nhà thờ | M001 | Giải thích Ma Đạo Thư, **Lễ Nhận Ma Đạo Thư** (Lv10) |
| NPC003 | **Asta** | Bạn thân, nhân vật chính tác | M001–M004, sau xuất hiện ở các chương | Nhiệm vụ lời hứa, **Phản Ma** (mở ở Chương 7) |
| NPC004 | **Yuno** | Bạn thân, thiên tài gió | M001, M005 | Huấn luyện hệ **Phong**, nhiệm vụ đối trọng |
| NPC005 | **Julius Novachrono** | Vua Phép Thuật | M008 | Nhiệm vụ chính cấp cao, lễ phong hạng, **Mùa Giải** |
| NPC006 | **Yami Sukehiro** | Đội trưởng Bò Đen | M015 | Huấn luyện hệ **Ám**, dạy **Mana Skin**, nhiệm vụ Chương 3 |
| NPC007 | **William Vangeance** | Đội trưởng Bình Minh Vàng | M008 | Danh vọng phe Bình Minh Vàng |
| NPC008 | **Fuegoleon Vermillion** | Đội trưởng Sư Tử Đỏ | M008 | Huấn luyện hệ **Hỏa**, danh vọng phe |
| NPC009 | **Mereoleona Vermillion** | Hiệp Sĩ mạnh, nghiêm khắc | M008 | Huấn luyện **Mana Skin nâng cao**, thử thách thể lực |
| NPC010 | **Charlotte Roselei** | Đội trưởng Hoa Hồng Xanh | M008 | Danh vọng phe Hoa Hồng Xanh |
| NPC011 | **Nozel Silva** | Đội trưởng Đại Bàng Bạc | M008 | Danh vọng phe Đại Bàng Bạc, nhiệm vụ gia tộc Silva |
| NPC012 | **Dorothy Unsworth** | Đội trưởng Công Xanh San Hô | M008 | Danh vọng phe; nhiệm vụ phụ |
| NPC013 | **Mimosa Vermillion** | Y sư, hệ Mộc | M005 | Huấn luyện hệ **Mộc**, nhiệm vụ hồi phục |

## 3. Thành viên Bò Đen (tiện ích gắn với kỹ năng gốc)

Mỗi thành viên của Pháo Đài Bò Đen (M015) là một NPC dịch vụ, ánh xạ theo kỹ năng của họ.

| ID | Tên | Kỹ năng gốc | Dịch vụ trong game |
|----|-----|-------------|--------------------|
| NPC020 | **Finral Roulacase** | Phép không gian | **Dịch chuyển** giữa các map đã mở (phí Yul theo khoảng cách) |
| NPC021 | **Noelle Silva** | Phép nước | Huấn luyện hệ **Thủy**, nhiệm vụ kiểm soát ma lực |
| NPC022 | **Magna Swing** | Phép lửa | Nhiệm vụ hàng ngày phe Bò Đen, cửa hàng vũ khí Hỏa tầm thấp |
| NPC023 | **Luck Voltia** | Phép sét | Huấn luyện hệ **Lôi**, sự kiện đấu tập |
| NPC024 | **Vanessa Enoteca** | Phép sợi chỉ | **Vòng Quay Sợi Chỉ Định Mệnh** (vòng quay may mắn) |
| NPC025 | **Charmy Pappitson** | Phép bông | **Cửa hàng thức ăn** và bình hồi phục (buff ăn uống) |
| NPC026 | **Gauche Adlai** | Phép gương | **Đấu Trường Gương** (PvP 1v1 xếp hạng) |
| NPC027 | **Gordon Agrippa** | Phép độc | Bán thảo dược, giải độc, nhiệm vụ nguyên liệu |
| NPC028 | **Grey** | Biến hình | **Thư tín** (hòm thư) và bưu kiện |
| NPC029 | **Henry Legolant** | Giả kim | **Chế tạo** (craft) và tháo ngọc |
| NPC030 | **Zora Ideale** | Phép bẫy | Bán bẫy/consumable chiến đấu, nhiệm vụ cạm bẫy |
| NPC031 | **Secre Swallowtail** | Phép phong ấn | **Kho đồ** (ngân hàng), mở rộng túi đồ |
| NPC032 | **Nacht Faust** | Phép bóng tối | Nhiệm vụ Hầm Ngục, danh vọng phe Bò Đen |

## 4. NPC dịch vụ chung (do game tự tạo)

| ID | Tên | Vị trí | Chức năng |
|----|-----|--------|-----------|
| NPC040 | **Trưởng Làng Hage** | M001 | Nhiệm vụ tân thủ, bảng tin làng |
| NPC041 | **Thương Nhân Kinh Đô (Bác Theo)** | M006 | Cửa hàng vật phẩm cơ bản |
| NPC042 | **Thợ Rèn Gren** | M006 | **Cường hóa** trang bị +1…+16 |
| NPC043 | **Thợ Khảm Linh** | M006 | Khảm Linh Thạch Ngọc |
| NPC044 | **Chủ Chợ Ký Gửi (Cô Mara)** | M006 | **Chợ Ký Gửi** |
| NPC045 | **Quản Lý Bảng Nhiệm Vụ** | M008 | **Bảng Nhiệm Vụ Hiệp Sĩ** hằng ngày/tuần |
| NPC046 | **Giám Khảo Hiệp Sĩ** | M008 | Kỳ thi tuyển, kiểm tra thăng hạng |
| NPC047 | **Thư Ký Đội** | M008 | Tạo/giải tán Đội Hiệp Sĩ, nộp Điểm Cống Hiến |
| NPC048 | **Người Huấn Luyện Tập Sự** | M005 | **Khế ước Hiệp Sĩ Tập Sự** (đệ tử) |
| NPC049 | **Chủ Chuồng Chổi** | M005 | Mua/sửa **Chổi Bay**, Tinh Linh Hộ Mệnh |
| NPC050 | **Lính Gác Thủ Đô** | M005, M012 | Hồi sinh miễn phí, dịch chuyển về thành |
| NPC051 | **Trưởng Lão Gnome (Terra)** | M024 | Huấn luyện hệ **Thổ** (nhân vật gốc của game) |
| NPC052 | **Thầy Dạy Tinh Linh** | M024 | Spirit Dive quest (Lv85) |
| NPC053 | **Liebe** | Ẩn (xem lore) | Chuỗi nhiệm vụ **Phản Ma** |

## 5. Quan hệ NPC với hệ phép (huấn luyện viên hệ)

| Hệ | Huấn luyện viên | Vị trí |
|----|-----------------|--------|
| Hỏa | Fuegoleon Vermillion (NPC008) | M008 |
| Thủy | Noelle Silva (NPC021) | M015 |
| Phong | Yuno (NPC004) | M005 |
| Lôi | Luck Voltia (NPC023) | M015 |
| Thổ | Trưởng Lão Gnome Terra (NPC051) | M024 |
| Mộc | Mimosa Vermillion (NPC013) | M005 |
| Ám | Yami Sukehiro (NPC006) | M015 |
| Phản Ma | Liebe (NPC053) + Asta | Ẩn |

> Người chơi chọn hệ tại **Lễ Nhận Ma Đạo Thư**. Huấn luyện viên chỉ ở Kinh Đô/Pháo Đài để **học kỹ năng tiếp theo** và **đổi hệ** (xem [classes](03-origins-classes-skills.md) §5).

## 6. Danh vọng phe (Faction Reputation)

9 Đội Hiệp Sĩ chính thức ở Kinh Đô cho **Danh Vọng Phe**. Điểm tăng nhờ nhiệm vụ phe và hoạt động. Mốc danh vọng mở cửa hàng phe riêng.

| Phe | Phong cách | Cửa hàng phe bán |
|-----|-----------|------------------|
| Bình Minh Vàng | Tinh nhuệ, chuẩn mực | Trang bị cao cấp |
| Sư Tử Đỏ | Chiến đấu, nhiệt huyết | Vũ khí Hỏa/Lôi, bình tăng ATK |
| Hoa Hồng Xanh | Quý tộc, tao nhã | Phụ kiện, trang phục |
| Bò Đen | Hoang dã, đoàn kết | Dịch vụ, vật phẩm độc, hóa trang |
| Đại Bàng Bạc | Quý tộc, kiêu hãnh | Phòng thủ, giáp |
| Công Xanh San Hô (Coral Peacocks) | Thanh lịch | Trang phục, tinh linh pet |
| Bọ Ngựa Xanh (Green Mantis) | Thận trọng | Vật phẩm do thám, bản đồ |
| Orca Tím (Purple Orcas) | Tập thể | Vật phẩm Squad |
| Hươu Nước (Aqua Deer) | Điềm đạm | Vật phẩm hồi phục, thảo dược |

Chín Đội này là **phe NPC chính thức**. Khác với **Squad do người chơi lập** ([social](09-social-squad-pvp-events.md)): người chơi có thể là thành viên của một Squad người chơi và đồng thời có Danh Vọng ở các phe NPC.

## 7. Nhân vật phản diện & Boss cốt truyện

| ID | Tên | Chương | Ghi chú |
|----|-----|--------|---------|
| BOSS009 | Kẻ Cầm Đầu Mắt Mặt Trời Nửa Đêm | 3 | Boss sự kiện theo đợt |
| BOSS013 | Tướng Quân Diamond | 5 | Lựa chọn tha/bắt |
| BOSS016 | Tinh Linh Hắc Hóa | 6 | Hóa giải hoặc đánh bại |
| BOSS019–021 | Bộ Ba Hắc Ám (Dante, Vanica, Zenon Zogratis) | 7 | Raid 10 người, 3 pha |
| BOSS022 | Lucius Zogratis | 7 | Boss cuối chương |
| BOSS024 | Zagred | 8 | Quỷ cấp cao |
| BOSS025 | Megicula | 8 | Quỷ cấp cao |
| BOSS026 | Lucifero | 8 | Raid 15 người, boss cuối Mùa 1 |

Danh sách đầy đủ, chỉ số và drop xem [world-maps-monsters](05-world-maps-monsters.md).

## 8. Nhân vật người chơi (player character)

### 8.1 Tạo nhân vật
- Nhập **tên** (3–16 ký tự, chữ/số/khoảng trắng), chọn **giới tính** và **ngoại hình** (kiểu tóc, màu tóc, màu mắt, 6 kiểu mặc định).
- Chọn **Xuất thân** (xem [classes](03-origins-classes-skills.md)). **Hệ phép** chọn ở Lv10.
- Mỗi tài khoản: **3 nhân vật / máy chủ**.

### 8.2 Hiển thị
Nhân vật dùng **paper-doll**: thân, đầu, tóc, mắt, trang phục từng ô được vẽ theo lớp để thay đổi theo trang bị. Xem [art-audio](12-art-audio-direction.md).

### 8.3 Danh hiệu & Hạng
Danh hiệu theo cấp, hiển thị dưới tên:

| Cấp | Hạng |
|-----|------|
| 1–9 | Dân Thường |
| 10–29 | Hiệp Sĩ Tập Sự |
| 30–49 | Hiệp Sĩ Phép Thuật |
| 50–69 | Hiệp Sĩ Tinh Anh |
| 70–84 | Đội Phó |
| 85–99 | Đội Trưởng |
| 100 | Ứng Viên Vua Phép Thuật |
