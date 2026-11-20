# Vật phẩm & Trang bị

> **Trạng thái:** Draft v0.1 · **Phụ thuộc:** [classes](03-origins-classes-skills.md) · [combat](04-combat-and-progression.md) · [economy](08-economy-and-monetization.md)

## 1. Phân loại vật phẩm

| Nhóm | Mã loại | Dải ID | Ví dụ |
|------|---------|--------|-------|
| Vũ khí | `WEAPON` | ITM01xxx | Kiếm, Trượng, Đoản Kiếm, Găng, Búa & Khiên, Trượng Hoa, Đao |
| Huyền Thư | `TOME` | ITM02xxx | Huyền Thư Sơ/Tu/Định Bản (khóa khi nhặt: không tháo, không bán) |
| Giáp & phụ kiện | `ARMOR` | ITM03xxx | Mũ, Áo, Quần, Găng, Giày, Áo Choàng, Bùa, Nhẫn |
| Tiêu hao | `CONSUMABLE` | ITM04xxx | Bình HP/MP, Lá Thuốc Cổ, thức ăn |
| Nguyên liệu | `MATERIAL` | ITM05xxx | Đồng Luyện, mảnh, rơi từ quái |
| Hạt Nguyên | `GEM` | ITM06xxx | Ngọc khảm |
| Nhiệm vụ | `QUEST` | ITM07xxx | Bao Tải Bị Cướp, Thảo Dược Suối Mơ |
| Thú / Đồng hành | `COMPANION` | ITM08xxx | Khế Ước Thạch, Chổi Bay, Linh Hồn Thú |
| Thẩm mỹ | `COSMETIC` | ITM09xxx | Trang phục Đội, huy hiệu, danh hiệu |
| Sự kiện / Khác | `MISC` | ITM10xxx | Vé Quay, Thẻ Auto, Trang Rời |

## 2. Độ hiếm

| Độ hiếm | Màu | Hệ số chỉ số | Số dòng phụ (random) | Khe ngọc tối đa |
|---------|-----|---------------|----------------------|------------------|
| Thường | Trắng | ×1,0 | 0 | 0 |
| Tốt | Xanh lá | ×1,2 | 1 | 1 |
| Hiếm | Xanh dương | ×1,5 | 2 | 2 |
| Sử Thi | Tím | ×1,9 | 3 | 3 |
| Huyền Thoại | Cam | ×2,4 | 4 | 3 |
| Thần Thoại | Đỏ | ×3,0 | 4 + 1 đặc biệt | 4 |

**Dòng phụ (affix)** chọn ngẫu nhiên từ danh sách của ô trang bị: HP, MP, ATK%, DEF%, CRIT%, CRIT DMG, ACC, EVA, hồi HP, hồi MP, giảm hồi chiêu, hệ sát thương (+% từng hệ).

### 2.1 Ràng buộc (bind)

| Kiểu | Hành vi |
|------|---------|
| Không khóa | Giao dịch tự do |
| **Khóa khi nhặt** (BoP) | Dùng được nhưng không giao dịch (đồ nhiệm vụ, đồ boss thế giới đặc biệt) |
| **Khóa khi trang bị** (BoE) | Giao dịch tới khi mặc |
| **Khóa tài khoản** | Chia sẻ cho nhân vật cùng tài khoản |
| **Hết hạn** | Vật phẩm có thời hạn (thẻ, buff, trang phục thử) |

### 2.2 Giá trị dòng phụ (bản đầu)

Bậc A1 dùng 6 dòng đầu, mỗi dòng xuất hiện tối đa một lần trên một món. Các dòng còn lại (ACC, EVA, hồi HP/MP, giảm hồi chiêu, hệ sát thương) thêm khi cơ chế tương ứng có trong game.

| Dòng | Giá trị (món cấp `L`) |
|------|-----------------------|
| HP | `+8·L` |
| MP | `+5·L` |
| ATK% | +3% |
| DEF% | +3% |
| CRIT% | +1% |
| CRIT DMG | +5% |

Dòng % cộng dồn với nhau và với bonus set, rồi nhân vào tổng chỉ số ([combat §3.4](04-combat-and-progression.md)).

## 3. Ô trang bị (10 ô)

Mở dần: bậc A1 dùng **4 ô** (Vũ khí, Mũ, Áo, Giày); bậc A2 thêm ô **Huyền Thư** (nhận ở Lễ Khai Thư). Các ô còn lại mở theo [roadmap](../product/roadmap.md). Mặc đồ cần đạt cấp yêu cầu của món.

Vũ khí tập sự nhận ở Lễ Khai Thư: **Kiếm Lửa Tập Sự** (Hỏa) và **Trượng Thủy Tập Sự** (Thủy), Lv10, Thường, chỉ hệ đó dùng được. **Huyền Thư Sơ Bản** Lv10 Thường được mặc sẵn vào ô Huyền Thư.

| # | Ô | Loại chỉ số chính | Ghi chú |
|---|----|-------------------|---------|
| 1 | Vũ khí | ATK | Theo hệ phép; không mặc được vũ khí hệ khác |
| 2 | **Huyền Thư** | ATK, MP | Ấn bản Sơ/Tu/Định, xem [classes §6](03-origins-classes-skills.md) |
| 3 | Mũ / Mặt nạ | DEF, MP | |
| 4 | Áo | DEF, HP | |
| 5 | Quần | DEF, HP | |
| 6 | Găng tay | ATK, CRIT | |
| 7 | Giày | DEF, tốc chạy | |
| 8 | Áo Choàng Pháp Vệ | HP, EVA | Biểu tượng Đội hiển thị trên lưng |
| 9 | Bùa (Amulet) | Dòng phụ ngẫu nhiên | |
| 10 | Nhẫn | Dòng phụ ngẫu nhiên | |

Ngoài ra có **ô thẩm mỹ** (trang phục, danh hiệu) không ảnh hưởng chỉ số.

## 4. Công thức chỉ số trang bị

Trang bị có cấp yêu cầu `L`. Chỉ số gốc **trước** hệ số độ hiếm:

| Ô | Chỉ số chính | Công thức |
|---|-------------|-----------|
| Vũ khí | ATK | `4·L + 10` |
| Huyền Thư | ATK / MP | `1,5·L + 5` / `8·L + 20` |
| Mũ | DEF / MP | `1,0·L + 2` / `6·L` |
| Áo | DEF / HP | `1,6·L + 4` / `18·L + 40` |
| Quần | DEF / HP | `1,2·L + 3` / `12·L + 30` |
| Găng | ATK / CRIT% | `1,0·L + 2` / `+0,1·(L/10)` |
| Giày | DEF / tốc chạy | `0,8·L + 2` / `+2%` |
| Áo Choàng | HP / EVA | `10·L` / `0,5·L` |

Chỉ số cuối = `gốc × hệ số độ hiếm × (1 + 0,06 × cấp cường hóa)`.

### 4.1 Giá trị và giá bán

- **Trang bị:** giá trị = `(20·L + 30) × hệ số giá` (Thường ×1, Tốt ×2, Hiếm ×5, Sử Thi ×15).
- **Tiêu hao:** giá trị bằng giá mua (§8).
- **Nguyên liệu:** Đồng Luyện Sơ 40, Trung 160 (bậc Cao, Tinh xác định khi có cường hóa).
- Bán cho NPC được **25% giá trị** ([economy §3](08-economy-and-monetization.md)). Ví dụ: Mũ Lv4 Tốt có giá trị 220, bán được 55 Quan.
- Bán món **Hiếm trở lên** phải bấm xác nhận lần hai.
- **Bán nhanh** chỉ bán đồ Thường đang nằm trong túi.

## 5. Các bậc Set theo cấp

Mỗi bậc set có 6 mảnh (Vũ khí, Mũ, Áo, Quần, Găng, Giày). Chủ đề đặt theo các Đội.

| Bậc | Tên set | Cấp | Nguồn chính |
|-----|---------|-----|-------------|
| S1 | **Dân Làng** | 1–9 | Nhiệm vụ chương 1, quái R01 |
| S2 | **Thư Lại** | 10–19 | Kỳ thi, quái R03 |
| S3 | **Viện Khảm** | 20–34 | Chương 3, hầm ngục DG02–03 |
| S4 | **Viện Tốn** | 35–49 | Chương 4, DG04 |
| S5 | **Viện Chấn** | 50–64 | Chương 5, DG05 |
| S6 | **Viện Cấn** | 65–79 | Chương 6, DG06 |
| S7 | **Viện Càn** | 80–94 | Raid Bạch Lĩnh, Chương 7 |
| S8 | **Chấp Bút** | 95–100 | Raid Lòng Chương Trắng, Mùa Giải |

### 5.1 Bonus set

| Số mảnh | Hiệu ứng |
|---------|----------|
| 2 | +5% HP |
| 4 | +8% ATK và +8% DEF |
| 6 | **Hiệu ứng set riêng theo hệ** (ví dụ S3 Hỏa: Hỏa Cầu bắn thêm 1 viên) |

Bộ **S1 Dân Làng** không theo hệ, dùng được cả trước và sau Lễ Khai Thư. Ở bậc A1 bộ có 4 món theo 4 ô đang mở; bonus 2 và 4 món áp dụng như trên. Vật phẩm nhiệm vụ Chương 1: **Kiếm Gỗ Tập** (Vũ khí Lv1 Thường, Q_MAIN_02) và **Áo Suối Mơ** (Áo Lv9 Tốt, Q_MAIN_10) không thuộc bộ.

Ba mảnh đầu của set bất kỳ cùng hệ được tính **Set kích hoạt** (giống set kích hoạt NRO): +10% sát thương kỹ năng cùng hệ.

## 6. Cường hóa (+1 → +16)

NPC042 **Thợ Rèn Tư** (M006).

| Cấp | Tỉ lệ thành công | Quan | Đồng Luyện | Thất bại |
|-----|-------------------|-----|---------|----------|
| +1 | 100% | 200 | 1 Sơ | — |
| +2 | 100% | 300 | 1 Sơ | — |
| +3 | 100% | 450 | 1 Sơ | — |
| +4 | 90% | 675 | 2 Sơ | Giữ nguyên |
| +5 | 80% | 1.012 | 1 Trung | Giữ nguyên |
| +6 | 70% | 1.518 | 1 Trung | Giữ nguyên |
| +7 | 60% | 2.278 | 2 Trung | Giữ nguyên |
| +8 | 50% | 3.417 | 2 Trung | Giữ nguyên |
| +9 | 40% | 5.125 | 1 Cao | **−1 cấp** |
| +10 | 35% | 7.688 | 1 Cao | −1 cấp |
| +11 | 30% | 11.533 | 2 Cao | −1 cấp |
| +12 | 25% | 17.299 | 2 Cao | −1 cấp |
| +13 | 20% | 25.949 | 1 Tinh | −1 cấp |
| +14 | 15% | 38.923 | 1 Tinh | −1 cấp |
| +15 | 10% | 58.385 | 2 Tinh | −1 cấp |
| +16 | 5% | 87.578 | 2 Tinh | −1 cấp |

- Công thức Quan: `200 × 1,5^(n−1)`.
- **Không bao giờ phá hủy trang bị.** Thất bại tối đa giảm 1 cấp.
- **Bùa Bảo Hộ** (cửa hàng, sự kiện): thất bại không giảm cấp.
- **Không Lùi Bước (pity):** sau mỗi lần thất bại liên tiếp, tỉ lệ +5% (tối đa +25%), reset khi thành công.
- Bonus cường hóa: `+6%` chỉ số gốc mỗi cấp (tối đa +96% ở +16).
- Cường hóa **trực tiếp trên đồ đang mặc**, server tính trong **một transaction** (xem [database](../architecture/database-schema.md)).

## 7. Khảm Hạt Nguyên

NPC043 **Thợ Khảm**. Ngọc rơi từ hầm ngục và chế tạo.

| Loại ngọc | Hiệu ứng mỗi cấp ngọc (1–5) |
|-----------|------------------------------|
| Ngọc Hỏa/Thủy/Phong/Lôi/Thổ/Mộc/Ám | +2% sát thương cùng hệ × cấp |
| Ngọc Sinh Lực | +100 HP × cấp |
| Ngọc Ma Lực | +80 MP × cấp |
| Ngọc Tấn Công | +10 ATK × cấp |
| Ngọc Phòng Thủ | +8 DEF × cấp |
| Ngọc Chí Mạng | +0,5% CRIT × cấp |

- Ghép **3 ngọc cùng loại, cùng cấp** → 1 ngọc cấp kế (tốn Quan).
- Gỡ ngọc: **Thợ Đóng Sách Bình (NPC029)**, mất 30% ngọc (trừ khi dùng Bùa Gỡ Ngọc).
- Khảm ngọc không có tỉ lệ thất bại.

## 8. Vật phẩm tiêu hao

| Vật phẩm | Hiệu ứng | Hồi chiêu | Giá (Quan) |
|----------|----------|-----------|-----------|
| Bình HP Nhỏ | Hồi 150 HP | 8s | 20 |
| Bình HP Vừa | Hồi 600 HP | 8s | 80 |
| Bình HP Lớn | Hồi 2.000 HP | 8s | 250 |
| Bình HP Đặc Biệt | Hồi 6.000 HP | 8s | 800 |
| Bình HP Tối Thượng | Hồi 15.000 HP | 8s | 2.000 |
| Bình MP (5 bậc) | Tương tự: 80 / 300 / 1.000 / 3.000 / 8.000 MP | 8s | ×0,8 giá HP |
| **Lá Thuốc Cổ** | **Hồi đầy HP và MP** | **30s**, tối đa 10 mỗi ngày dùng | Không bán (nhiệm vụ, sự kiện) |
| Lá Hồi Sinh | Hồi sinh tại chỗ, 50% HP | 60s | 1.000 |
| Cuộn Dịch Chuyển | Về thành gần nhất | 5 phút | 200 |
| Bùa Bảo Hộ | Chống giảm cấp cường hóa | — | 10 Nén Bạc hoặc sự kiện |
| Bình Rửa Tiềm Năng | Reset điểm tiềm năng | — | 50 Nén Bạc |
| Cuộn EXP ×2 | EXP ×2 trong 30 phút | — | 20 Nén Bạc |
| Thẻ Auto | +1 giờ Auto Hunt | — | Thưởng/10 Nén Bạc |

### 8.1 Thức ăn của Bà Hai Bánh (NPC025)

Buff 30 phút, không cộng dồn cùng loại:

| Món | Hiệu ứng |
|-----|----------|
| Bánh Mật Ong | +5% EXP |
| Súp Mana | +10% MP, hồi MP +10% |
| Thịt Nướng Than Hồng | +8% ATK |
| Cá Chiên Biển | +8% DEF |
| Mâm Cơm Bến Cảng | +5% EXP, +5% ATK, +5% DEF |

## 9. Chế tạo (Thợ Đóng Sách Bình)

| Công thức | Nguyên liệu | Kết quả |
|-----------|-------------|---------|
| Bình HP Vừa ×10 | 20 Thảo Dược, 200 Quan | 10 Bình HP Vừa |
| Đồng Luyện Trung | 3 Đồng Luyện Sơ, 500 Quan | 1 Đồng Luyện Trung |
| Ngọc cấp 2 | 3 Ngọc cấp 1, 1.000 Quan | 1 Ngọc cấp 2 |
| Set Đội (S3) | Nguyên liệu quái, 20.000 Quan | 1 mảnh set |
| Chổi Bay Bạc | 50 Mảnh Chổi, 100.000 Quan | Chổi Bay Bạc |

## 10. Túi đồ & Kho

| Mục | Mặc định | Tối đa | Mở rộng |
|-----|----------|--------|---------|
| Túi đồ | 30 ô | 90 ô | Bà Thủ Kho (NPC031): +10 ô/lần, giá tăng dần (Quan), một phần cần Nén Bạc |
| Kho (tài khoản) | 30 ô | 120 ô | Tương tự |
| Kho Đội | 100 ô | 300 ô | Theo cấp Đội |
| Số lượng chồng (stack) | Tiêu hao 999, nguyên liệu 9999, trang bị 1 | | |

Chức năng: sắp xếp tự động, khóa vật phẩm (chống bán nhầm), bán nhanh vật phẩm rác theo độ hiếm.

## 11. Vật phẩm theo thời gian (hạn dùng)

- Có `expiresAt`. Hiện thời gian còn lại ở tooltip.
- Hết hạn thì **biến mất khi đăng nhập** hoặc khi mở túi.
- Gia hạn bằng vật phẩm **Gia Hạn** (nếu hỗ trợ).

## 12. Định dạng khai báo

```yaml
# packages/content/items/weapons/itm01101.yaml
id: ITM01101
type: WEAPON
nameKey: item.itm01101.name
rarity: UNCOMMON
levelReq: 10
class: FIRE
weaponType: SWORD
baseStats: { atk: 50 }
bind: BOE
sellPrice: 120
icon: icons/weapon/sword_01.png
sprite: weapons/sword_01
```

Mỗi vật phẩm có **instance** riêng khi sinh ra (UUID), lưu trong `item_instances` cùng dòng phụ, ngọc, cấp cường hóa (xem [database](../architecture/database-schema.md)).
