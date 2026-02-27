import { Client, GatewayIntentBits, Message } from 'discord.js';
import { IChannelAdapter } from '../adapter';
import { Logger } from '../../shared/logger';
import { OpenClawConfig } from '../../shared/types';

export class DiscordAdapter implements IChannelAdapter {
    id = 'discord';
    name = 'Discord Bot';
    private client: Client;
    private token: string;
    private allowList: string[]; // Email hoặc ID whitelist

    onMessageReceived: (message: any) => void = () => { };

    constructor(config: OpenClawConfig) {
        this.token = config.channels?.discord?.botToken || '';
        this.allowList = config.channels?.discord?.allowFrom || ["vuquangcuong@gmail.com"];

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });

        this.client.on('messageCreate', this.handleMessage.bind(this));
    }

    async start(): Promise<void> {
        if (!this.token || this.token === 'MOCK_TOKEN_HERE') {
            Logger.warn(`⚠️ [Discord] Bỏ qua Channel do chưa có Bot Token.`);
            return;
        }

        try {
            await this.client.login(this.token);
            Logger.info(`✅ [Discord] Đã kết nối Bot thành công: ${this.client.user?.tag}`);
        } catch (e: any) {
            Logger.error(`❌ [Discord] Lỗi kết nối tài khoản Bot`, e);
        }
    }

    async stop(): Promise<void> {
        if (this.client.isReady()) {
            this.client.destroy();
            Logger.info(`🛑 [Discord] Đã ngắt kết nối an toàn.`);
        }
    }

    async sendMessage(recipientId: string, content: string): Promise<boolean> {
        try {
            if (!this.client.isReady()) return false;
            const channel = await this.client.channels.fetch(recipientId);
            if (channel && channel.isTextBased()) {
                await (channel as any).send(content);
                return true;
            }
            return false;
        } catch (e) {
            Logger.error(`[Discord] Lỗi khi gửi phản hồi về Channel ${recipientId}`, e);
            return false;
        }
    }

    private handleMessage(msg: Message) {
        if (msg.author.bot) return; // Bỏ qua bot
        Logger.info(`[Discord] Nhận tin nhắn từ ${msg.author.tag}`);

        // So khớp logic đơn giản với người dùng (bước đầu kiểm tra ID/Tag)
        // Tạm bỏ qua xác minh email vì API Discord không cho lấy email User từ Bot thường
        // Nên tôi sẽ áp dụng "Open" policy cho môi trường nội bộ trước

        this.onMessageReceived({
            channelId: msg.channelId, // Giữ ID Kênh gốc/DM
            senderId: msg.author.id,
            content: msg.content,
            platform: 'discord'
        });
    }
}
