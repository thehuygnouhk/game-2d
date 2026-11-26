# @htk/content

Nội dung game dạng YAML, schema Zod và bộ kiểm chứng ([content-pipeline](../../docs/workflows/content-pipeline.md)). Game server nạp gói này khi khởi động; nội dung sai thì server không chạy.

| Thư mục | Nội dung |
|---------|----------|
| `monsters/`, `bosses/`, `events/` | Quái R01 và R03 (bậc B5.1), boss theo giờ, boss hầm ngục, boss khu vực Lợn Rừng Chúa, lịch sự kiện |
| `items/`, `drops/`, `shops/` | Vật phẩm thử (bộ S1, S2), bảng rơi R01 và R03, tiệm của Lam Nhi |
| `classes/` | Xuất thân (`origins.yaml`), kỹ năng tân thủ (`novice.yaml`), Hỏa, Thủy |
| `quests/`, `i18n/vi.yaml` | Chính tuyến Chương 1 và Q_MAIN_13–16 của Chương 2 (vật phẩm nhiệm vụ ở `quest_items.yaml`), chữ hiển thị (cả câu server ghép: hộp thoại, thông báo boss) |
| `npcs/`, `scenes/`, `dungeons/` | NPC R01 và R02 (tên, câu chào, hàng chân dung), cảnh Q_MAIN_11–13, hầm ngục DG01 (bậc B4) |
| `schema/index.ts` | Schema Zod (quy tắc V001) |
| `src/index.ts` | `loadContent()`: nạp YAML và map, kiểm V001–V004 |
| `src/validate.ts` | `pnpm content:validate` |

YAML hiện do `tools/art-proto/build.py` sinh ra (`python3 tools/art-proto/build.py art/prototype content`). Sửa số liệu ở đó rồi dựng lại, không sửa tay trong thư mục này cho tới khi có `content-cli`. Map Tiled vẫn ở `art/prototype/maps`.
