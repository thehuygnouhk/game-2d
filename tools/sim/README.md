# Mô phỏng cân bằng

| File | Nội dung |
|------|----------|
| `chapter1.py` | Nhịp chơi Chương 1: phút, số quái, cấp và thời gian cày theo từng nhiệm vụ. Báo cáo: [chapter1-pacing](../../docs/reports/chapter1-pacing.md) |
| `chapter2.py` | Nhịp chơi đầu Chương 2 (bậc B5.1, Q_MAIN_13–16), cùng công thức với `chapter1.py`, đọc dữ liệu ở `packages/content` và `art/prototype/maps` (cần PyYAML). Báo cáo: [chapter2-pacing](../../docs/reports/chapter2-pacing.md) |

Chạy (Python 3, không cần thư viện ngoài), sau khi dựng dữ liệu bản chơi thử:

```bash
python3 tools/sim/chapter1.py
```

```bash
python3 tools/sim/chapter2.py
```

Thử phương án khác mà không sửa dữ liệu: `--set-exp Q_MAIN_03=350,Q_MAIN_04=600`. Giả định ghi ở đầu file và ở báo cáo §2.
