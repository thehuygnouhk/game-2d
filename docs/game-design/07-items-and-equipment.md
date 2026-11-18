# Vật phẩm & Trang bị

> **Trạng thái:** Draft v0.1 · **Phụ thuộc:** [classes](03-origins-classes-skills.md) · [combat](04-combat-and-progression.md) · [economy](08-economy-and-monetization.md)

## 1. Phân loại vật phẩm

| Nhóm | Mã loại | Dải ID | Ví dụ |
|------|---------|--------|-------|
| Vũ khí | `WEAPON` | ITM01xxx | Kiếm, Trượng, Đoản Kiếm, Găng, Búa & Khiên, Trượng Hoa, Đao |
| Ma Đạo Thư | `GRIMOIRE` | ITM02xxx | Ma Đạo Thư 3/4/5 lá |
| Giáp & phụ kiện | `ARMOR` | ITM03xxx | Mũ, Áo, Quần, Găng, Giày, Áo Choàng, Bùa, Nhẫn |
| Tiêu hao | `CONSUMABLE` | ITM04xxx | Bình HP/MP, Lá Thảo Dược, thức ăn |
| Nguyên liệu | `MATERIAL` | ITM05xxx | Đá Mana, mảnh, rơi từ quái |
| Linh Thạch Ngọc | `GEM` | ITM06xxx | Ngọc khảm |
| Nhiệm vụ | `QUEST` | ITM07xxx | Bao Tải Bị Cướp, Thảo Dược Hage |
| Thú / Đồng hành | `COMPANION` | ITM08xxx | Khế Ước Thạch, Chổi Bay, Linh Hồn Thú |
| Thẩm mỹ | `COSMETIC` | ITM09xxx | Trang phục Đội, huy hiệu, danh hiệu |
| Sự kiện / Khác | `MISC` | ITM10xxx | Vé Quay, Thẻ Auto, Linh Thạch Sao |

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

## 3. Ô trang bị (10 ô)

| # | Ô | Loại chỉ số chính | Ghi chú |
|---|----|-------------------|---------|
| 1 | Vũ khí | ATK | Theo hệ phép; không mặc được vũ khí hệ khác |
| 2 | **Ma Đạo Thư** | ATK, MP | Phẩm 3/4/5 lá, xem [classes §6](03-origins-classes-skills.md) |
| 3 | Mũ / Mặt nạ | DEF, MP | |
| 4 | Áo | DEF, HP | |
| 5 | Quần | DEF, HP | |
| 6 | Găng tay | ATK, CRIT | |
| 7 | Giày | DEF, tốc chạy | |
| 8 | Áo Choàng Hiệp Sĩ | HP, EVA | Biểu tượng Đội hiển thị trên lưng |
| 9 | Bùa (Amulet) | Dòng phụ ngẫu nhiên | |
| 10 | Nhẫn | Dòng phụ ngẫu nhiên | |

Ngoài ra có **ô thẩm mỹ** (trang phục, danh hiệu) không ảnh hưởng chỉ số.

## 4. Công thức chỉ số trang bị

Trang bị có cấp yêu cầu `L`. Chỉ số gốc **trước** hệ số độ hiếm:

| Ô | Chỉ số chính | Công thức |
|---|-------------|-----------|
| Vũ khí | ATK | `4·L + 10` |
| Ma Đạo Thư | ATK / MP | `1,5·L + 5` / `8·L + 20` |
| Mũ | DEF / MP | `1,0·L + 2` / `6·L` |
| Áo | DEF / HP | `1,6·L + 4` / `18·L + 40` |
| Quần | DEF / HP | `1,2·L + 3` / `12·L + 30` |
| Găng | ATK / CRIT% | `1,0·L + 2` / `+0,1·(L/10)` |
| Giày | DEF / tốc chạy | `0,8·L + 2` / `+2%` |
| Áo Choàng | HP / EVA | `10·L` / `0,5·L` |

Chỉ số cuối = `gốc × hệ số độ hiếm × (1 + 0,06 × cấp cường hóa)`.

## 5. Các bậc Set theo cấp

Mỗi bậc set có 6 mảnh (Vũ khí, Mũ, Áo, Quần, Găng, Giày). Chủ đề đặt theo các Đội Hiệp Sĩ.

| Bậc | Tên set | Cấp | Nguồn chính |
|-----|---------|-----|-------------|
| S1 | **Dân Làng Hage** | 1–9 | Nhiệm vụ chương 1, quái R01 |
| S2 | **Hiệp Sĩ Tập Sự** | 10–19 | Kỳ thi, quái R03 |
| S3 | **Bò Đen** | 20–34 | Chương 3, hầm ngục DG02–03 |
| S4 | **Sư Tử Đỏ** | 35–49 | Chương 4, DG04 |
| S5 | **Hoa Hồng Xanh** | 50–64 | Chương 5, DG05 |
| S6 | **Đại Bàng Bạc** | 65–79 | Chương 6, DG06 |
| S7 | **Bình Minh Vàng** | 80–94 | Raid Spade, Chương 7 |
| S8 | **Vua Phép Thuật** | 95–100 | Raid Điện Ma Vương, Mùa Giải |

### 5.1 Bonus set

| Số mảnh | Hiệu ứng |
|---------|----------|
| 2 | +5% HP |
| 4 | +8% ATK và +8% DEF |
| 6 | **Hiệu ứng set riêng theo hệ** (ví dụ S3 Hỏa: Hỏa Cầu bắn thêm 1 viên) |

Ba mảnh đầu của set bất kỳ cùng hệ được tính **Set kích hoạt** (giống set kích hoạt NRO): +10% sát thương kỹ năng cùng hệ.

## 6. Cường hóa (+1 → +16)

NPC042 **Thợ Rèn Gren** (M006).

| Cấp | Tỉ lệ thành công | Yul | Đá Mana | Thất bại |
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

- Công thức Yul: `200 × 1,5^(n−1)`.
- **Không bao giờ phá hủy trang bị.** Thất bại tối đa giảm 1 cấp.
- **Bùa Bảo Hộ** (cửa hàng, sự kiện): thất bại không giảm cấp.
- **Ý Chí Bất Khuất (pity):** sau mỗi lần thất bại liên tiếp, tỉ lệ +5% (tối đa +25%), reset khi thành công.
- Bonus cường hóa: `+6%` chỉ số gốc mỗi cấp (tối đa +96% ở +16).
- Cường hóa **trực tiếp trên đồ đang mặc**, server tính trong **một transaction** (xem [database](../architecture/database-schema.md)).

## 7. Khảm Linh Thạch Ngọc

NPC043 **Thợ Khảm Linh**. Ngọc rơi từ hầm ngục và chế tạo.

| Loại ngọc | Hiệu ứng mỗi cấp ngọc (1–5) |
|-----------|------------------------------|
| Ngọc Hỏa/Thủy/Phong/Lôi/Thổ/Mộc/Ám | +2% sát thương cùng hệ × cấp |
| Ngọc Sinh Lực | +100 HP × cấp |
| Ngọc Ma Lực | +80 MP × cấp |
| Ngọc Tấn Công | +10 ATK × cấp |
| Ngọc Phòng Thủ | +8 DEF × cấp |
| Ngọc Chí Mạng | +0,5% CRIT × cấp |

- Ghép **3 ngọc cùng loại, cùng cấp** → 1 ngọc cấp kế (tốn Yul).
- Gỡ ngọc: **Henry (NPC029)**, mất 30% ngọc (trừ khi dùng Bùa Gỡ Ngọc).
- Khảm ngọc không có tỉ lệ thất bại.

## 8. Vật phẩm tiêu hao

| Vật phẩm | Hiệu ứng | Hồi chiêu | Giá (Yul) |
|----------|----------|-----------|-----------|
| Bình HP Nhỏ | Hồi 150 HP | 8s | 20 |
| Bình HP Vừa | Hồi 600 HP | 8s | 80 |
| Bình HP Lớn | Hồi 2.000 HP | 8s | 250 |
| Bình HP Đặc Biệt | Hồi 6.000 HP | 8s | 800 |
| Bình HP Tối Thượng | Hồi 15.000 HP | 8s | 2.000 |
| Bình MP (5 bậc) | Tương tự: 80 / 300 / 1.000 / 3.000 / 8.000 MP | 8s | ×0,8 giá HP |
| **Lá Thảo Dược Tinh Linh** | **Hồi đầy HP và MP** | **30s**, tối đa 10 mỗi ngày dùng | Không bán (nhiệm vụ, sự kiện) |
| Lá Hồi Sinh | Hồi sinh tại chỗ, 50% HP | 60s | 1.000 |
| Cuộn Dịch Chuyển | Về thành gần nhất | 5 phút | 200 |
| Bùa Bảo Hộ | Chống giảm cấp cường hóa | — | 10 Ngọc Mana hoặc sự kiện |
| Bình Rửa Tiềm Năng | Reset điểm tiềm năng | — | 50 Ngọc Mana |
| Cuộn EXP ×2 | EXP ×2 trong 30 phút | — | 20 Ngọc Mana |
| Thẻ Auto | +1 giờ Auto Hunt | — | Thưởng/10 Ngọc Mana |

### 8.1 Thức ăn của Charmy (NPC025)

Buff 30 phút, không cộng dồn cùng loại:

| Món | Hiệu ứng |
|-----|----------|
| Bánh Mật Bông | +5% EXP |
| Súp Mana | +10% MP, hồi MP +10% |
| Thịt Nướng Sư Tử | +8% ATK |
| Cá Chiên Biển | +8% DEF |
| Bữa Tiệc Bò Đen | +5% EXP, +5% ATK, +5% DEF |

## 9. Chế tạo (Henry)

| Công thức | Nguyên liệu | Kết quả |
|-----------|-------------|---------|
| Bình HP Vừa ×10 | 20 Thảo Dược, 200 Yul | 10 Bình HP Vừa |
| Đá Mana Trung | 3 Đá Mana Sơ, 500 Yul | 1 Đá Mana Trung |
| Ngọc cấp 2 | 3 Ngọc cấp 1, 1.000 Yul | 1 Ngọc cấp 2 |
| Set Đội (S3) | Nguyên liệu quái, 20.000 Yul | 1 mảnh set |
| Chổi Bay Bạc | 50 Mảnh Chổi, 100.000 Yul | Chổi Bay Bạc |

## 10. Túi đồ & Kho

| Mục | Mặc định | Tối đa | Mở rộng |
|-----|----------|--------|---------|
| Túi đồ | 30 ô | 90 ô | Secre (NPC031): +10 ô/lần, giá tăng dần (Yul), một phần cần Ngọc Mana |
| Kho (tài khoản) | 30 ô | 120 ô | Tương tự |
| Kho Đội | 100 ô | 300 ô | Theo cấp Squad |
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
