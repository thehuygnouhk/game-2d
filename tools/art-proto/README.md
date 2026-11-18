# Art prototype (bản thử, không phải art chính thức)

Công cụ vẽ pixel art bằng code để **thử phong cách** nhân vật, sách phép và hiệu ứng kỹ năng. Đây **không** phải art sản xuất: art chính thức do họa sĩ pixel vẽ, sau khi các mục ở [reskin-spec §9](../../docs/product/reskin-spec.md#9-danh-sách-duyệt) được duyệt. Đặc tả khung hình và hoạt ảnh: [art-audio-direction §3](../../docs/game-design/12-art-audio-direction.md).

| File | Nội dung |
|------|----------|
| `pix.py` | Hình cơ bản, tô bóng tự động, lớp (paper-doll), xuất sprite sheet, GIF và file `.piskel` |
| `actors.py` | Khung xương (rig), tư thế (idle, walk, run, attack, cast), vũ khí |
| `templates.py` | Đầu, mắt, tóc, ủng, Huyền Thư chấm tay từng pixel |
| `hero.py` | Bộ vẽ nhân vật theo lớp: đồng phục, áo dài, áo ngắn, áo choàng có huy hiệu quẻ, Huyền Thư 3 ấn bản |
| `npcs.py` | 8 NPC |
| `items.py` | 25 icon vật phẩm 32×32 |
| `vfx.py` | Hiệu ứng chiêu 8 hệ, hình nộm tập |
| `demo.py` | Ghép nhân vật thi triển, đạn bay, trúng đích |
| `tiles_rich.py` | Tileset vùng R01: vách đất bo tròn, cỏ phủ chờm, thác nước, hang đá; nhà phố, Nhà Học có tháp tròn, cối xay gió, giếng, đèn đường |
| `maps.py` | Bộ dựng map: chọn ô mép theo hàng xóm, xuất Tiled `.tmj` (tileset nhúng) và `.yaml`, nền parallax, ảnh xem trước |
| `maps_r01.py` | Bố cục M001–M004, khu cấp độ, điểm boss theo giờ, nối cổng |
| `monsters.py` | 7 quái Chương 1, Trang Lạc và Mảnh Trang, 3 boss theo giờ (kiểu quái thú ma lực) |
| `build.py` | Xuất toàn bộ vào [`art/prototype`](../../art/prototype/README.md) (`build.py <thư mục> maps` chỉ dựng bản đồ; `build.py <thư mục> monsters` dựng quái, dữ liệu và bản đồ) |
| `sample.py` | Bộ mẫu phong cách đầu tiên |

Chạy (cần Python 3, numpy, Pillow):

```bash
python3 tools/art-proto/build.py
```

Giới hạn đã biết: xem [art/prototype §4](../../art/prototype/README.md#4-giới-hạn-đã-biết). Không dùng tên, dáng nhân vật hay biểu tượng của tác phẩm khác (xem [reskin-spec §10](../../docs/product/reskin-spec.md#10-kiểm-tra-rò-rỉ-tên-ip)).
