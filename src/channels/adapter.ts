export interface IChannelAdapter {
    id: string; // VD: 'whatsapp', 'discord'
    name: string;

    // Khởi động channel
    start(): Promise<void>;

    // Dừng channel
    stop(): Promise<void>;

    // Hàm callback khi nhận tin nhắn từ platform để gửi về Gateway
    onMessageReceived: (message: any) => void;

    // Hàm Gateway gọi để phản hồi tin nhắn ngược ra platform
    sendMessage(recipientId: string, content: string): Promise<boolean>;
}
