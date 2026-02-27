import WebSocket from 'ws';
import { DiscordAdapter } from './discord';
import { WhatsAppAdapter } from './whatsapp';
import { IChannelAdapter } from './adapter';
import { OpenClawConfig, ChatMessage } from '../shared/types';
import { Logger } from '../shared/logger';
import { ConfigManager } from '../gateway/config';

export class ChannelNode {
    private ws: WebSocket | null = null;
    private adapters: Map<string, IChannelAdapter> = new Map();
    private config: OpenClawConfig;
    private GatewayUrl: string;

    constructor() {
        this.config = ConfigManager.loadConfig();
        const { bind, port } = this.config.gateway;
        this.GatewayUrl = `ws://${bind}:${port}/?type=channel`;
    }

    async start() {
        Logger.info(`[Channel Node] Chạy Adapter kết nối tới Gateway tại ${this.GatewayUrl}...`);
        this.connectGateway();

        // Init Adapters based on config
        if (this.config.channels?.discord?.enabled) {
            this.adapters.set('discord', new DiscordAdapter(this.config));
        }

        if (this.config.channels?.whatsapp?.enabled) {
            this.adapters.set('whatsapp', new WhatsAppAdapter(this.config));
        }

        // Khởi động vòng lặp kết nối và gắn Event Lắng nghe
        for (const [id, adapter] of this.adapters.entries()) {
            adapter.onMessageReceived = (msg: any) => this.forwardToGateway(id, msg);
            await adapter.start();
        }
    }

    private connectGateway() {
        this.ws = new WebSocket(this.GatewayUrl);

        this.ws.on('open', () => {
            Logger.info(`✅ [Channel Node] WebSocket đến Gateway Server đã Mở.`);
        });

        this.ws.on('message', (data) => {
            this.handleGatewayResponse(data.toString());
        });

        this.ws.on('close', () => {
            Logger.warn(`⚠️ [Channel Node] Mất kết nối tới Gateway. Thử lại sau 5s...`);
            setTimeout(() => this.connectGateway(), 5000);
        });

        this.ws.on('error', (err) => {
            Logger.error(`[Channel WS Lỗi]`, err);
        });
    }

    // Chuyển Message MỚI từ Adapter (Discord/WA) lên Gateway để AI phân tích
    private forwardToGateway(adapterId: string, originMsg: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {

            const payload: ChatMessage = {
                id: crypto.randomUUID(),
                type: 'chat',
                channelId: originMsg.channelId, // Nơi trả lời (Discord TextChat ID / WA RemoteJID)
                senderId: originMsg.senderId,
                content: originMsg.content,
                timestamp: Date.now()
            };

            Logger.info(`[>> GATEWAY] Đẩy tin nhắn của (${payload.senderId}) từ ${adapterId}...`);

            // Thêm flag metadata ẩn để biết Adapter nào cần gọi hàm SendReply sau
            (payload as any)._originAdapter = adapterId;

            this.ws.send(JSON.stringify(payload));
        } else {
            Logger.warn(`[Chuyển tiếp Lỗi] Gateway đang rớt mạng.`);
        }
    }

    // Nhận lệnh Reply (Phản hồi chéo hoặc Model Generate) ngược lại từ Gateway 
    private async handleGatewayResponse(rawStr: string) {
        try {
            const resp = JSON.parse(rawStr);
            // AI trả về thì response msg type='chat', content="..."
            // Nhưng channel nào? Ta phải xác định
            if (resp.type === 'chat' && resp._originAdapter) {
                const adapter = this.adapters.get(resp._originAdapter);
                if (adapter) {
                    Logger.info(`[<< GATEWAY] AI phản hồi qua ${resp._originAdapter}... Nội dung:`, resp.content.substring(0, 20) + '...');
                    await adapter.sendMessage(resp.channelId, resp.content);
                }
            }
            // Xử lý DM Policy Gateway Logic nếu Gateway trả pairing hoặc System Warning
            else if (resp.type === 'system' || resp.type === 'error') {
                Logger.warn(`[System Gateway]: ${resp.message || resp.content}`);
            }
        } catch (e) {
            Logger.error(`Lỗi phân tích lệnh từ Gateway.`, e);
        }
    }
}
