# 📖 Hướng dẫn sử dụng hệ thống OpenClaw (Phase 4 Hoàn tất)

Hệ thống **OpenClaw** được thiết kế theo mô hình Microservice gồm 2 tiến trình chính chạy song song:
1. **Gateway Server**: Bộ não cốt lõi quản lý kết nối WebSocket, xử lý định tuyến (Routing) và chứa các Agent (AI Runtime) có khả năng sinh nội dung.
2. **Channel Node**: Node trung gian, mở các kênh tương tác ngoại bộ (WhatsApp, Discord), mã hóa dữ liệu thành chuẩn chung và đẩy về Gateway Server.

Dưới đây là các bước để Khởi động và Cấu hình dự án cho người dùng cuối.

---

## 1. Cấu hình môi trường

Mọi thiết lập của bạn được lưu tại file: `C:\Users\<Tên_User>\.openclaw\openclaw.json` (Trên Windows) hoặc `~/.openclaw/openclaw.json` (Trên macOS/Linux).

Khởi động cấu hình lần đầu tự động:
- Bạn chỉ cần chạy lệnh `npm run start` 1 lần, hệ thống sẽ tự sinh ra file config gốc tại đường dẫn trên.

### Mẫu cấu trúc `openclaw.json`
Bạn dùng trình soạn thảo (Notepad, VSCode) mở file config trên và điền các khóa API vào.
```json
{
  "gateway": {
    "port": 18789,
    "bind": "127.0.0.1"
  },
  "agent": {
    "model": "openrouter/auto",
    "workspace": "~/.openclaw/workspace"
  },
  "models": {
    "anthropic": { "apiKey": "THÊM_KEY_CLAUDE_CỦA_BAN_VÀO_ĐÂY" },
    "openai": { "apiKey": "THÊM_KEY_CHATGPT_VAO_ĐÂY" },
    "deepseek": { "apiKey": "THÊM_KEY_DEEPSEEK_VAO_DAY" },
    "openrouter": { "apiKey": "sk-or-v1-THÊM_KEY_OPENROUTER_VAO_DAY" }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "botToken": "MOCK_TOKEN_HERE",
      "allowFrom": ["vuquangcuong@gmail.com"]
    },
    "whatsapp": {
      "enabled": true,
      "sessionPath": "~/.openclaw/whatsapp-session",
      "allowFrom": ["84912580018"]
    }
  }
}
```

> **Ghi chú về AI Mode 🧠**: 
> - Mở rộng mới: Ở Phase 4, nếu bạn đặt `agent.model` là `"openrouter/auto"`, hệ thống sẽ kích hoạt AI **SmartRouter**. Nó sẽ tự động quét, xếp hạng và chuyển đổi (failover) ngầm giữa các trợ lý AI miễn phí tốt nhất toàn cầu nếu chẳng may bị lỗi máy chủ (Rate limit).

> **Ghi chú về bảo mật 🛡️**: 
> - Mã định dạng WhatsApp `allowFrom` yêu cầu chứa chính xác `84912580018`. Những người lạ nhắn tin sẽ **bị chặn**.
> - Bạn cần lấy **Mã thẻ Bot (Bot Token)** tại [Discord Developer Portal](https://discord.com/developers/applications) dán vào phần `"MOCK_TOKEN_HERE"`.

---

## 2. Cách Khởi chạy hệ thống OpenClaw

Để chạy toàn bộ hệ thống, bạn cần bật **2 cửa sổ Terminal (Powershell / CMD)**.

### 🟢 Terminal 1: Chạy Trái tim hệ thống (Gateway & AI)
Chuyển tới thư mục dự án `d:\Automator_Prj\3G` và chạy:
```bash
npm run build
npm run start
```
Thấy phản hồi này là Server đã đứng chờ lệnh thành công:
`[INFO] ✅ OpenClaw Gateway Server đã mở cổng tại ws://127.0.0.1:18789`

### 🔵 Terminal 2: Chạy các Kênh tương tác (WhatsApp / Discord)
(Giữ Terminal 1 hoạt động chạy ngầm, mở Terminal 2 từ thư mục dự án `d:\Automator_Prj\3G`)
```bash
npm run start -- channels
```
- Nếu cấu hình đúng Bot Token Discord, log sẽ in: `[INFO] ✅ [Discord] Đã kết nối Bot thành công`.
- Ngay sau đó, bạn sẽ thấy tính năng tạo mã vạch **Qrcode-Terminal** hiện trong màn hình này.
- **Tiến hành**: Mở app WhatsApp trên điện thoại > Vào "Thiết bị liên kết (Linked Devices)" > Quét biểu tượng màn hình để Đăng Nhập.
- Socket WhatsApp tải thành công, báo `[INFO] ✅ [WhatsApp] Đã MỞ KẾT NỐI an toàn`.

---

## 3. Quản lý AI Personality (Tính cách của BOT)

Khi bạn muốn OpenClaw có thêm kiến thức mới hoặc thay đổi cách xưng hô:
1. Mở file `~/.openclaw/workspace/SOUL.md` (tự động được tạo).
2. Viết Prompt điều khiển bot của bạn:
```md
# SOUL
Bạn tên là OpenClaw. Bạn xưng hô là "Bóp" và gọi tôi là "Cậu". Hãy trả lời tôi thật ngắn gọn.
```
Mỗi khi khởi tạo Gateway Engine ở Terminal 1, các thay đổi tại file này sẽ được nạp vào trí óc thực thi của Anthropic / OpenAI.

---

## 4. Kiểm thử qua dòng lệnh CLI (Không cần bật WhatsApp)

Nếu bạn code / gỡ rối lỗi mà chưa tiện mở app trên Mobile ra nhắn, bạn có thể gửi lệnh trực tiếp cho AI mô phỏng môi trường Channel Node bằng cách chạy lệnh Terminal:
```bash
npm run start -- agent --message "Chào AI. Hỏi xem bạn hiểu tính cách chưa?"
```
*(Lưu ý: Bạn phải nhớ Terminal 1 của Gateway vẫn phải chạy nhé)*
