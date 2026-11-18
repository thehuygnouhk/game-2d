# Bộ art thử (prototype)

> **Trạng thái:** bản thử để chốt phong cách và dựng bản chơi thử. **Không phải art chính thức.** Art sản xuất chờ duyệt các mục ở [reskin-spec §9](../../docs/product/reskin-spec.md#9-danh-sách-duyệt). Đặc tả khung hình và hoạt ảnh: [art-audio-direction §3](../../docs/game-design/12-art-audio-direction.md).

Toàn bộ được vẽ bằng code ở [`tools/art-proto`](../../tools/art-proto/README.md). Mọi nhân vật, trang phục, sách phép và biểu tượng là thiết kế gốc của dự án, không dựa trên nhân vật cụ thể của tác phẩm khác.

## 1. Có gì

| Thư mục | Nội dung |
|---------|----------|
| `piskel/` | **File sửa được** trong Piskel: 8 nhân vật theo hệ, 8 NPC, 8 hiệu ứng chiêu, 1 bộ vật phẩm |
| `sheets/` | Sprite sheet PNG nền trong suốt, dùng cho game hoặc mở bằng Aseprite/LibreSprite |
| `preview/` | GIF xem nhanh: chiêu thức, di chuyển, NPC, Huyền Thư; ảnh tổng hợp vật phẩm |

### 1.1 Nhân vật người chơi (8 hệ)

Một bộ khung chung cho mọi hệ. Mỗi hệ khác ở màu áo choàng, đai, huy hiệu quẻ của Viện, vũ khí, kiểu tóc và màu mắt. Khung **96×96**, quay mặt sang phải (lật ngang để quay trái).

| File | Hệ | Vũ khí | Huyền Thư |
|------|----|--------|-----------|
| `nhan_vat_hoa` | Hỏa | Kiếm | Sơ Bản |
| `nhan_vat_thuy` | Thủy | Trượng | Sơ Bản |
| `nhan_vat_phong` | Phong | Đoản Kiếm | Sơ Bản |
| `nhan_vat_loi` | Lôi | Găng Tay | Sơ Bản |
| `nhan_vat_tho` | Thổ | Búa & Khiên | Sơ Bản |
| `nhan_vat_moc` | Mộc | Trượng Hoa | Sơ Bản |
| `nhan_vat_am` | Ám | Đao | Sơ Bản |
| `nhan_vat_phong_an` | Phong Ấn Xạ Thủ | Cung Ấn Tiễn | Định Bản |

Thứ tự khung (file `.piskel` 27 khung; sheet PNG mỗi hàng một hoạt ảnh):

| Hoạt ảnh | Khung trong `.piskel` | Hàng trong sheet | Số khung |
|----------|----------------------|------------------|----------|
| idle (đứng) | 1–4 | 1 | 4 |
| walk (đi) | 5–10 | 2 | 6 |
| run (chạy) | 11–16 | 3 | 6 |
| attack (đánh thường) | 17–21 | 4 | 5 |
| cast (thi triển, sách mở và lật trang) | 22–27 | 5 | 6 |

Các lớp trong `.piskel` (từ sau ra trước, theo paper-doll ở [art-audio-direction §3.3](../../docs/game-design/12-art-audio-direction.md)): Huyền Thư (sau), Áo choàng, Tóc sau, Tay sau, Chân + ủng, Áo, Đầu + mặt, Tóc trước, Vai áo choàng, Tay trước, Vũ khí / đạo cụ, Bàn tay, Huyền Thư (trước), Hiệu ứng. Lớp nào trống thì bị bỏ.

### 1.2 NPC (idle 4 khung)

`npc001_thay_bach_van`, `npc003_lam_nhi`, `npc004_khoi`, `npc005_chap_but_hac_minh`, `npc024_co_kim_thoa`, `npc040_cu_truong`, `npc042_tho_ren_tu`, `npc053_cu_tien`. Ngoại hình theo [characters](../../docs/game-design/02-characters-and-npcs.md).

### 1.3 Hiệu ứng chiêu (khung 96×96)

| File | Chiêu | Khung |
|------|-------|-------|
| `hieu_ung_hoa` | Hỏa Cầu | đạn bay 1–4, nổ 5–10 |
| `hieu_ung_thuy` | Thủy Đạn | đạn bay 1–4, vỡ nước 5–10 |
| `hieu_ung_phong` | Phong Nhận | lưỡi gió 1–4, chém chéo 5–10 |
| `hieu_ung_loi` | Tia Chớp | sét đánh 1–6 |
| `hieu_ung_tho` | Địa Chấn | gai đá trồi lần lượt 1–10 |
| `hieu_ung_moc` | Gai Xanh | gai bay 1–4, dây leo và hoa 5–10 |
| `hieu_ung_am` | Màn Đêm | cầu bóng tối 1–4, nổ khói tím 5–10 |
| `hieu_ung_phong_an` | Ấn Tiễn | mũi tên 1–4, dấu ấn đỏ 5–10 |

`preview/chieu_*.gif` ghép nhân vật thi triển, đạn bay và trúng hình nộm tập.

### 1.4 Vật phẩm (icon 32×32)

25 icon, thứ tự trong `sheets/vat_pham.txt`: vũ khí 8 hệ, bình HP, bình MP, Đồng Luyện 4 bậc, Hạt Nguyên (2 màu), Trang Rời, Quan, Nén Bạc, Lá Thuốc Cổ, Chổi Bay, Huyền Thư Sơ/Tu/Định Bản, Thẻ Kẹp Trang.

## 2. Sửa trong Piskel (chạy trên Chrome)

1. Mở [piskelapp.com](https://www.piskelapp.com), bấm **Create Sprite**.
2. **Kéo thả** file `.piskel` vào cửa sổ, hoặc mở bảng **Import** bên phải rồi bấm **Browse .piskel files**.
3. Mỗi bộ phận là một lớp: ẩn hoặc khóa lớp khác để sửa riêng tóc, áo, vũ khí… mà không đụng phần còn lại.
4. Lưu lại bằng **Save** → tải file `.piskel`, hoặc **Export** → PNG spritesheet để đưa vào game.

File `.piskel` đã được kiểm tra bằng chính bộ đọc file của Piskel: đúng số lớp, số khung, kích thước và điểm ảnh.

## 3. Dựng lại từ code

```bash
python3 tools/art-proto/build.py
```

Cần Python 3, numpy, Pillow. Lệnh ghi đè thư mục này. **Nếu đã sửa tay trong Piskel**, lưu bản sửa ra chỗ khác hoặc đổi tên file trước khi chạy lại.

## 4. Giới hạn đã biết

- Tay, chân, thân dựng từ hình khối nên dáng còn hơi cứng; hoạt ảnh nội suy theo góc khớp, chưa có nhấn nhá như vẽ tay.
- Mới có idle, walk, run, attack, cast. Còn thiếu jump, hurt, die, ride_broom, emote theo [art-audio-direction §3.2](../../docs/game-design/12-art-audio-direction.md).
- Một kiểu khuôn mặt chung; NPC phân biệt bằng tóc, râu, trang phục, đạo cụ.
- Chưa có quái, boss, tileset bản đồ, giao diện.
