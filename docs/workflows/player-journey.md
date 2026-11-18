# Workflow: Hành trình người chơi & Luồng chức năng

> **Trạng thái:** Draft v0.1 · **Liên quan:** [use cases](../usecases/use-cases-player.md) · [quests](../game-design/06-quests-and-missions.md) · [combat](../game-design/04-combat-and-progression.md)

## 1. Tổng quan hành trình

```mermaid
flowchart TD
    A["Mở game"] --> B{"Có tài khoản?"}
    B -- "Chưa" --> C["Đăng ký"]
    B -- "Rồi" --> D["Đăng nhập"]
    C --> D
    D --> E["Chọn máy chủ"]
    E --> F{"Có nhân vật?"}
    F -- "Chưa" --> G["Tạo nhân vật<br/>(xuất thân, ngoại hình)"]
    F -- "Rồi" --> H["Chọn nhân vật"]
    G --> I["Chương 1: Làng Hage<br/>Lv1-9 hướng dẫn"]
    H --> J["Vào thế giới"]
    I --> K["Lv10: Lễ Nhận Ma Đạo Thư<br/>chọn hệ phép"]
    K --> L["Chương 2: Kinh Đô, Kỳ thi<br/>mở Squad Lv20"]
    L --> M["Vòng lặp chính"]
    J --> M
    M --> N["Endgame: Raid, PvP,<br/>Mùa giải Vua Phép Thuật"]
```

## 2. Hành trình theo giai đoạn (cấp độ)

| Giai đoạn | Cấp | Mục tiêu người chơi | Tính năng mở | Cảm xúc chủ đạo |
|-----------|-----|---------------------|--------------|-----------------|
| **Tân thủ** | 1–9 | Học điều khiển, đánh quái, nhận đồ | Đòn thường, Tụ Mana Chấn, nhiệm vụ | Tò mò, ấm áp |
| **Thức tỉnh** | 10 | Chọn hệ phép | Kỹ năng hệ, Ma Đạo Thư | Phấn khích |
| **Khám phá** | 10–24 | Vào Kinh Đô, vượt kỳ thi | Chợ, Cường hóa, Cổng, Auto Hunt (Lv20), Squad (Lv20) | Hoài bão |
| **Kết nối** | 25–39 | Gia nhập Đội, Bò Đen, Mana Skin | Squire (Lv25), nhóm, Hầm Ngục DG02–03 | Thuộc về |
| **Thử thách** | 40–59 | Hầm ngục, chiến tranh | Khảm ngọc, Chiến Trường, Squad War | Hồi hộp |
| **Tinh thông** | 60–89 | Tinh Linh, Spade, raid | Linh Thạch Sao, Raid, Phản Ma | Làm chủ |
| **Huyền thoại** | 90–100 | Cõi Quỷ, Lucifero | Spirit Dive đầy đủ, Mùa Giải | Vinh quang |

## 3. 10 phút đầu tiên

```mermaid
flowchart LR
    T0["0:00<br/>Tạo nhân vật"] --> T1["1:00<br/>Gặp Sơ Lily<br/>(Q_MAIN_01)"]
    T1 --> T2["2:30<br/>Đánh Slime Cỏ<br/>(Q_MAIN_02)"]
    T2 --> T3["4:00<br/>Nhặt đồ, dùng bình<br/>Lên Lv2-3"]
    T3 --> T4["6:00<br/>Làm nhiệm vụ thỏ,<br/>thảo dược"]
    T4 --> T5["8:00<br/>Gặp Asta<br/>học Tụ Mana Chấn"]
    T5 --> T6["10:00<br/>Lv5, thấy Rừng Nhỏ<br/>nút Nhiệm vụ nhấp nháy"]
```

Mục tiêu thiết kế: người chơi **đạt Lv5 trong 10 phút**, **hiểu vòng lặp (nhận NV → đánh → trả)**, **không bị chặn bởi giao diện**.

## 4. Một phiên chơi điển hình (30–60 phút)

```mermaid
flowchart TD
    S["Đăng nhập"] --> Q["Nhận thư, quà điểm danh"]
    Q --> D["Nhận Nhiệm vụ ngày<br/>(Bảng Nhiệm Vụ)"]
    D --> H["Đi săn / làm NV chính"]
    H --> I{"Túi đầy?"}
    I -- "Có" --> R["Về thành: bán, cất kho,<br/>cường hóa"]
    R --> H
    I -- "Không" --> E{"Có sự kiện?<br/>Boss, Chiến Trường"}
    E -- "Có" --> X["Tham gia sự kiện"]
    E -- "Không" --> G["Hầm ngục / nhóm"]
    X --> W["Nhận thưởng, Sao"]
    G --> W
    W --> L{"Lên cấp?"}
    L -- "Có" --> P["Cộng điểm, nâng kỹ năng"]
    L -- "Không" --> O["Đăng xuất / treo Auto"]
    P --> O
```

### 4.1 Nhịp ngày – tuần – mùa

| Chu kỳ | Hoạt động chính |
|--------|-----------------|
| **Hằng ngày** | Điểm danh, 10 nhiệm vụ ngày, boss thế giới, Chiến Trường, hầm ngục, Squad |
| **Hằng tuần** | Raid, Squad War (T7), Săn Linh Thạch Sao (T7), nhiệm vụ tuần |
| **Hằng tháng** | Lễ Trao Sao, đua bảng xếp hạng |
| **Mùa (3 tháng)** | Đấu Trường mùa, Battle Pass, phần thưởng độc quyền |

## 5. Luồng chức năng chi tiết

### 5.1 Nhiệm vụ

```mermaid
sequenceDiagram
    actor P as Người chơi
    participant N as NPC
    participant S as Server
    P->>N: Nói chuyện (F)
    N->>S: C_NPC_INTERACT
    S-->>P: S_NPC_DIALOG (menu)
    P->>S: C_QUEST_ACCEPT
    S->>S: Kiểm tra điều kiện (cấp, tiền đề)
    S-->>P: S_QUEST_UPDATE (ACCEPTED)
    loop làm nhiệm vụ
        P->>S: Hành động (đánh quái, nhặt...)
        S->>S: Sự kiện domain → cập nhật tiến độ
        S-->>P: S_QUEST_UPDATE (progress)
    end
    S-->>P: S_QUEST_UPDATE (READY)
    P->>S: C_QUEST_TURNIN (idemKey)
    S->>S: Ghi DB (EXP, Yul, vật phẩm) trong 1 transaction
    S-->>P: Thưởng + S_QUEST_UPDATE (COMPLETED)
```

### 5.2 Chiến đấu (một lượt)

```mermaid
flowchart TD
    A["Chọn mục tiêu / kỹ năng"] --> B{"Hợp lệ?<br/>MP, hồi chiêu, tầm"}
    B -- "Không" --> B1["Từ chối: hiện lý do"]
    B -- "Có" --> C["Trừ MP, đặt hồi chiêu"]
    C --> D["Tính trúng/né"]
    D --> E{"Trúng?"}
    E -- "Không" --> E1["Hiển thị MISS"]
    E -- "Có" --> F["Tính sát thương:<br/>ATK x mult x hệ x chí mạng x giáp"]
    F --> G["Trừ HP mục tiêu, áp hiệu ứng"]
    G --> H{"Mục tiêu chết?"}
    H -- "Không" --> A
    H -- "Có" --> I["Chia EXP, Yul, rơi đồ"]
    I --> J["Sự kiện: mob.killed → quest/achievement"]
```

### 5.3 Chết & hồi sinh

```mermaid
flowchart TD
    D["HP = 0: Chết"] --> M{"Ở đâu?"}
    M -- "Field" --> F["Chọn:<br/>Về thành (miễn phí)<br/>Hồi sinh tại chỗ (Lá/5 Ngọc)"]
    M -- "Hầm ngục" --> G["Hồi sinh theo điểm lưu<br/>(tối đa 3 lần)"]
    M -- "Boss thế giới" --> H["Chờ 15s rồi hồi sinh"]
    M -- "Chiến Trường" --> I["Hồi sinh sau 10s tại căn cứ"]
    F --> X["Mất 2% EXP cấp hiện tại<br/>(không tụt cấp)"]
    G --> Y["Không mất EXP"]
    H --> X
    I --> Y
```

### 5.4 Cường hóa

```mermaid
flowchart TD
    A["Chọn trang bị"] --> B["Xem tỉ lệ, chi phí, pity"]
    B --> C{"Dùng Bùa Bảo Hộ?"}
    C --> D["Xác nhận"]
    D --> E["Server: kiểm tra Yul, nguyên liệu"]
    E --> F["Trừ tài nguyên (transaction)"]
    F --> G{"RNG ≤ tỉ lệ + pity?"}
    G -- "Thành công" --> H["+1 cấp, reset pity"]
    G -- "Thất bại" --> I{"Cấp ≥ +9?"}
    I -- "Không" --> J["Giữ nguyên, +5% pity"]
    I -- "Có" --> K{"Có Bùa?"}
    K -- "Có" --> J
    K -- "Không" --> L["-1 cấp, +5% pity"]
```

### 5.5 Giao dịch trực tiếp

```mermaid
sequenceDiagram
    actor A as Người A
    actor B as Người B
    participant S as Server
    A->>S: C_TRADE_REQUEST(B)
    S-->>B: Lời mời giao dịch
    B->>S: Chấp nhận
    S-->>A: S_TRADE_STATE (mở cửa sổ)
    S-->>B: S_TRADE_STATE (mở cửa sổ)
    A->>S: C_TRADE_UPDATE (vật phẩm, Yul)
    B->>S: C_TRADE_UPDATE
    A->>S: C_TRADE_CONFIRM(stage 1)
    B->>S: C_TRADE_CONFIRM(stage 1)
    Note over S: Khóa nội dung, hiển thị lần cuối
    A->>S: C_TRADE_CONFIRM(stage 2)
    B->>S: C_TRADE_CONFIRM(stage 2)
    S->>S: Transaction: chuyển tài sản, ghi sổ cái
    S-->>A: Thành công
    S-->>B: Thành công
```

### 5.6 Chợ Ký Gửi

```mermaid
flowchart LR
    A["Người bán<br/>niêm yết"] --> B["Phí 1%<br/>vật phẩm sang MARKET"]
    B --> C["Hiển thị trên Chợ<br/>48 giờ"]
    C --> D{"Người mua?"}
    D -- "Mua" --> E["Chuyển vật phẩm cho người mua<br/>Yul cho người bán - 5% phí<br/>qua Thư"]
    D -- "Hết hạn" --> F["Trả vật phẩm qua Thư"]
    C --> G["Người bán hủy"]
    G --> F
```

### 5.7 Nạp Ngọc Mana

```mermaid
sequenceDiagram
    actor P as Người chơi
    participant C as Client
    participant A as API
    participant PG as Cổng thanh toán
    participant W as Webhook handler
    P->>C: Chọn gói nạp
    C->>A: POST /payments/orders
    A-->>C: payUrl (đơn PENDING)
    C->>PG: Chuyển sang thanh toán
    P->>PG: Thanh toán
    PG->>W: Webhook (chữ ký)
    W->>W: Xác minh chữ ký, idempotent
    W->>A: Cập nhật đơn PAID, cộng Ngọc Mana (transaction)
    A-->>C: Thông báo qua WS/notify
    C-->>P: "Đã cộng X Ngọc Mana"
```

### 5.8 Săn 7 Linh Thạch Sao

```mermaid
flowchart TD
    S["T7 21:00: 7 viên xuất hiện<br/>ở 7 map khác nhau"] --> F["Người chơi dò bằng radar,<br/>đi nhặt"]
    F --> H["Giữ tối đa 15 phút/viên"]
    H --> K{"Bị PK hạ?"}
    K -- "Có" --> L["Rơi toàn bộ viên đang giữ"]
    L --> F
    K -- "Không" --> A{"Đủ 7 viên?"}
    A -- "Chưa" --> F
    A -- "Rồi" --> Z["Đến Đàn Tế Tinh Linh (M024)"]
    Z --> C["Triệu hồi Tứ Đại Tinh Linh"]
    C --> W["Chọn 1 điều ước"]
    W --> E["Đá biến mất, cooldown 7 ngày"]
```

### 5.9 Gia nhập Squad

```mermaid
flowchart TD
    A["Mở Squad (P)"] --> B{"Đã có Squad?"}
    B -- "Rồi" --> C["Xem Squad hiện tại"]
    B -- "Chưa" --> D["Duyệt danh sách / nhận lời mời"]
    D --> E["Gửi đơn / chấp nhận lời mời"]
    E --> F{"Đã rời Squad < 24h?"}
    F -- "Có" --> G["Chờ hết thời gian"]
    F -- "Không" --> H["Chờ Đội Trưởng/Phó duyệt"]
    H --> I["Vào Squad: nhận buff, nhiệm vụ Đội"]
    A --> J["Hoặc: Thư Ký Đội → Lập Squad<br/>(Lv20, 50.000 Yul)"]
```

### 5.10 Hầm ngục

```mermaid
flowchart TD
    A["Tìm nhóm / tạo nhóm 3-5"] --> B["Đến cổng hầm ngục"]
    B --> C{"Còn lượt? Đủ cấp?"}
    C -- "Không" --> C1["Thông báo lý do"]
    C -- "Có" --> D["Server tạo Instance"]
    D --> E["Chiến đấu qua các phòng"]
    E --> F{"Boss cuối hạ?"}
    F -- "Chưa, hết giờ / chết hết" --> G["Thất bại: trả về cổng"]
    F -- "Rồi" --> H["Chia thưởng, trừ 1 lượt"]
    H --> I["Rương, nguyên liệu, Sách Kỹ Năng"]
```

## 6. Các tình huống biên (edge cases)

| Tình huống | Hành vi mong đợi |
|-----------|-------------------|
| Mất kết nối khi đang cường hóa | Lệnh đã nhận thì hoàn tất; kết quả hiển thị khi đăng nhập lại (mail/ghi log) |
| Túi đồ đầy khi nhặt/nhận thưởng | Vật phẩm gửi qua **Thư** (tối đa 30 ngày) |
| Hai người cùng nhặt một vật phẩm | Server chọn người đến trước (theo tick), người kia nhận thông báo |
| Mất kết nối trong Hầm ngục | Giữ chỗ 5 phút; thoát = bị tính là bỏ |
| Server bảo trì khi đang boss | Thông báo trước; boss reset; thưởng theo log |
| Đăng nhập trên thiết bị khác | Phiên cũ bị đá, thiết bị mới vào |
| Tên nhân vật trùng | Báo lỗi và gợi ý tên thay thế |
| Spam chat | Mute tự động 5 phút |
| Chết khi đang mang Linh Thạch | Viên rơi nếu bị PK hạ; nếu do quái thì giữ |

## 7. Điểm rơi rủi ro bỏ cuộc (churn) và biện pháp

| Thời điểm | Rủi ro | Biện pháp |
|-----------|--------|-----------|
| Lv1–5 | Không hiểu cơ chế | Chỉ dẫn bong bóng, tăng tốc EXP |
| Lv10 | Chọn hệ sai | Cho **đổi miễn phí 24 giờ**, gợi ý theo vai trò |
| Lv20–30 | Cày chán | Nhiệm vụ ngày + Squad + Auto Hunt |
| Lv40–50 | Tường sức mạnh | Cường hóa có pity, Hầm Ngục, nhiệm vụ tuần |
| Lv60+ | Thiếu mục tiêu | Raid, Chiến Trường, Mùa Giải, Sao |
| Endgame | Hết nội dung | Mùa mới mỗi 3 tháng |
