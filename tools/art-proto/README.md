# Art prototype (bản thử, không phải art chính thức)

Công cụ vẽ pixel art bằng code để **thử phong cách** nhân vật, sách phép và hiệu ứng kỹ năng. Đây **không** phải art sản xuất: art chính thức do họa sĩ pixel vẽ, sau khi các mục ở [reskin-spec §9](../../docs/product/reskin-spec.md#9-danh-sách-duyệt) được duyệt. Đặc tả khung hình và hoạt ảnh: [art-audio-direction §3](../../docs/game-design/12-art-audio-direction.md).

| File | Nội dung |
|------|----------|
| `pix.py` | Hình cơ bản, tô bóng tự động, lớp (paper-doll), xuất sprite sheet, GIF và file `.piskel` |
| `actors.py` | Khung xương (rig), tư thế (idle, walk, run, attack, cast), vũ khí |
| `templates.py` | Đầu, mắt, tóc, ủng, Huyền Thư chấm tay từng pixel |
| `hero.py` | Bộ vẽ nhân vật theo lớp: đồng phục, áo dài, áo ngắn, áo choàng có huy hiệu quẻ, Huyền Thư 3 ấn bản |
| `player_looks.py` | Ngoại hình người chơi theo xuất thân và giới tính: tân thủ, Hỏa, Thủy (18 bảng hình cho bản chơi thử; xem trước ở `preview/nguoi_choi_ngoai_hinh.png`) |
| `npcs.py` | 11 NPC (thêm Viện Chủ Vân Tước, Giám Khảo Tuyển Thư ở bậc B5.1) |
| `items.py` | 42 icon vật phẩm 32×32, gồm vật phẩm nhiệm vụ Chương 1, Trang Sách Thất Lạc, bộ S1 Dân Làng và S2 Thư Lại |
| `vfx.py` | Hiệu ứng chiêu 8 hệ, hình nộm tập |
| `demo.py` | Ghép nhân vật thi triển, đạn bay, trúng đích |
| `tiles_rich.py` | Tileset vùng R01: vách đất bo tròn, cỏ phủ chờm, thác nước, hang đá; nhà phố, Nhà Học có tháp tròn, cối xay gió, giếng, đèn đường. Bậc B5.1 thêm vào cuối: đá lát kinh đô, nhà mái xanh và mái vàng, Tổng Đường, cột cờ, lúa, bù nhìn |
| `maps.py` | Bộ dựng map: chọn ô mép theo hàng xóm, xuất Tiled `.tmj` (tileset nhúng) và `.yaml`, nền parallax, ảnh xem trước |
| `maps_r01.py` | Bố cục M001–M004, hầm ngục DG01, lễ đường I001, khu cấp độ, điểm boss, nối cổng (cả các map Chương 2) |
| `maps_r02.py` | Bậc B5.1: Thượng Đô (M005), Tổng Đường Pháp Vệ (M008), Đồng Lúa Lục Nguyên (M009); NPC hiện theo nhiệm vụ (`show_after`, `hide_after`), boss khu vực (`respawn_min`), thành hồi sinh (`town`) |
| `monsters.py` | 7 quái Chương 1, Trang Lạc và Mảnh Trang, 3 boss theo giờ; Chương 2: Lợn Rừng Đồng, Lùn Cướp Đồng, Lợn Rừng Chúa (kiểu quái thú ma lực) |
| `build.py` | Xuất toàn bộ vào [`art/prototype`](../../art/prototype/README.md) (`build.py <thư mục> maps` chỉ dựng bản đồ; `build.py <thư mục> monsters` dựng quái, dữ liệu và bản đồ; `build.py <thư mục> content` dựng nhiệm vụ, vật phẩm, icon và dữ liệu bản chơi thử). Dữ liệu YAML (quái, vật phẩm, kỹ năng, bảng rơi, nhiệm vụ, i18n) luôn ghi vào `packages/content`, bất kể thư mục xuất; danh sách icon cho bản online ghi ở `prototype/playable/assets/sprites/items.json` |
| `sample.py` | Bộ mẫu phong cách đầu tiên |

Chạy (cần Python 3, numpy, Pillow):

```bash
python3 tools/art-proto/build.py
```

Giới hạn đã biết: xem [art/prototype §4](../../art/prototype/README.md#4-giới-hạn-đã-biết). Không dùng tên, dáng nhân vật hay biểu tượng của tác phẩm khác (xem [reskin-spec §10](../../docs/product/reskin-spec.md#10-kiểm-tra-rò-rỉ-tên-ip)).
