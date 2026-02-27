import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { IChannelAdapter } from '../adapter';
import { Logger } from '../../shared/logger';
import { OpenClawConfig } from '../../shared/types';

export class WhatsAppAdapter implements IChannelAdapter {
    id = 'whatsapp';
    name = 'WhatsApp Bot';
    private sock: ReturnType<typeof makeWASocket> | null = null;
    private allowList: string[];
    private sessionDir: string;

    onMessageReceived: (message: any) => void = () => { };

    constructor(config: OpenClawConfig) {
        this.allowList = config.channels?.whatsapp?.allowFrom || ["84912580018"];

        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const rawPath = config.channels?.whatsapp?.sessionPath || "~/.openclaw/whatsapp-session";
        this.sessionDir = rawPath.startsWith('~')
            ? path.join(homeDir, rawPath.slice(1))
            : rawPath;
    }

    async start(): Promise<void> {
        Logger.info(`[WhatsApp] Đang khởi động tài khoản liên kết...`);

        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: true, // Nếu chưa đăng nhập sẽ print QRCode ra log!
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                Logger.info('📱 [WhatsApp] Mở App WhatsApp trên điện thoại và QUÉT MÃ QR BÊN TRÊN để đăng nhập!');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                Logger.warn(`[WhatsApp] Đã ngắt kết nối. Có kết nối lại không? ${shouldReconnect}`);
                if (shouldReconnect) {
                    this.start();
                } else {
                    Logger.error(`[WhatsApp] Người dùng đã LOG OUT trên điện thoại. Xoá thư mục session tại ${this.sessionDir} để kết nối lại từ đầu.`);
                }
            } else if (connection === 'open') {
                Logger.info('✅ [WhatsApp] Đã MỞ KẾT NỐI an toàn. Mọi người có thể gửi tin.');
            }
        });

        this.sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.message || msg.key.fromMe) continue;

                    const remoteJid = msg.key.remoteJid || '';

                    // Trích xuất văn bản từ nhiều định dạng message của WA (extended/text/...)
                    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                    if (!body) continue;

                    // Kiểm tra logic theo whitelist số ĐT (+84912580018)
                    const phoneNumberStr = remoteJid.split('@')[0];

                    if (!this.allowList.includes(phoneNumberStr) && !this.allowList.includes('*')) {
                        Logger.info(`[WhatsApp] Chặn tin nhắn từ người dùng ngoài Whitelist: ${phoneNumberStr}`);
                        // (Tuỳ chọn: Reply Pairing Code ở đây)
                        continue;
                    }

                    Logger.info(`[WhatsApp] Có tin nhắn SMS từ: ${phoneNumberStr}`);
                    this.onMessageReceived({
                        channelId: remoteJid,  // Địa chỉ hộp thoại của người gửi để gọi lại
                        senderId: phoneNumberStr,
                        content: body,
                        platform: 'whatsapp'
                    });
                }
            }
        });
    }

    async stop(): Promise<void> {
        if (this.sock) {
            this.sock.end(undefined);
            Logger.info(`🛑 [WhatsApp] Đã đóng liên kết Socket an toàn.`);
        }
    }

    async sendMessage(recipientId: string, content: string): Promise<boolean> {
        try {
            if (!this.sock) return false;
            await this.sock.sendMessage(recipientId, { text: content });
            return true;
        } catch (e) {
            Logger.error(`[WhatsApp] Gửi phản hồi lỗi với ${recipientId}`, e);
            return false;
        }
    }
}
