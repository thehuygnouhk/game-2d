# Bản chơi thử Chương 1 (trình duyệt)

Bản thử để **cảm nhận** cơ chế đánh quái và boss theo giờ của Chương 1, dùng art thử ở [`art/prototype`](../../art/prototype/README.md). Chạy hoàn toàn trên trình duyệt bằng Phaser 3.80.1. **Không phải kiến trúc thật**: game thật tính mọi kết quả ở server ([CLAUDE.md](../../CLAUDE.md), quy tắc 4).

## Chạy

```bash
python3 -m http.server 8000 --directory prototype/playable
```

Mở `http://localhost:8000`, bấm vào màn chơi rồi dùng bàn phím hoặc chuột.

**Lưu game:** tự lưu trên trình duyệt này (cấp, EXP, Quan, túi đồ, đồ đang mặc, nhiệm vụ, map và vị trí) mỗi 10 giây, khi đổi map, khi mua bán hoặc mặc đồ, và khi đóng tab. Mở lại là chơi tiếp. Muốn chơi lại từ đầu: nút "Xóa dữ liệu lưu" trong công cụ thử. Chế độ ẩn danh hoặc trình duyệt chặn lưu trữ thì vẫn chơi được nhưng không lưu.

**Điện thoại, máy tính bảng:** xoay ngang. Bên trái là **cần điều khiển** (kéo ngang để đi, kéo lên để nhảy, leo thang hoặc qua cổng, kéo xuống để xuống nền). Bên phải là cụm nút: **Đánh** (to), 3 kỹ năng xếp vòng cung, **Nhảy**, 2 bình thuốc, và **Tự đánh**, **Treo máy**, **Đổi mục tiêu**. Chạm vào quái để khóa mục tiêu, chạm lại để bỏ; chạm NPC ở gần để nói chuyện, chạm bụi thảo dược ở gần để hái. Chạm khung Nhiệm vụ dưới thanh máu để mở bảng Nhiệm vụ. Trên máy tính, bật "Hiện phím ảo" trong công cụ thử để xem cần điều khiển.

| Phím | Việc |
|------|------|
| A D hoặc ← → | Đi |
| W, Space | Nhảy (↑ khi đứng ở cổng: qua map) |
| S hoặc ↓ | Xuống nền một chiều, leo thang |
| J | Đòn Thường |
| 1 | Tụ Mana Chấn (mở ở Lv5) |
| 2, 3 | Hỏa Cầu, Trảm Liệt Diễm (cần nút "Thử hệ Hỏa") |
| Tab, hoặc nhấp chuột vào quái | Đổi mục tiêu; mũi tên vàng trên đầu là mục tiêu |
| G | Tự đánh (Lv1, 100% EXP): đánh mục tiêu, tự chuyển con kế, tự uống bình khi HP < 40% |
| H | Treo máy (Lv20, 70% EXP và Quan, không đánh boss); nút "Mở Treo máy sớm" để thử |
| Q, E | Bình HP, Bình MP (tự chọn Bình Vừa khi thiếu nhiều; hồi 8 giây) |
| B (hoặc I, C) | Hành trang: túi 30 ô, 4 ô trang bị, chỉ số, Lực Chiến; bấm 2 lần liền vào món để mặc hoặc dùng |
| F | Nói chuyện với NPC, hái thảo dược |
| L | Bảng Nhiệm vụ (Esc đóng) |
| 1–5, F, Esc trong hộp thoại NPC | Chọn mục, chọn mục đầu, đóng |
| N | Lịch Boss (cũng có ở bảng tin của Cụ Trương) |

## Mô phỏng gì, theo tài liệu nào

| Phần | Nguồn |
|------|-------|
| Sát thương, trúng, chí mạng, giảm theo DEF, chỉ số quái theo cấp, EXP, chênh lệch cấp, chết mất 2% EXP, hồi máu/mana | [combat §2–7](../../docs/game-design/04-combat-and-progression.md) |
| Quái **Tinh anh** (1/15) và **Thủ lĩnh** (1/60, tối đa 1/khu), hệ số và đồ rơi thêm | [combat §2.1.1](../../docs/game-design/04-combat-and-progression.md) |
| Bảng rơi đồ, đồ tồn tại 60 giây | [combat §6](../../docs/game-design/04-combat-and-progression.md) |
| AI quái: đứng, tuần tra, đuổi, đánh, quay về khi xa điểm sinh 600 px | [combat §5.2](../../docs/game-design/04-combat-and-progression.md) |
| Boss theo giờ, thông báo 5 phút, bỏ đi sau 30 phút, cuồng nộ sau 10 phút, Đêm Giếng Sáng, bảo vệ tân thủ | [maps §5.1–5.2](../../docs/game-design/05-world-maps-monsters.md) |
| Vùng báo hiệu, gọi đệ theo mốc máu | [combat §5.3](../../docs/game-design/04-combat-and-progression.md), [maps §5.1](../../docs/game-design/05-world-maps-monsters.md) |
| Thanh máu, số sát thương theo màu, Lịch Boss | [ui-ux §3.1.1–3.1.2](../../docs/game-design/11-ui-ux-spec.md) |
| Hoạt ảnh đánh và niệm chạy hết khung, tụ lực, vệt chém, tia trúng, rung khi chí mạng | [art §6.1](../../docs/game-design/12-art-audio-direction.md) (bản thử chưa có tùy chọn tắt rung) |
| Mục tiêu, mũi tên, phím ảo trên điện thoại | [ui-ux §3.2–3.3](../../docs/game-design/11-ui-ux-spec.md) |
| Tự đánh và Treo máy | [combat §8](../../docs/game-design/04-combat-and-progression.md) |
| Bản đồ đi tới được (nhảy 3 ô, đảo cỏ xuyên từ dưới) | [maps §1.1](../../docs/game-design/05-world-maps-monsters.md), quy tắc V016 |
| Túi 30 ô, 4 ô trang bị, chỉ số trang bị theo cấp và độ hiếm, 6 dòng phụ, bộ Dân Làng (2 và 4 món), Lực Chiến | [items §2–5](../../docs/game-design/07-items-and-equipment.md), [combat §3.4–3.5](../../docs/game-design/04-combat-and-progression.md) |
| Quái rơi trang bị (Thường 6%, Tốt 2%, Hiếm 0,3%, Sử Thi 0,03%; Tinh anh, Thủ lĩnh cao hơn), Đồng Luyện, bình | [combat §6, §2.1.1](../../docs/game-design/04-combat-and-progression.md) |
| Bình HP/MP Nhỏ và Vừa (150/600 HP, 80/300 MP), hồi 8 giây | [items §8](../../docs/game-design/07-items-and-equipment.md) |
| Tiệm thuốc của Lam Nhi: mua bình, bán đồ 25% giá trị, mua lại trong 30 phút, bán nhanh đồ Thường | [economy §3](../../docs/game-design/08-economy-and-monetization.md), [items §4.1](../../docs/game-design/07-items-and-equipment.md), [ui-ux §6.2](../../docs/game-design/11-ui-ux-spec.md) |
| Chuỗi chính tuyến Chương 1 Q_MAIN_01–09: nhận, làm, trả, thưởng; vật phẩm nhiệm vụ chỉ rơi khi còn thiếu; bụi Thảo Dược | [quests §2–4.1](../../docs/game-design/06-quests-and-missions.md), dữ liệu ở [`art/prototype/content/quests`](../../art/prototype/README.md) |
| Khung theo dõi nhiệm vụ, dấu ! ? trên đầu NPC, hộp thoại NPC, cửa sổ Nhiệm vụ 4 tab, nút Đi tới, dải ruy băng nhận/trả | [ui-ux §3.1.3, §5, §6.4](../../docs/game-design/11-ui-ux-spec.md), [art §7](../../docs/game-design/12-art-audio-direction.md) |

Giá trị **chưa có trong tài liệu**, dùng tạm cho bản thử: cách tự cộng điểm tiềm năng (mỗi cấp 2 HP, 2 ATK, 1 DEF; bậc A2 sẽ cho tự cộng), hệ số chiêu boss (dậm 180%, lao 200%, sà 200%, mưa pha lê 120%). Q_MAIN_05: phần "đấu tập với Khôi" thay bằng "Tụ Mana Chấn trúng quái 3 lần" vì bản thử chưa có đấu tập. Q_MAIN_10–12 hiện trong bảng nhưng chưa làm được (cần hầm ngục DG01 và lễ đường).

**Công cụ thử** dưới màn chơi: tốc độ giờ (×1, ×60, ×300), gọi boss của map ngay, boss còn 20% máu để đánh một mình (bật sẵn), tăng tỉ lệ Tinh anh và Thủ lĩnh ×10, thử hệ Hỏa, +1 cấp, xong mục tiêu nhiệm vụ hiện tại (để xem nhanh các nhiệm vụ sau), xóa dữ liệu lưu.

## Dựng lại asset

`assets/` do `python3 tools/art-proto/build.py` sinh ra (bước `build_playable`), cùng nguồn với dữ liệu thử ở `art/prototype/content`. Không sửa tay trong `assets/`. Chỉ dựng lại nhiệm vụ, vật phẩm, icon và `data.json`: `python3 tools/art-proto/build.py art/prototype content`.

Chưa có: hầm ngục DG01 (Trang Lạc), map Thượng Đô, nhặt đồ theo quyền sát thương, nhóm, nhiều khu, cường hóa, đồ mặc hiện trên hình nhân vật.
