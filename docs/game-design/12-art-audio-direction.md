# Định hướng Nghệ thuật & Âm thanh

> **Trạng thái:** Draft v0.1 · **Phụ thuộc:** [ui-ux](11-ui-ux-spec.md) · [content-pipeline](../workflows/content-pipeline.md)

## 1. Phong cách tổng thể

- **Chibi pixel art** (tỉ lệ ~3 đầu), tông màu rực rỡ nhưng có chiều sâu, gợi nhớ Ninja School/NRO.
- **Dấu ấn riêng của HTK**: áo choàng Pháp Vệ có ấn của Viện, Huyền Thư lơ lửng với trang sách bay quanh khi dùng phép, mực và giấy làm hiệu ứng (đặc biệt Trang Trắng). **Không** vẽ theo dáng nhân vật, trang phục hay biểu tượng của tác phẩm khác.
- **Nghệ thuật gốc.** Không dùng ảnh, sprite hay âm thanh trích từ anime/manga. Mọi tài sản do đội tạo hoặc có giấy phép rõ ràng.
- **Bản thử phong cách:** [art/prototype](../../art/prototype/README.md) (vẽ bằng code, có file Piskel để sửa tay). Dùng để chốt hướng và dựng bản chơi thử, **không** thay art chính thức.

## 2. Bảng màu theo hệ

| Hệ | Màu chủ đạo | HEX | Màu phụ |
|----|-------------|-----|---------|
| Hỏa | Đỏ cam | `#E4572E` | `#FFB703` |
| Thủy | Xanh dương | `#3A86FF` | `#8ECAE6` |
| Phong | Xanh ngọc | `#2EC4B6` | `#CBF3F0` |
| Lôi | Vàng | `#FFD23F` | `#FFF3B0` |
| Thổ | Nâu | `#8D6E63` | `#D7B98E` |
| Mộc | Xanh lá | `#5CB85C` | `#C7F9CC` |
| Ám | Tím đậm | `#5B3E96` | `#1B1233` |
| Quang (quái) | Vàng trắng | `#FFF3B0` | `#FFFFFF` |
| Phong Ấn Xạ Thủ | Đen/đỏ | `#1A1A1A` | `#C1121F` |

### 2.1 Màu theo độ hiếm

| Độ hiếm | HEX |
|---------|-----|
| Thường | `#FFFFFF` |
| Tốt | `#4CAF50` |
| Hiếm | `#2196F3` |
| Sử Thi | `#9C27B0` |
| Huyền Thoại | `#FF9800` |
| Thần Thoại | `#F44336` |

## 3. Nhân vật

### 3.1 Khung sprite

| Thông số | Giá trị |
|----------|---------|
| Khung nhân vật | **96 × 96 px** (canvas), thân khoảng 56 px |
| Hướng | Vẽ một hướng (phải), lật ngang cho trái |
| Tỉ lệ hiển thị | ×1 (logic 960×540); màn hình lớn dùng ×2 integer scale |
| Palette | Tối đa 32 màu/nhân vật mẫu, tô lại bằng **palette swap** |

### 3.2 Bộ hoạt ảnh bắt buộc

| Hoạt ảnh | Số khung | FPS | Ghi chú |
|----------|----------|-----|---------|
| idle | 4 | 6 | |
| walk | 6 | 10 | |
| run | 6 | 12 | |
| jump (lên/xuống) | 2 + 2 | — | |
| attack_1/2/3 | 5 mỗi | 14 | Combo đòn thường |
| cast | 6 | 12 | Dùng cho kỹ năng |
| hurt | 2 | — | |
| die | 6 | 8 | |
| ride_broom | 4 | 8 | |
| emote (vẫy tay, cúi chào, ngồi) | 4 | 6 | |

### 3.3 Paper-doll (lớp)

Thứ tự lớp (từ sau ra trước):

1. Cloak back (áo choàng sau)
2. Body
3. Hair back
4. Legs (quần)
5. Torso (áo)
6. Head + Face
7. Hair front
8. Helm
9. Gloves
10. Weapon
11. Huyền Thư (lơ lửng, vòng lặp riêng)
12. Aura / hiệu ứng Nhập Linh

Mỗi lớp có tập hoạt ảnh chung **bộ xương (rig)** với mốc neo (anchor) cho từng khung để căn chỉnh. Mỗi trang bị chỉ cần vẽ **một lần theo khung chuẩn**.

## 4. Quái vật & Boss

| Loại | Kích thước canvas | Ghi chú |
|------|-------------------|---------|
| Quái nhỏ | 64×64 | 3–4 hoạt ảnh (idle, move, attack, die) |
| Quái vừa | 96×96–128×128 | |
| Elite (Tinh anh) | Quái thường + viền sáng **tím** + aura | Dùng lại sprite |
| Thủ lĩnh | Quái thường **×1,3** + viền **vàng cam** + aura | Dùng lại sprite |
| Mini-boss | 160×160 | |
| Boss | 256×256 trở lên | Có animation riêng từng chiêu + telegraph |

- Mọi quái có thêm hoạt ảnh **hurt** (2 khung): khung 1 lùi về sau và lóe trắng, khung 2 lùi ít hơn và ửng đỏ.
- Boss có hoạt ảnh **attack** (chiêu 1) và **skill2** (chiêu 2). **Vùng báo hiệu** vẽ bằng engine: vùng đỏ bán trong suốt (`#ff3b3b`, 25–45%) có viền đậm, tô đầy dần theo thời gian báo hiệu; hình tròn, vòng, hình chữ nhật hoặc hình quạt theo chiêu.
| Raid boss | Tối đa 512×512 | Có thể chia sprite nhiều phần |

## 5. Bản đồ

| Thông số | Giá trị |
|----------|---------|
| Ô tile | 32×32 |
| Lớp | Nền xa (parallax 3 tầng), nền gần, mặt đất (collision), trang trí, tiền cảnh |
| Công cụ | **Tiled** (xuất JSON), tileset PNG |
| Mỗi vùng | 1 tileset riêng + 1 bộ nền parallax + 1 bảng màu ánh sáng |
| Ngày/đêm | Lớp phủ màu theo giờ thật (gradient), đèn sáng ở Town |

### 5.1 Phong cách theo vùng

| Vùng | Mood | Màu |
|------|------|-----|
| R01 Làng Suối Mơ | Ấm áp, nông thôn | Vàng nâu, xanh lá |
| R02 Thượng Đô | Hoàng gia, đông đúc | Vàng, xanh hoàng gia |
| R03 Đồng Bằng | Mở, gió | Xanh lá, trời xanh |
| R04 Duyên Hải | Biển, dưới nước, kho sách chìm | Xanh dương, xanh ngọc |
| R05 Rừng Thì Thầm | Bí ẩn, cây thì thầm chữ | Xanh lục tối, tím |
| R06 Biên Giới Xích Sa | Nóng, cát đỏ, căng thẳng | Đỏ cam, vàng cát |
| R07 Di Tích Tộc Cổ Thư | Cổ kính, trang nghiêm | Nâu giấy cũ, vàng ánh |
| R08 Bạch Lĩnh | Im lặng, trắng xóa | Trắng, xám nhạt, đỏ sẫm |
| R09 Chương Trắng | Trống rỗng, siêu thực | Trắng giấy, đen mực, tím |

## 6. Hiệu ứng kỹ năng (VFX)

- Spritesheet ≤ 12 khung/hiệu ứng, 60–120 ms mỗi khung.
- Mỗi hệ có **ngôn ngữ hình ảnh** riêng: lửa (đốm bay lên), nước (sóng/vòng), gió (đường cong), sét (tia zig-zag), đất (mảnh vỡ), mộc (lá/hoa), ám (khói tím).
- Nhập Linh: hào quang lớn quanh nhân vật, đổi màu bảng màu hệ, **ảnh hưởng nhẹ đến ánh sáng bản đồ**.
- Hiệu ứng toàn màn hình (flash, rung) **giới hạn** và có tùy chọn tắt.

### 6.1 Phản hồi đòn đánh

Mọi đòn trúng phải **nhìn thấy được** ngay cả khi người chơi không đọc số:

| Lớp | Quy định |
|-----|----------|
| Hoạt ảnh nhân vật | Đòn đánh và niệm phép chạy **hết khung** rồi mới về đứng/đi; không để hoạt ảnh di chuyển ghi đè giữa chừng |
| Tụ lực | Chiêu có thời gian niệm hiện quầng sáng màu hệ ở tay suốt lúc niệm |
| Vệt chém | Đòn cận chiến có vệt cong theo hướng mặt, màu hệ (đánh thường: vàng), **viền tối** để đọc được trên nền trời sáng; ≤ 200 ms |
| Tia trúng | Tia sáng tỏa ra ở điểm trúng, kèm quái nháy trắng (hoạt ảnh bị đánh); chí mạng: tia vàng lớn hơn và rung màn hình ≤ 80 ms |
| Bị đánh | Tia đỏ trên người chơi; đòn chí mạng của quái dùng tia lớn |

## 7. UI

| Hạng mục | Quy định |
|----------|----------|
| Phong cách | Nền giấy da, khung **gỗ tối viền vàng** có đinh tán ở góc, tiêu đề trên dải ruy băng đỏ (kiểu NSO/NRO); nút vàng (chính), xanh lá (trả, nhận thưởng), nâu (phụ), bo nhẹ. Mẫu: cửa sổ Nhiệm vụ, Lịch Boss, hộp thoại NPC trong [bản chơi thử](../../prototype/playable/README.md) |
| Phông chữ | Một phông UI sans hỗ trợ đầy đủ tiếng Việt (đề xuất *Be Vietnam Pro*), phông tiêu đề pixel/serif trang trí (kiểm tra dấu tiếng Việt) |
| Biểu tượng | 32×32 và 64×64, viền theo độ hiếm |
| Chân dung NPC | 128×128, tối thiểu 2 biểu cảm (bình thường, vui/giận) |
| Khung | 9-slice để co giãn |

## 8. Hạn mức dung lượng

| Mục | Giới hạn |
|-----|----------|
| Tải lần đầu (đến màn đăng nhập) | ≤ 5 MB |
| Gói chung (UI, nhân vật, SFX) | ≤ 15 MB |
| Mỗi map | ≤ 6 MB (tải theo yêu cầu) |
| Atlas | ≤ 2048×2048, PNG-8 hoặc WebP lossless |
| Nền (background) | WebP, ≤ 400 KB mỗi tầng |

## 9. Âm thanh

### 9.1 Nhạc nền (BGM)

| Vùng | Mood | Nhạc cụ gợi ý |
|------|------|---------------|
| Làng Suối Mơ | Dịu, hoài niệm | Đàn guitar, sáo |
| Thượng Đô | Hùng tráng | Kèn đồng, dàn dây |
| Đồng Bằng | Phiêu lưu | Violin, trống |
| Duyên Hải | Mơ màng, sóng | Piano, synth, tiếng sóng |
| Rừng Thì Thầm | Bí ẩn | Dàn dây trầm, chuông, tiếng thì thầm |
| Xích Sa | Căng thẳng | Trống, đồng, nhạc cụ dây kiểu sa mạc |
| Di Tích Tộc Cổ Thư | Cổ kính | Hợp xướng, đàn tranh |
| Bạch Lĩnh | Lặng | Piano thưa, dàn dây |
| Chương Trắng | Siêu thực | Âm thanh đảo ngược, trống |
| Boss | Căng thẳng | Dồn dập, nhịp nhanh |
| Chiến trường | Hùng tráng | Trống trận |

### 9.2 Hiệu ứng âm thanh (SFX)

| Nhóm | Danh sách tối thiểu |
|------|---------------------|
| Nhân vật | bước chân, nhảy, đáp, bị đánh, chết, lên cấp |
| Chiến đấu | đòn thường, chí mạng, miss, cast, trúng theo hệ (7) |
| UI | bấm nút, mở/đóng cửa sổ, nhận vật phẩm, nhận Quan, thất bại |
| Môi trường | gió, nước, lửa trại, chim, tiếng chợ |
| Sự kiện | còi cảnh báo boss, chuông, trống |

### 9.3 Định dạng & kỹ thuật

| Mục | Quy định |
|-----|----------|
| Định dạng | **OGG Vorbis** chính, **M4A/AAC** dự phòng cho Safari |
| BGM | Vòng lặp mượt, 96–128 kbps, ≤ 1,5 MB/bài |
| SFX | ≤ 50 KB mỗi file, 22–44 kHz |
| Phát | Tự phát sau tương tác đầu tiên của người dùng (chính sách trình duyệt) |
| Ưu tiên | Giới hạn 16 SFX đồng thời, ưu tiên theo mức quan trọng |

## 10. Quy ước đặt tên tệp

```text
assets/
  characters/<part>/<id>/<anim>_<frame>.png
  monsters/mob001/idle_00.png
  maps/m001/tileset.png
  maps/m001/map.json
  ui/icons/<group>/<name>.png
  vfx/<element>/<name>_<frame>.png
  audio/bgm/<region>_<name>.ogg
  audio/sfx/<group>_<name>.ogg
```

- Chữ thường, `snake_case`, không dấu, không khoảng trắng.
- Mỗi tệp nguồn (`.aseprite`) lưu trong `design/` kèm bản export.

## 11. Danh sách tài sản tối thiểu cho MVP

| Hạng mục | Số lượng |
|----------|----------|
| Nhân vật (3 xuất thân × 2 giới tính, paper-doll cơ bản) | 6 bộ + 10 kiểu tóc |
| Quái | 7 (R01) + Trang Lạc + 3 boss theo giờ R01 |
| Map | 5 (M001–M005) |
| NPC portrait | 8 |
| Icon vật phẩm | 80 |
| VFX kỹ năng | 6 (Hỏa 3, Thủy 3) |
| BGM | 3 |
| SFX | 40 |
