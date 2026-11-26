# Nhân vật & NPC

> **Trạng thái:** Draft v0.2 (bản reskin) · **Phụ thuộc:** [lore](01-lore-and-story.md) · [maps](05-world-maps-monsters.md) · [reskin-spec](../product/reskin-spec.md)
> Mọi nhân vật là **hư cấu, do dự án sáng tạo**. Mỗi ID giữ nguyên **chức năng game** của thiết kế trước; chỉ **danh tính** thay đổi.

## 1. Nguyên tắc thiết kế NPC

- Mỗi NPC có **một chức năng game rõ ràng** (cửa hàng, huấn luyện, dịch vụ, nhiệm vụ): một NPC là một menu.
- NPC đứng cố định theo `map + tọa độ`, một số NPC di chuyển theo chương.
- Mỗi NPC có menu tối đa **5 mục** và **một nét riêng** dễ nhớ.

## 2. Nhân vật cốt truyện

| ID | Tên | Vai trò | Vị trí | Chức năng chính |
|----|-----|---------|--------|-----------------|
| NPC001 | **Thầy Bạch Vân** | Thầy lang du hành, người dạy nhà học | M001; mất tích sau Lễ Khai Thư, trở lại ở Chương 7 | Hướng dẫn tân thủ, nhiệm vụ Chương 1, **Lễ Khai Thư** (Lv10) |
| NPC002 | **Bà Mơ** | Người giữ nhà học | M001 | Nhiệm vụ làng sau khi thầy đi, **đổi tên nhân vật** (tốn Nén Bạc); sau khi thầy đi, nhận việc **đổi hệ phép miễn phí** trong 24 giờ đầu ([classes §5](03-origins-classes-skills.md)) |
| NPC003 | **Lam Nhi** | Bạn, học trò thầy lang | M001–M002; từ khi xong Q_MAIN_13 ở M005 (Thượng Đô); sau xuất hiện ở các chương | Chuỗi **Bạn Đồng Hành**, chế thuốc nhỏ; **tiệm thuốc**: bán Bình HP/MP Nhỏ và Vừa, mua lại đồ (ở làng, rồi theo người chơi lên Thượng Đô) |
| NPC004 | **Khôi** | Bạn, người thừa kế bí mật của Xích Sa | M001–M002; từ khi xong Q_MAIN_13 ở M009 (đầu Đồng Lúa); trục Chương 5 | Chuỗi **Bạn Đồng Hành** |
| NPC005 | **Chấp Bút Hạc Minh** | Người đứng đầu Pháp Vệ Đoàn | M008 (ngủ gật cạnh Tổng Đường) | Nhiệm vụ chính cấp cao (Q_MAIN_23), lễ phong hạng, **Mùa Giải** |
| NPC006 | **Viện Chủ Mạc Uyên** | Đứng đầu Viện Đoài | M008 | Huấn luyện hệ **Ám**, dạy **Khải Thể**, nhiệm vụ Chương 3 |
| NPC007 | **Viện Chủ Tôn Kiệt** | Đứng đầu Viện Càn | M008 | Danh Vọng Viện Càn |
| NPC008 | **Viện Chủ Đan Hồng** | Đứng đầu Viện Ly | M008 | Huấn luyện hệ **Hỏa**, Danh Vọng Viện Ly |
| NPC009 | **Võ Sư Thiết Lan** | Võ sư của Pháp Vệ Đoàn | M008 | **Khải Thể nâng cao**, thử thách thể lực |
| NPC010 | **Thủ Thư Cố An** | Trưởng Thư Khố Ngoại Viện | M015 | Nhiệm vụ Chương 3, tra cứu tư liệu |
| NPC011 | **Viện Chủ Vân Tước** | Đứng đầu Viện Tốn | M005 | Huấn luyện hệ **Phong**, Danh Vọng Viện Tốn |
| NPC012 | **Sứ Giả Sa Nguyệt** | Sứ giả của Xích Sa | M012, sau ở M020 | Nhiệm vụ phụ ngoại giao Chương 5 |
| NPC013 | **Viện Chủ Thảo Nhiên** | Đứng đầu Viện Khôn | M005 | Huấn luyện hệ **Mộc**, nhiệm vụ hồi phục |

### 2.1 Chân dung ngắn

| Nhân vật | Ngoại hình | Tính cách | Bí mật / vòng cung |
|----------|-----------|-----------|--------------------|
| **Thầy Bạch Vân** | Gầy, tóc bạc buộc gọn, áo vải xám, túi thuốc và cuốn sổ cũ | Trầm, kiệm lời, hay ví von bằng sách | **Đồng sáng lập Hội Hiệu Đính**, rời đi sau Năm Trắng; giữ **Quyển Gốc thứ mười hai** |
| **Lam Nhi** | Nhỏ người, tóc tết, túi đeo chéo đầy lọ thuốc | Tò mò, nói nhanh, sáng tạo, đánh yếu nhưng nhiều mẹo | Muốn chữa Bệnh Trắng; lớn lên thành người giữ mép trang ở Chương 8 |
| **Khôi** | Cao, điềm đạm, áo vải thô nhưng dáng đi như quý tộc | Lịch sự, ít nói, mạnh, luôn né chuyện gia đình | **Người thừa kế Xích Sa**; ở Chương 5 phải chọn giữa gia tộc và bạn bè |
| **Chấp Bút Hạc Minh** | Già, râu dài, áo choàng lấm mực | Vui tính, hay ngủ gật, sắc sảo bất ngờ | Từng là bạn của Thầy Bạch Vân; biết về Năm Trắng nhưng giữ im lặng |

> **Không có** cặp bạn hứa "trở thành người mạnh nhất" và **không có** nhân vật "không có phép". Mục tiêu chung của ba người là **tìm thầy** và **hiểu Bệnh Trắng**.

## 3. NPC ở Cảng Thư Khố (hub Chương 3)

| ID | Tên | Vai | Dịch vụ trong game |
|----|-----|-----|--------------------|
| NPC020 | **Bác Tô** | Người giữ **Thẻ Kẹp Trang** | **Dịch chuyển** giữa các map đã mở (phí Quan theo khoảng cách) |
| NPC021 | **Viện Chủ Lâm Hải** | Đứng đầu Viện Khảm | Huấn luyện hệ **Thủy**, nhiệm vụ kiểm soát phép |
| NPC022 | **Trưởng Bến Lưu Mãnh** | Quản bến cảng | Nhiệm vụ ngày của Cảng |
| NPC023 | **Viện Chủ Đổng Tráng** | Đứng đầu Viện Chấn (ở M008) | Huấn luyện hệ **Lôi**, sự kiện đấu tập |
| NPC024 | **Cô Kim Thoa** | Chủ **Vòng Quay Chữ Vàng** | Vòng quay may mắn |
| NPC025 | **Bà Hai Bánh** | Bán bánh và cơm | **Thức ăn buff** |
| NPC026 | **Đấu Sư Hoàng Thạch** | Chủ đấu trường | **Đấu Trường** (PvP 1v1 xếp hạng) |
| NPC027 | **Lang Tám** | Lang thuốc | Thảo dược, giải độc |
| NPC028 | **Bác Phu Trạm** | Đưa thư | **Thư tín** và bưu kiện |
| NPC029 | **Thợ Đóng Sách Bình** | Thợ đóng sách | **Chế tạo**, tháo Hạt Nguyên |
| NPC030 | **Chú Thợ Bẫy** | Thợ săn | Vật phẩm chiến đấu |
| NPC031 | **Bà Thủ Kho** | Giữ kho | **Kho đồ**, mở rộng túi |
| NPC032 | **Cai Hầm** | Dẫn đường hầm ngục | Nhiệm vụ hầm ngục |

## 4. NPC dịch vụ chung

| ID | Tên | Vị trí | Chức năng |
|----|-----|--------|-----------|
| NPC040 | **Cụ Trương** (trưởng làng) | M001 | Nhiệm vụ tân thủ, bảng tin làng |
| NPC041 | **Bác Theo** | M006 | Cửa hàng vật phẩm cơ bản |
| NPC042 | **Thợ Rèn Tư** | M006 | **Cường hóa** trang bị +1…+16 |
| NPC043 | **Thợ Khảm** | M006 | Khảm Hạt Nguyên |
| NPC044 | **Cô Út Chợ** | M006 | **Chợ Ký Gửi** |
| NPC045 | **Thầy Ký Bảng** | M008 | **Bảng Nhiệm Vụ Pháp Vệ** hằng ngày/tuần |
| NPC046 | **Giám Khảo Tuyển Thư** | M008 | Mùa Tuyển Thư (ghi danh Q_MAIN_14, giao và nhận các vòng thi Q_MAIN_15–19), kiểm tra thăng hạng |
| NPC047 | **Cô Ký Đội** | M008 | Lập/giải tán Đội, nộp Điểm Cống Hiến |
| NPC048 | **Người Dắt Đệ Tử** | M005 | **Khế ước Đệ Tử** |
| NPC049 | **Bác Chổi** | M005 | Mua/sửa **Chổi Bay**, Linh Thú |
| NPC050 | **Lính Gác** | M005, M012 | Hồi sinh miễn phí, dịch chuyển về thành |
| NPC051 | **Viện Chủ Thạch Bàn** | M008 | Huấn luyện hệ **Thổ**, Danh Vọng Viện Cấn |
| NPC052 | **Trưởng Lão Thư Ngữ** | M024 | Chuỗi mở **Nhập Linh** (Lv85) |
| NPC053 | **Cụ Tiễn** | M026 | Chuỗi **Năm Ấn Tiễn** (hệ ẩn) |

## 5. Huấn luyện viên theo hệ

Mỗi huấn luyện viên đồng thời là **Viện Chủ** của một Viện.

| Hệ | Huấn luyện viên | Viện | Vị trí |
|----|-----------------|------|--------|
| Hỏa | Viện Chủ Đan Hồng (NPC008) | Ly | M008 |
| Thủy | Viện Chủ Lâm Hải (NPC021) | Khảm | M015 |
| Phong | Viện Chủ Vân Tước (NPC011) | Tốn | M005 |
| Lôi | Viện Chủ Đổng Tráng (NPC023) | Chấn | M008 |
| Thổ | Viện Chủ Thạch Bàn (NPC051) | Cấn | M008 |
| Mộc | Viện Chủ Thảo Nhiên (NPC013) | Khôn | M005 |
| Ám | Viện Chủ Mạc Uyên (NPC006) | Đoài | M008 |
| Phong Ấn Xạ Thủ | Cụ Tiễn (NPC053) | — | M026 |

Viện Càn không gắn với hệ nào; Viện Chủ Tôn Kiệt (NPC007) phụ trách danh vọng tinh nhuệ. Người chơi chọn hệ tại **Lễ Khai Thư**; huấn luyện viên dạy **kỹ năng tiếp theo** và **đổi hệ** (xem [classes §5](03-origins-classes-skills.md)).

## 6. Danh vọng Viện (8 Viện)

Tám **Viện** của Pháp Vệ Đoàn đặt theo **Bát Quái**, mỗi Viện một **phong cách làm việc**. Điểm Danh Vọng Viện tăng nhờ nhiệm vụ Viện; mốc danh vọng mở cửa hàng riêng.

| Viện | Quẻ gợi | Phong cách | Cửa hàng Viện bán |
|------|---------|-----------|-------------------|
| **Viện Càn** | Trời | Tinh nhuệ, nghiêm cẩn | Trang bị cao cấp |
| **Viện Khôn** | Đất | Hậu cần, nuôi quân, thảo dược | Thuốc, thức ăn |
| **Viện Chấn** | Sấm | Xung kích, chớp nhoáng | Vũ khí Lôi/Hỏa, buff ATK |
| **Viện Tốn** | Gió | Trinh sát, thư tín | Giày, bản đồ, phương tiện |
| **Viện Khảm** | Nước | Hải quân, cảng | Vật phẩm thủy, thuyền thẩm mỹ |
| **Viện Ly** | Lửa | Thợ rèn, chế tác | Vật liệu, công thức |
| **Viện Cấn** | Núi | Phòng thủ, canh giữ | Khiên, giáp |
| **Viện Đoài** | Đầm | Tình báo, ngoại giao | Trang phục, phụ kiện |

**Thư Khố Ngoại Viện** ở Cảng Thư Khố là nơi lưu trữ của Pháp Vệ Đoàn, **không phải** một Viện và không có cửa hàng danh vọng.

Tám Viện là **phe NPC**. Khác với **Đội do người chơi lập** ([social](09-social-squad-pvp-events.md)): người chơi có thể ở một Đội và đồng thời có Danh Vọng ở các Viện.

## 7. Phản diện & Boss cốt truyện

| ID | Tên | Chương | Ghi chú |
|----|-----|--------|---------|
| BOSS004 | Kẻ Trộm Quyển | 2 | Tay sai của Hội Hiệu Đính |
| BOSS009 | Kẻ Đốt Sách | 4 | Boss sự kiện Đêm Thư Cháy |
| BOSS013 | Tướng Quân Hồng Tiêu | 5 | Chú của Khôi; tha/bắt |
| BOSS016 | Trưởng Lão Bị Xóa | 6 | Gọi lại tên hoặc đánh bại |
| BOSS019–021 | Ba Hiệu Đính Viên (Mặc Ảnh, Chỉ Hạc, Nghiên Sương) | 7 | Raid 10 người, 3 pha; tên đặt theo **mực, giấy, nghiên** |
| BOSS022 | Chủ Biên Văn Khải | 7 | Thủ lĩnh Hội Hiệu Đính; đánh bại hoặc thuyết phục |
| BOSS024 | Kẻ Xóa Tên | 8 | Sinh ra từ khoảng trắng |
| BOSS025 | Mực Nguyền | 8 | Sinh ra từ khoảng trắng |
| BOSS026 | Đại Trang Trắng | 8 | Raid 15 người, boss cuối Mùa 1 |

### 7.1 Hội Hiệu Đính
- **Tín điều:** *"Sửa cho công bằng."* Tin rằng lễ nhận sách phép là trò xổ số của trời, và muốn **viết lại Nguyên Điển** để ai cũng nhận được phép như nhau.
- **Thủ lĩnh:** **Chủ Biên Văn Khải**, học giả của Bạch Lĩnh, người sống sót sau Năm Trắng. Chân thành, thông minh, **sai ở chỗ coi cá tính của phép thuật là bất công cần xóa**.
- **Ba Hiệu Đính Viên:** **Mặc Ảnh** (lạnh lùng, lẩn trong bóng mực), **Chỉ Hạc** (nhẹ nhàng, dùng giấy gấp thành chim), **Nghiên Sương** (cứng rắn, giữ kỷ luật).
- **Thành viên (Hiệu Đính Sinh):** nhiều người là **dân thường từng nhận sách trắng**; có thể **thuyết phục**.

Danh sách đầy đủ, chỉ số và drop xem [world-maps-monsters](05-world-maps-monsters.md).

## 8. Nhân vật người chơi

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
| 1–9 | Dân Làng |
| 10–29 | Thư Lại Tập Sự |
| 30–49 | Pháp Vệ |
| 50–69 | Pháp Vệ Tinh Anh |
| 70–84 | Đội Phó |
| 85–99 | Đội Trưởng |
| 100 | Ứng Viên Chấp Bút |
