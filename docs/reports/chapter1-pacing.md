# Báo cáo: nhịp chơi Chương 1 (mô phỏng)

> **Trạng thái:** bậc A3 ([roadmap §8](../product/roadmap.md)). Chạy lại: `python3 tools/sim/chapter1.py` (thử số khác: `--set-exp Q_MAIN_03=350,Q_MAIN_04=600`).

## 1. Mục đích

Ước tính một người chơi trung bình mất bao lâu để chơi trọn Chương 1 (Q_MAIN_01–12, Lv1 → Lv10) **một mình**, và tìm chỗ phải "cày" quá lâu. Mục tiêu ở roadmap: khoảng **1 giờ**, không có bức tường cày dài ở đầu game.

## 2. Mô hình và giả định

- Công thức lấy từ [combat §2–§3](../game-design/04-combat-and-progression.md): EXP quái `8L + 10`, HP quái `30 + 22·L^1,5`, sát thương có giảm theo DEF, tỉ lệ trúng, chí mạng trung bình.
- Dữ liệu lấy từ bản chơi thử: nhiệm vụ, vị trí NPC và vùng quái trên map, kích thước map, hầm ngục DG01.
- Người chơi: xuất thân Dân Làng; cộng điểm theo gợi ý (2 HP, 2 ATK, 1 DEF mỗi 5 điểm); đánh thường 1 đòn/giây; từ Lv5 thêm Tụ Mana Chấn mỗi 3 giây.
- Trang bị: khoảng 8,3% số quái rơi đồ ([combat §6](../game-design/04-combat-and-progression.md)); món nào cấp cao hơn thì mặc, một nửa số đồ nhặt được đem bán.
- Thời gian:
  - đi bộ 180 px/s; mỗi lần qua cổng 3 giây; mỗi lần gặp NPC 12 giây;
  - tìm con quái kế tiếp: 4 giây ngoài map, 2 giây trong hầm ngục;
  - cảnh truyện: 1 phút (Q_MAIN_11), 1,5 phút (Q_MAIN_12);
  - đánh Trang Lạc: thời gian lý thuyết ×1,4 vì phải né vùng báo hiệu.
- Máu: quái đánh mỗi 1,6 giây; uống bình khi HP dưới 40%, hết bình thì mua ở Lam Nhi; đi đường thì hồi 1% HP mỗi 5 giây.
- Khi chưa đủ cấp nhận nhiệm vụ kế tiếp: cày ở vùng quái cao nhất không quá cấp người chơi + 1.

Mô hình **không** tính: người chơi giỏi hoặc chậm, chết, đọc kỹ thoại, đi lạc, Tinh anh và Thủ lĩnh. Kết quả là ước lượng để so sánh các phương án, không thay cho playtest. Bản chơi thử nay ghi **thời gian chơi thật** (hiện ở thẻ "Hết Chương 1") để đối chiếu.

## 3. Kết quả trước khi chỉnh (số liệu Draft v0.2)

| Nhiệm vụ | Tên | Lv yêu cầu | Lv đầu → cuối | Phút | Trong đó cày | Quái | Mốc (phút) |
|---|---|---|---|---|---|---|---|
| Q_MAIN_03 | Thỏ Phá Ruộng | 2 | 2 → 3 | 2.1 | 0.0 | 8 | 4 |
| Q_MAIN_04 | Hái Thảo Dược | 3 | 3 → 3 | 2.1 | 0.0 | 0 | 6 |
| Q_MAIN_05 | Bài Học Của Khôi | 5 | 3 → 5 | 5.8 | 3.8 | 36 | 12 |

**Tổng:** 48 phút, 163 quái, Lv 10, Quan còn 5822 (đã mua bình 840), EXP bị chặn ở giới hạn Lv9: 0.

Điểm yếu: phút thứ 6 người chơi gặp **bức tường cày đầu tiên**: khoảng 4 phút, 36 con Nấm Lùn và Thỏ Đốm, chỉ để từ Lv3 lên Lv5 mới nhận được Q_MAIN_05. Đây là lúc dễ bỏ game nhất.

## 4. Thay đổi

| Nhiệm vụ | Trước | Sau | Lý do |
|----------|-------|-----|-------|
| Q_MAIN_03 Thỏ Phá Ruộng | 200 EXP | **350 EXP** | Rút ngắn bức tường cày trước Q_MAIN_05 |
| Q_MAIN_04 Hái Thảo Dược | 300 EXP | **600 EXP** | Như trên; nhiệm vụ này không có quái nên trước đây gần như không cho EXP |

Không đổi cấp yêu cầu của Q_MAIN_05: Tụ Mana Chấn mở ở Lv5 ([classes §4.1](../game-design/03-origins-classes-skills.md)).

## 5. Kết quả sau khi chỉnh

| Nhiệm vụ | Tên | Lv yêu cầu | Lv đầu → cuối | Phút | Trong đó cày | Quái | Mốc (phút) |
|---|---|---|---|---|---|---|---|
| Q_MAIN_01 | Buổi Sáng Ở Nhà Học | 1 | 1 → 1 | 0.7 | 0.0 | 0 | 1 |
| Q_MAIN_02 | Dọn Vườn Thuốc | 1 | 1 → 2 | 1.4 | 0.0 | 5 | 2 |
| Q_MAIN_03 | Thỏ Phá Ruộng | 2 | 2 → 3 | 2.1 | 0.0 | 8 | 4 |
| Q_MAIN_04 | Hái Thảo Dược | 3 | 3 → 4 | 2.1 | 0.0 | 0 | 6 |
| Q_MAIN_05 | Bài Học Của Khôi | 5 | 4 → 5 | 4.5 | 2.4 | 21 | 11 |
| Q_MAIN_06 | Chó Rừng Lạc Bầy | 5 | 5 → 5 | 2.3 | 0.0 | 8 | 13 |
| Q_MAIN_07 | Bao Tải Bị Lấy | 6 | 5 → 6 | 4.1 | 0.7 | 12 | 17 |
| Q_MAIN_08 | Giếng Làng Cạn | 7 | 6 → 7 | 7.3 | 2.3 | 26 | 24 |
| Q_MAIN_09 | Tờ Giấy Trắng | 8 | 7 → 8 | 7.4 | 2.5 | 24 | 32 |
| Q_MAIN_10 | Trang Lạc | 9 | 8 → 9 | 9.5 | 3.7 | 40 | 41 |
| Q_MAIN_11 | Đêm Trước Ngày Lễ | 9 | 9 → 9 | 1.4 | 0.0 | 0 | 43 |
| Q_MAIN_12 | Lễ Khai Thư | 10 | 9 → 10 | 4.2 | 0.4 | 3 | 47 |

**Tổng:** 47 phút, 147 quái, Lv 10, Quan còn 5665 (đã mua bình 820), EXP bị chặn ở giới hạn Lv9: 0.

**Đọc kết quả:**
- Trọn Chương 1 khoảng **47 phút** với người chơi trung bình, nằm trong mục tiêu 1 giờ. Người mới chơi chậm hơn sẽ gần 1 giờ.
- Phần cày rải đều trước Q_MAIN_05, Q_MAIN_08, Q_MAIN_09, Q_MAIN_10 (mỗi đoạn 2–3,5 phút), đúng nhịp "làm nhiệm vụ rồi đánh quái thêm một chút" kiểu Ninja School.
- Giới hạn Lv9 trước Q_MAIN_11 không làm mất EXP.
- Quan dư khoảng 5.700 ở cuối chương vì chưa có cường hóa. Hố chi này sẽ có ở bậc sau ([items §6](../game-design/07-items-and-equipment.md)).

## 6. Việc tiếp theo

- Playtest thật (5–10 người) với đồng hồ của bản chơi thử, so với mô phỏng; chỉnh giả định ở §2 nếu lệch quá 25%.
- Khi có cường hóa, chạy lại để kiểm tra lượng Quan dư.
