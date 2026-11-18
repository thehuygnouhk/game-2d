# Hệ thống Linh (phép thuật, Phái, Cội Nguồn)

> **Trạng thái:** Draft v0.1, chờ duyệt · **Liên quan:** [02 thế giới](02-world-and-history.md) · [04 phe và nhân vật](04-factions-and-characters.md) · [combat](../game-design/04-combat-and-progression.md)
> Tài liệu này định nghĩa **nội dung thế giới** của hệ thống. Công thức, số liệu và cấu trúc cơ chế (cấp, kỹ năng, chỉ số) nằm ở các tài liệu thiết kế game.

## 1. Nguyên lý

Muốn nhờ Linh, người ta làm ba việc theo thứ tự:

1. **Gọi tên:** nói đúng tên nơi chốn hay Linh.
2. **Giữ nhịp:** gõ, thổi, hát đúng nhịp mà Linh quen.
3. **Nhờ bằng Khí:** dốc hơi sức của mình để Linh giúp.

Vì vậy mỗi **Phái** có một **âm hưởng** riêng (dùi trống, sáo, chiêng, giọng hát…), và mọi kỹ năng đều có **tiếng** đi kèm. Đây là dấu ấn nhận diện của game, thể hiện cả ở **SFX** lẫn **hoạt ảnh**.

### 1.1 Giới hạn của Linh
Các giới hạn dưới đây là **luật thế giới**, đồng thời hỗ trợ nguyên tắc **solo-first**:

| Giới hạn | Hệ quả thiết kế |
|----------|------------------|
| Linh **không hồi sinh người đã mất** | Không có kỹ năng hồi sinh người khác |
| Linh **không tạo ra của cải từ không** | Kinh tế phải qua lao động, không có phép "biến vàng" |
| Linh **không thay được Tên của người** | Không có phép biến hình thành người khác |
| **Sương Lặng** làm Linh ngừng đáp | Là cơ chế vùng nguy hiểm, và là phản diện chính |

## 2. Lễ Khai Linh

Nghi lễ đánh thức Linh bản mệnh, thường tổ chức ở **đình làng** khi trẻ đến tuổi mười lăm. Người chơi trải qua lễ này ở **Lv10**.

| Bước | Diễn biến |
|------|-----------|
| 1 | Cả làng tụ về sân đình. **Ông Từ** mở cửa đình |
| 2 | **Cô Hạnh** gõ nhịp trên **trống làng** |
| 3 | Người khai linh **gọi tên mình ba lần**, mỗi lần một giọng |
| 4 | Bảy tiếng vọng đáp lại, mỗi tiếng của một **Linh Chủ** |
| 5 | Người khai linh **chọn một tiếng vọng** để theo, tức **chọn Phái** |
| 6 | Nhận **Linh Vật Tre** và vũ khí của Phái |

Truyền rằng *"Linh chọn người, nhưng người cũng chọn Linh"*, nên người chơi được **tự chọn** (có 24 giờ đổi miễn phí, xem [classes §5](../game-design/03-origins-classes-skills.md)). Trong **Đời Lặng**, tiếng vọng thường yếu và chỉ vang được một hai tiếng; người chơi **nghe được cả bảy** là điều lạ mà các NPC sẽ bàn tới.

## 3. Linh Vật

**Linh Vật** là vật chứa tiếng đáp của Linh, mang bên người, và là một ô trang bị đặc biệt. Phẩm cấp thể hiện qua **chất liệu**, không qua số lượng.

| Phẩm | Chất liệu | Cách có | Ý nghĩa |
|------|-----------|---------|---------|
| **Linh Vật Tre** | Ống tre khắc tên | Lễ Khai Linh (Lv10) | Khởi đầu, mộc mạc |
| **Linh Vật Đồng** | Đồng đúc, patin xanh | Chuỗi nhiệm vụ **Đúc Lại Tiếng** (Lv50, sau Chương 4) | Tiếng vang rõ hơn |
| **Linh Vật Ngọc** | Ngọc, chạm sáng | Chỉ qua con đường hệ ẩn **Thần Nỏ** (xem §5) | Hiếm, gắn với kết cục |

Việc nâng Linh Vật **không có yếu tố may rủi**; mọi người cùng đi một lộ trình nhiệm vụ.

## 4. Bảy Phái và Linh Chủ

Mỗi **Phái** là một trường phái, bảo trợ bởi một **Linh Chủ**. Linh Chủ là Linh lớn, đã được gọi tên từ **Thuở Gọi Tên**, không phải thần. Bốn trong bảy vị là **Tứ Linh** (Long, Lân, Quy, Phụng).

| Phái | Linh Chủ | Hệ | Vai trò (đơn thân) | Âm hưởng và vũ khí gợi ý | Tinh thần Phái |
|------|----------|----|--------------------|--------------------------|----------------|
| **Hỏa Phái** | **Phụng** (chim lửa) | Hỏa | Cận chiến bùng nổ | Kiếm cong; pháo, chiêng | *"Lửa để sưởi trước khi để đốt."* Phái của thợ pháo, thợ rèn |
| **Thủy Phái** | **Long** (rồng nước) | Thủy | Đánh xa diện rộng | Sào chèo; tiếng nước, hò | *"Nước chảy thì đá cũng mòn."* Phái của người lái đò, ngư dân |
| **Phong Phái** | **Lạc** (chim Lạc) | Phong | Tốc độ, chí mạng, nhảy đôi | Đoản kiếm, quạt giấy; sáo diều | *"Đi nhẹ mới tới xa."* Phái của phu trạm, người thả diều |
| **Lôi Phái** | **Hổ** (hổ gầm) | Lôi | Liên hoàn tốc đánh | Găng đồng, **dùi trống**; nhịp trống | *"Đánh đúng nhịp, một hạt cũng thành mưa."* Phái của người đánh trống, võ sĩ |
| **Thổ Phái** | **Lân** (kỳ lân đất) | Thổ | Bền bỉ, đỡ đòn, đánh chắc | Búa và khiên gỗ; chiêng | *"Đứng vững là thắng nửa trận."* Phái của nông dân, thợ xây |
| **Mộc Phái** | **Đa** (cây đa nghìn năm) | Mộc | Bền bỉ: độc và tự hồi phục; hỗ trợ nhóm là phần cộng thêm | **Sáo trúc**, trượng tre | *"Cây có rễ thì không sợ gió."* Phái của lang thuốc, người trồng cây |
| **Âm Phái** | **Quy** (rùa đen) | Âm | Bất lợi hóa, hút máu | **Hái** (lưỡi hái), đàn bầu | *"Giữ Tên cho người đi trước."* Phái của người **giữ sổ tên người mất** |
| *(ẩn)* **Nỏ Phái** | Không có Linh Chủ | — | Sát thương đơn mục tiêu, xuyên giáp | Nỏ | Xem §5 |

> **Quan hệ với hệ thống chơi:** bảy Phái tương ứng bảy hệ phép (Hỏa, Thủy, Phong, Lôi, Thổ, Mộc, Âm). Mọi Phái đều **solo được**, xem [combat §11](../game-design/04-combat-and-progression.md). **Mộc Phái không hồi sinh người khác.**

### 4.1 Dương (hệ của quái)
**Dương** là mặt đối của **Âm**: ánh sáng, nắng, kết tinh. Chỉ có ở **quái và vùng**, không có Phái Dương. Quy tắc Âm ↔ Dương khắc nhau giữ nguyên.

### 4.2 Vòng tương khắc (cách người xưa nói)
> *"Nước dập lửa, lửa tan gió, gió mòn đất, đất nuốt sấm, sấm xé nước."*

Tương ứng **Thủy → Hỏa → Phong → Thổ → Lôi → Thủy**. **Mộc** sống hòa với cả bốn mùa nên không bị khắc và không khắc. Số liệu khắc hệ giữ nguyên (×1,25 / ×0,8).

## 5. Hệ ẩn: Thần Nỏ

**Nỏ Phái** là truyền thống của những người làm nỏ và canh ải, không dựa vào Linh Chủ mà dựa vào **mũi tên được rèn bằng Tên**: mỗi mũi tên mang một cái tên, và **xuyên được Sương Lặng**.

| Hạng mục | Nội dung |
|----------|----------|
| Cảm hứng | Truyền thuyết nỏ thần (chỉ là cảm hứng, không dùng nhân vật truyền thuyết) |
| Người dẫn | **Bà Nỏ**, người thợ làm nỏ cuối cùng, sống ở ải |
| Điều kiện mở | Lv ≥ 80, hoàn thành Chương 7, thu thập **5 Mảnh Nỏ** (rơi từ boss Chương 4–7) |
| Chuỗi nhiệm vụ | **Chuỗi Năm Mũi Tên** |
| Tài nguyên | **Ý Chí** thay Khí |
| Bản sắc | Nội tại **Xuyên Giáp** (bỏ qua một phần DEF), **Tên Phá Lặng** (giải hiệu ứng có lợi, giảm sát thương từ Dị Loại hệ Âm) |
| Thưởng | **Linh Vật Ngọc**, mở **Khe B** (xem [classes §5](../game-design/03-origins-classes-skills.md)) |
| Hợp Linh | Thay bằng **Nhất Tiễn** (kỹ năng cuối của hệ) |

> **Lưu ý thiết kế:** hệ này đổi **cả vai trò** (tầm xa, đơn mục tiêu, không dùng kiếm) và **chủ đề** (nỏ, tên, canh ải) so với bản thiết kế trước, để không giữ lại bất kỳ nét gần nguyên tác nào. Bảng kỹ năng sẽ được thiết kế lại ở bước nội dung.

## 6. Ba Cội Nguồn (Xuất thân)

Người chơi chọn một **Mạch** khi tạo nhân vật; **không đổi được**. Mạch là di sản huyền tích, không phải dân tộc (xem [02 §4](02-world-and-history.md)).

| Mạch | Nội tại | Hiệu ứng | Gợi ý lối chơi |
|------|---------|----------|----------------|
| **Mạch Đất** | **Bền Chí** | Khi HP < 30%: +15% ATK và DEF trong 8 giây (hồi 60 giây) | Bền bỉ; hợp Thổ, Hỏa |
| **Mạch Rồng** | **Hơi Rồng** | Hồi Khí +25%, sát thương kỹ năng +5% | Sát thương phép; hợp Thủy, Âm, Lôi |
| **Mạch Tiên** | **Lộc Tiên** | Hồi HP 1%/3 giây ngoài giao tranh; hồi máu nhận +15%, gây ra +10% | Bền bỉ, tốc độ; hợp Mộc, Phong |

Chỉ số gốc theo từng Mạch giữ nguyên bảng ở [classes §2](../game-design/03-origins-classes-skills.md).

## 7. Kỹ năng cao cấp

### 7.1 Hợp Linh (Lv85)
Người chơi gọi đúng **nhịp của Linh Chủ** để **hợp thể** trong 30 giây. Bảy Phái có bảy Hợp Linh: **Phụng, Long, Lạc, Hổ, Lân, Đa, Quy**.

- Mở bằng chuỗi nhiệm vụ **Hòa Nhịp** (cuối Chương 6 đến Lv85), do **Cụ Đa** hướng dẫn.
- Cần đầy **Thanh Nhịp** (nạp bằng cách gây/nhận sát thương).
- Không dùng được trong Thành an toàn.

### 7.2 Giáp Khí
Kỹ năng phổ thông (mọi Phái trừ Nỏ): tụ Khí quanh thân để cứng cáp hơn. Học ở **Bà Tư Võ** (Chương 3).

## 8. Đồng hành và phương tiện

| Hệ thống | Tên mới | Mô tả |
|----------|---------|-------|
| Đệ tử | **Đệ Tử** | Học trò đi theo người chơi chiến đấu, lớn dần qua 5 bậc (Môn Sinh → Học Trò → Sư Huynh → Đại Sư Huynh → Cao Đồ) |
| Thú cưng | **Linh Thú** | Linh nhỏ hình loài vật: **cá chép** (tiến hóa thành rồng: cá chép vượt vũ môn), cò, chuồn chuồn, ếch, trâu con |
| Phương tiện | **Diều Bay** (lướt nhẹ, Lv10), **Trâu** (nhanh, Lv30), **Cò Linh** (bay tự do ở Vùng Trời, Lv60) | Thay chổi bay |
| Linh Thú huyền thoại | **Tứ Linh** (Long, Lân, Quy, Phụng) | Bốn trong bảy Linh Chủ, phần thưởng Mùa Giải |

Quy tắc số liệu của Đệ Tử, Linh Thú, phương tiện giữ như [companions](../game-design/10-companions-and-mounts.md).

## 9. Danh và Lễ Xướng Danh

**Danh** là điểm danh vọng, nhận từ thành tích: hạ boss lần đầu, hoàn thành chương, thắng PvP, **ghi vào Sổ Tên**.

- Cuối tháng, **Lễ Xướng Danh** tổ chức ở Linh Đô: đọc to tên những người có Danh cao nhất.
- **Bảng Vàng** là bảng xếp hạng Danh, Lực Chiến, Cấp độ, Trại.
- Danh quyết định **hạng thành tích** và danh hiệu cuối mùa.

### 9.1 Sổ Tên
**Sổ Tên** là cuốn sổ cá nhân của người chơi, ghi lại **những cái tên đã được nhớ lại** qua nhiệm vụ: một người thợ đã mất, một con đò cũ, một Linh bị quên.

- Mỗi nhiệm vụ phụ thuộc họ **Tên Người Đã Quên** thêm một dòng vào Sổ Tên.
- Số tên ghi được ảnh hưởng **kết cục** và **phần thưởng** của Chương 8 (xem [05](05-main-story.md)).
- Là hệ thống xương sống của chủ đề **nhớ nguồn**, và là nội dung **solo** hoàn toàn.

## 10. Ý tưởng tùy chọn: Hợp Nhịp

Khi **từ 3 người khác Phái** cùng dùng kỹ năng trong cửa sổ 3 giây, kích hoạt **Hợp Nhịp**: tăng nhẹ sát thương và hồi Khí cho cả nhóm. Mục đích: thể hiện chủ đề **chụm lại** mà **không bắt buộc** đi nhóm. Chỉ làm nếu không phá cân bằng solo-first; cần mô phỏng trước.

## 11. Bảng thuật ngữ cốt lõi

| Khái niệm | Thuật ngữ mới |
|-----------|---------------|
| Năng lượng (MP) | **Khí** |
| Sách phép (ô trang bị đặc biệt) | **Linh Vật** |
| Hệ phép / lớp nhân vật | **Phái** |
| Bang hội | **Trại** (người đứng đầu: **Trại Chủ**) |
| Cấp độ danh vọng | **Danh** |
| Biến thân tối thượng | **Hợp Linh** |
| Phó bản | **Hầm Ngục** (giữ), hoặc **Động** khi gắn bối cảnh |
| Quái vật | **Dị Loại** |
| Pháp sư/hiệp sĩ | **Linh Sĩ** |
| Học viện/cơ quan | **Linh Quán** |
| Nghi lễ nhận phép | **Lễ Khai Linh** |
| Tiền mềm / cao cấp | **Quan** / **Nén Bạc** |
