# Báo cáo: nhịp chơi đầu Chương 2 (mô phỏng, bậc B5.1)

> **Trạng thái:** bậc B5.1 ([roadmap §8.4](../product/roadmap.md)). Chạy lại: `python3 tools/sim/chapter2.py` (thử số khác: `--set-exp Q_MAIN_15=6000`, `--set-level Q_MAIN_15=12`).

## 1. Mục đích

Ước tính thời gian chơi Q_MAIN_13–16 (Lá Thư Để Lại → Vòng 1: Lợn Rừng Chúa) một mình, từ chỗ Chương 1 kết thúc, và tìm chỗ phải cày quá lâu. Đặt EXP thưởng nhiệm vụ cho bốn nhiệm vụ mới ([quests §5](../game-design/06-quests-and-missions.md)).

## 2. Mô hình và giả định

Dùng lại công thức và giả định của [báo cáo Chương 1 §2](chapter1-pacing.md): đi bộ 180 px/s, 3 giây mỗi cổng, 12 giây mỗi lần gặp NPC, 4 giây tìm quái, quái đánh mỗi 1,6 giây, uống bình dưới 40% HP. Thêm:

- Người chơi bắt đầu ở cạnh Bà Mơ, Lv10, Hỏa Kiếm Sĩ (ATK +15%, DEF −5%), mặc Kiếm Lửa Tập Sự Lv10, Huyền Thư Sơ Bản, đồ Lv9 ở ba ô còn lại.
- Ngoài đánh thường và Tụ Mana Chấn, dùng **Hỏa Cầu** mỗi 3 giây (120% ATK, chưa tính cháy).
- Dữ liệu đọc từ `packages/content` (nhiệm vụ, quái, vật phẩm nhiệm vụ) và `art/prototype/maps` (kích thước map, vị trí NPC, vùng quái, điểm boss).
- Đường đi: M001 → M002 → M003 → M004 → M005; Tổng Đường Pháp Vệ (M008) vào bằng cổng giữa Thượng Đô; Đồng Lúa (M009) ở cổng phải Thượng Đô.
- Trang Sách Thất Lạc rơi 50% từ Lùn Cướp Đồng: tính đủ 20 con cho 10 trang.
- Lợn Rừng Chúa: Mini-boss Lv12, HP ×10, DEF ×1,2 ([combat §2.1](../game-design/04-combat-and-progression.md)), đánh một mình, thời gian lý thuyết ×1,4 vì phải né vùng báo hiệu.
- Thiếu cấp thì cày Lợn Rừng Đồng ở Đồng Lúa.

Mô hình **không** tính: chết, đọc kỹ thoại, Tinh anh, Thủ lĩnh, gọi bầy của Lùn Cướp Đồng, phải chờ Lợn Rừng Chúa hồi sinh khi người khác vừa hạ.

## 3. Kết quả

**Phương án theo bảng thiết kế cũ** (Q_MAIN_15 cần Lv12):

| Nhiệm vụ | Lv yêu cầu | Lv đầu → cuối | Phút | Trong đó cày | Quái | Mốc (phút) |
|---|---|---|---|---|---|---|
| Q_MAIN_13 | 10 | 10 → 10 | 1.4 | 0.0 | 0 | 1 |
| Q_MAIN_14 | 10 | 10 → 10 | 2.3 | 0.0 | 0 | 4 |
| Q_MAIN_15 | 12 | 10 → 13 | 15.6 | 9.7 | 125 | 19 |
| Q_MAIN_16 | 12 | 13 → 13 | 2.0 | 0.0 | 0 | 21 |

**Tổng:** 21 phút, 125 quái, Lv 13 (75%).

Ngay sau khi tới Thượng Đô có **bức tường cày gần 10 phút** (khoảng 70 con lợn chỉ để từ Lv10 lên Lv12), đúng kiểu điểm bỏ game mà Chương 1 đã gỡ ([báo cáo Chương 1 §4](chapter1-pacing.md)).

**Phương án chọn** (Q_MAIN_15 cần Lv11, EXP 1.500 / 3.000 / 6.000 / 5.000):

| Nhiệm vụ | Lv yêu cầu | Lv đầu → cuối | Phút | Trong đó cày | Quái | Mốc (phút) |
|---|---|---|---|---|---|---|
| Q_MAIN_13 | 10 | 10 → 10 | 1.4 | 0.0 | 0 | 1 |
| Q_MAIN_14 | 10 | 10 → 10 | 2.3 | 0.0 | 0 | 4 |
| Q_MAIN_15 | 11 | 10 → 12 | 7.8 | 1.8 | 52 | 12 |
| Q_MAIN_16 | 12 | 12 → 13 | 2.1 | 0.0 | 0 | 14 |

**Tổng:** 14 phút, 52 quái, Lv 13 (4%), Quan còn 4.217 (đã mua bình 80).

## 4. Thay đổi so với tài liệu thiết kế

| Mục | Trước | Sau | Lý do |
|-----|-------|-----|-------|
| Cấp nhận Q_MAIN_15 | 12 | **11** | Bỏ bức tường cày ~10 phút ngay khi vào chương mới; phần cày còn lại dưới 2 phút |
| EXP Q_MAIN_13–16 | chưa có | 1.500 / 3.000 / 6.000 / 5.000 | Cuối Q_MAIN_16 người chơi vừa chạm Lv13; Q_MAIN_16 (Lv12) mở ngay sau Q_MAIN_15 |

Số liệu là giá trị khởi điểm; cần đối chiếu với thời gian chơi thật ở đợt playtest.

## 5. Việc tiếp theo

- **Bậc B5.2:** Q_MAIN_17 (Bóng Giám Khảo) cần Lv15 theo [quests §5](../game-design/06-quests-and-missions.md), trong khi B5.1 kết thúc ở Lv13. Phải đặt EXP và quái Đồi Cối Xay Gió (Lv14–18) sao cho khoảng Lv13 → Lv15 không thành bức tường mới; chạy lại mô phỏng khi có số liệu.
- Mô phỏng chưa tính gọi bầy của Lùn Cướp Đồng (có thể làm chậm người mới) và việc chờ Lợn Rừng Chúa hồi sinh (3 phút) khi đông người cùng làm Q_MAIN_16.
