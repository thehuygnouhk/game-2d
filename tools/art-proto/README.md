# Art prototype (bản thử, không phải art chính thức)

Công cụ vẽ pixel art bằng code để **thử phong cách** nhân vật, sách phép và hiệu ứng kỹ năng. Đây **không** phải art sản xuất: art chính thức do họa sĩ pixel vẽ, sau khi các mục ở [reskin-spec §9](../../docs/product/reskin-spec.md#9-danh-sách-duyệt) được duyệt. Đặc tả khung hình và hoạt ảnh: [art-audio-direction §3](../../docs/game-design/12-art-audio-direction.md).

| File | Nội dung |
|------|----------|
| `pix.py` | Hình cơ bản, tô bóng tự động, xuất sprite sheet và GIF |
| `actors.py` | Khung xương (rig), tư thế (idle, walk, run, attack, cast), vũ khí, bản vẽ đầu tiên (đã thay) |
| `templates.py` | Đầu, mắt, tóc, Huyền Thư chấm tay từng pixel |
| `hero.py` | Nhân vật kiểu anime: đồng phục, áo choàng có huy hiệu quẻ, Huyền Thư 3 ấn bản |
| `vfx.py` | Hiệu ứng Hỏa Cầu, vụ nổ, hình nộm tập |
| `sample.py` | Xuất bộ mẫu GIF |

Chạy (cần Python 3, numpy, Pillow):

```bash
python3 tools/art-proto/sample.py /tmp/art-sample
```

Giới hạn đã biết: tay, chân, thân vẫn vẽ bằng hình khối nên còn cứng; hoạt ảnh nội suy bằng góc khớp. Không dùng tên, dáng nhân vật hay biểu tượng của tác phẩm khác (xem [reskin-spec §10](../../docs/product/reskin-spec.md#10-kiểm-tra-rò-rỉ-tên-ip)).
