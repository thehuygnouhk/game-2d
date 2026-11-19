# Bản chơi thử Chương 1 (trình duyệt)

Bản thử để **cảm nhận** cơ chế đánh quái và boss theo giờ của Chương 1, dùng art thử ở [`art/prototype`](../../art/prototype/README.md). Chạy hoàn toàn trên trình duyệt bằng Phaser 3.80.1. **Không phải kiến trúc thật**: game thật tính mọi kết quả ở server ([CLAUDE.md](../../CLAUDE.md), quy tắc 4).

## Chạy

```bash
python3 -m http.server 8000 --directory prototype/playable
```

Mở `http://localhost:8000`, bấm vào màn chơi rồi dùng bàn phím. Trên điện thoại có nút cảm ứng.

| Phím | Việc |
|------|------|
| A D hoặc ← → | Đi |
| W, Space | Nhảy (↑ khi đứng ở cổng: qua map) |
| S hoặc ↓ | Xuống nền một chiều, leo thang |
| J | Đòn Thường |
| 1 | Tụ Mana Chấn (mở ở Lv5) |
| 2, 3 | Hỏa Cầu, Trảm Liệt Diễm (cần nút "Thử hệ Hỏa") |
| Q, E | Bình Máu, Bình Mana |
| F | Nói chuyện (Cụ Trương mở Lịch Boss) |
| B | Lịch Boss |

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

Giá trị **chưa có trong tài liệu**, dùng tạm cho bản thử: cách tự cộng điểm tiềm năng (mỗi cấp 2 HP, 2 ATK, 1 DEF), bình thuốc hồi 40%, hệ số chiêu boss (dậm 180%, lao 200%, sà 200%, mưa pha lê 120%).

**Công cụ thử** dưới màn chơi: tốc độ giờ (×1, ×60, ×300), gọi boss của map ngay, boss còn 20% máu để đánh một mình (bật sẵn), tăng tỉ lệ Tinh anh và Thủ lĩnh ×10, thử hệ Hỏa, +1 cấp.

## Dựng lại asset

`assets/` do `python3 tools/art-proto/build.py` sinh ra (bước `build_playable`), cùng nguồn với dữ liệu thử ở `art/prototype/content`. Không sửa tay trong `assets/`.

Chưa có: hầm ngục DG01 (Trang Lạc), map Thượng Đô, nhặt đồ theo quyền sát thương, nhóm, nhiều khu.
