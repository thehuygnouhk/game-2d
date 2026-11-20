# Bộ art thử (prototype)

> **Trạng thái:** bản thử để chốt phong cách và dựng bản chơi thử. **Không phải art chính thức.** Art sản xuất chờ duyệt các mục ở [reskin-spec §9](../../docs/product/reskin-spec.md#9-danh-sách-duyệt). Đặc tả khung hình và hoạt ảnh: [art-audio-direction §3](../../docs/game-design/12-art-audio-direction.md).

Toàn bộ được vẽ bằng code ở [`tools/art-proto`](../../tools/art-proto/README.md). Mọi nhân vật, trang phục, sách phép và biểu tượng là thiết kế gốc của dự án, không dựa trên nhân vật cụ thể của tác phẩm khác.

## 1. Có gì

| Thư mục | Nội dung |
|---------|----------|
| `piskel/` | **File sửa được** trong Piskel: 8 nhân vật theo hệ, 9 NPC, 8 hiệu ứng chiêu, 1 bộ vật phẩm, 1 tileset vùng R01 |
| `maps/` | **4 bản đồ vùng R01 (Chương 1)** cho Tiled và Phaser: `.tmj`, `.yaml`, tileset, nền parallax, ảnh xem trước (§1.5) |
| `content/` | Dữ liệu thử Chương 1 theo schema [content-pipeline §3](../../docs/workflows/content-pipeline.md): `monsters/`, `bosses/`, `events/` (lịch boss theo giờ) (§1.6), `quests/` (chuỗi chính tuyến Chương 1, nguồn vật phẩm nhiệm vụ), `items/` (bình, Đồng Luyện, mẫu trang bị bộ S1, phần thưởng nhiệm vụ), `shops/npc003.yaml` (tiệm thuốc của Lam Nhi), `classes/` (3 xuất thân, Hỏa và Thủy với kỹ năng 1–3), map hầm ngục `maps/dg01` và lễ đường `maps/i001`, `i18n/vi.yaml` (tên, thoại) |
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

`npc001_thay_bach_van`, `npc002_ba_mo`, `npc003_lam_nhi`, `npc004_khoi`, `npc005_chap_but_hac_minh`, `npc024_co_kim_thoa`, `npc040_cu_truong`, `npc042_tho_ren_tu`, `npc053_cu_tien`. Ngoại hình theo [characters](../../docs/game-design/02-characters-and-npcs.md).

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

37 icon, thứ tự trong `sheets/vat_pham.txt`: vũ khí 8 hệ, bình HP, bình MP, Đồng Luyện 4 bậc, Hạt Nguyên (2 màu), Trang Rời, Quan, Nén Bạc, Lá Thuốc Cổ, Chổi Bay, Huyền Thư Sơ/Tu/Định Bản, Thẻ Kẹp Trang; vật phẩm và phần thưởng nhiệm vụ Chương 1: Củ Cải Non, Thảo Dược Suối Mơ, Bao Tải Bị Lấy, Mảnh Trang, Kiếm Gỗ Tập, Áo Suối Mơ; bộ S1 Dân Làng (Kiếm, Mũ, Áo, Giày); Bình HP Vừa, Bình MP Vừa.

### 1.5 Bản đồ vùng R01 – Làng Suối Mơ (Chương 1)

Phong cách: địa hình kiểu game cuộn ngang mobile (vách đất bo tròn, cỏ phủ chờm mép, thác nước), kiến trúc **thị trấn châu Âu giả tưởng** (tầng trệt đá, tầng trên khung gỗ đua ra, mái đá vảy cá, tháp tròn mái nón, cờ hiệu mang huy hiệu riêng của vương quốc: quyển sách mở dưới ngôi sao sáu cánh). Không chép công trình cụ thể của tác phẩm nào.

| Map | Loại | Kích thước (ô) | Nội dung | Đối tượng |
|-----|------|----------------|----------|-----------|
| `m001` Nhà Học Suối Mơ | Town | 64 × 18 | Nhà Học có tháp tròn và đồng hồ, giếng làng, hai nhà phố, gò đất, đảo cỏ | NPC001, 002, 003, 004, 040; cổng sang M002; cả map là vùng an toàn |
| `m002` Đồng Hoa Suối Mơ | Field 1–4 | 90 × 20 | Đồi hoa, **thác nước giữa hai vách**, cối xay gió, 3 đảo cỏ | NPC003, 004; Nấm Lùn, Thỏ Đốm; cổng M001 ↔ M003 |
| `m003` Rừng Mơ Non | Field 4–7 | 96 × 24 | Rừng cây lớn, hai gò, 3 sàn gỗ trên cao có thang dây | Chó Rừng Non, Lùn Ném Đá, Nhện Mực; cổng M002 ↔ M004 |
| `m004` Hang Giếng Cạn | Field + Dungeon 7–9 | 80 × 24 | Hang đá, nhũ đá, pha lê, hố gai, ngách đá, hồ nước, bệ đá | Dơi Giếng, Rùa Đá Giếng; bệ đá là **cửa vào hầm ngục DG01** (Trang Lạc); cổng M003, M005 |

Theo [content-pipeline §5](../../docs/workflows/content-pipeline.md):

- **Lớp:** `bg_far`, `bg_mid`, `bg_near` (lớp ảnh, parallax 0,1 / 0,35 / 0,6, lặp ngang), `ground`, `decor`, `collision` (ẩn sẵn), `objects`, `fg`.
- **Va chạm:** tileset `collision` đặt `firstgid = 1`, nên giá trị ô đúng quy ước `1` đặc, `2` nền một chiều, `3` thang, `4` nguy hiểm.
- **Đối tượng:** `spawn_player`, `portal` (`id`, `to`, `toX`, `toY`), `npc`, `mob_spawn` (`mob`, `count`, `radius`, `respawnSec`), `boss_spawn` (`boss`, `event`), `zone_safe`.
- **Đi tới được:** bậc lên tối đa 2 ô, đảo cỏ là nền một chiều (nhảy xuyên từ dưới), cầu gỗ qua thác và thang dây ở hồ (M002). `build.py` chạy kiểm tra V016 (nhảy 3 ô) và **dừng build** nếu có cổng, NPC, điểm sinh quái hoặc điểm boss không tới được. Đã thử thêm bằng engine: đi từ điểm xuất hiện tới cổng cuối của cả 4 map.
- **Khu cấp độ:** quái xếp theo cấp tăng dần từ cổng vào tới cổng ra (M002: Nấm Lùn → Thỏ Đốm; M003: Chó Rừng Non → Lùn Ném Đá → Nhện Mực; M004: Dơi Giếng → Rùa Đá Giếng). Ảnh xem trước có vẽ quái tại điểm sinh và boss tại điểm `boss_spawn` để minh họa; trong game boss chỉ xuất hiện theo lịch.
- **YAML** cùng tên theo schema [content-pipeline §3.1](../../docs/workflows/content-pipeline.md). Cổng giữa các map đã nối toạ độ hai chiều; cổng M004 → M005 dùng toạ độ tạm vì M005 chưa vẽ.
- Tileset được **nhúng** vào `.tmj` (Phaser không đọc tileset rời). `maps/tilesets/r01_index.txt` liệt kê tên và vị trí từng ô.

**Đã kiểm tra:** nạp cả 4 map bằng **Phaser 3.80.1** trong Chromium headless: tạo được mọi lớp, đọc đúng tileset, đối tượng và số ô va chạm, vẽ ra không lỗi.

**Xem:** `maps/preview/m00x_view.png` (một màn hình 960×540 có nhân vật), `m00x.png` (toàn map), `m00x_annotated.png` (đánh dấu cổng, NPC, vùng sinh quái, vùng boss).

**Sửa:** mở `.tmj` bằng [Tiled](https://www.mapeditor.org) (miễn phí, cài trên máy) để kéo thả ô, dời cổng, NPC, vùng sinh quái. Sửa hình ô bằng Piskel qua `piskel/tileset_r01.piskel`, rồi xuất PNG ghi đè `maps/tilesets/r01.png`. Khi có `packages/content` (Phase 0), chuyển `.tmj`/`.yaml` vào `packages/content/maps`.

### 1.6 Quái và boss Chương 1

Phong cách **quái thú ma lực**: thú bị ma lực thấm vào, mắt khe phát sáng, sọc hoặc ấn văn mana phát sáng trên thân, hạt mana bay quanh, nanh, sừng, gai pha lê. Thiết kế riêng của dự án.

| ID | Tên | Cấp | Khung | Nơi | Ghi chú hình |
|----|-----|-----|-------|-----|--------------|
| MOB001 | Nấm Lùn | 1–2 | 64 | M002 | Mũ tím chạng vạng, đốm bào tử phát sáng xanh ngọc |
| MOB002 | Thỏ Đốm | 2–4 | 64 | M002 | Thỏ sừng hổ phách, đốm phát sáng |
| MOB003 | Chó Rừng Non | 4–5 | 64 | M003 | Sói non có sọc mana |
| MOB004 | Lùn Ném Đá | 5–7 | 64 | M003 | Yêu lùn tai dài, ném đá khắc ấn cháy cam |
| MOB005 | Nhện Mực | 6–7 | 64 | M003 | Nhện mực có ấn tím trên bụng |
| MOB006 | Dơi Giếng | 7–8 | 64 | M004 | Dơi có gân mana tím |
| MOB007 | Rùa Đá Giếng | 8–9 | 64 | M004 | Mai đá ghép, khe nứt phát sáng |
| BOSS001 | Trang Lạc | 9 | 160 | Hầm ngục DG01 | Bóng ma giấy xóa, mắt mực; chết thì rách 4 mảnh (`BOSS001_SHARD` Mảnh Trang) |
| BOSS034 | Vua Nấm Lùn | 5 | 128 | M002, mỗi 2 giờ | Vương miện gạc gỗ, gậy cầu mana, dậm tạo vòng sóng |
| BOSS035 | Chó Rừng Đầu Đàn | 8 | 128 | M003, 11:00/17:00/21:00 | Sói đầu đàn, bờm gai, sẹo, hào quang gió |
| BOSS036 | Dơi Chúa Giếng | 10 | 128 | M004, 12:30/19:30; Đêm Giếng Sáng | Cánh gai pha lê, gân mana xanh |

Mỗi con có `idle` 1–4, `move` 5–8, `attack` 9–12, `die` 13–16, **`hurt` 17–18** (lùi lại, lóe trắng rồi ửng đỏ); boss có thêm **`skill2` 19–22** (Vua Nấm Lùn giơ gậy gọi nấm, Chó Rừng Đầu Đàn hú, Dơi Chúa Giếng bắn pha lê, Trang Lạc bão trang giấy). `.piskel` một lớp; sheet PNG mỗi hàng một hoạt ảnh. Vùng báo hiệu chiêu boss vẽ bằng engine ([art §4](../../docs/game-design/12-art-audio-direction.md)). Xem nhanh: `preview/quai_chuong1.gif`, `preview/boss_*.gif`.

**Dữ liệu thử** (`content/`, chuyển vào `packages/content` ở Phase 0): `monsters/mob001–007.yaml`, `bosses/boss001.yaml` (chỉ trong instance DG01, tách 4 mảnh ở 50% HP), `boss034–036.yaml` (gọi đệ theo mốc HP), `events/evt_boss_034–036.yaml` (lịch, 1 khu ngẫu nhiên, bỏ đi sau 30 phút, bảo vệ tân thủ 10 cấp) và `evt_r01_well_night.yaml` (Đêm Giếng Sáng). Quy tắc: [maps §5.1–5.2](../../docs/game-design/05-world-maps-monsters.md#52-quy-tắc-boss-theo-giờ).

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
- Quái đủ `idle`, `move`, `attack`, `hurt`, `die`; boss có thêm `skill2`. Bản chơi thử (có thanh máu, số sát thương, Lịch Boss) ở [`prototype/playable`](../../prototype/playable/README.md). Bản đồ mới có vùng R01; ảnh xem trước trải nền ra cả chiều dài map nên thấy mặt trời lặp lại, còn trong game lớp xa chỉ trôi 10% nên không lặp.
