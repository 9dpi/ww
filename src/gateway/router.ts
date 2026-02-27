import { ClientConnection, ChatMessage } from '../shared/types';
import { Logger } from '../shared/logger';
import { SessionManager } from './session';
import { AgentManager } from '../agent/manager';
import crypto from 'crypto';

export class MessageRouter {
    private agentManager = AgentManager.getInstance();

    constructor(private sessionManager: SessionManager) { }

    handleMessage(sessionId: string, rawMessage: string) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
            Logger.error(`Không tìm thấy session: ${sessionId}`);
            return;
        }

        try {
            const message = JSON.parse(rawMessage);
            Logger.info(`⬇️ Nhận message từ ${sessionId}`, { type: message.type });

            if (message.type === 'chat') {
                this.routeChatMessage(message as ChatMessage, session);
            } else {
                Logger.warn(`⚠️ Loại message chưa xử lý sâu: ${message.type}`);
                // Session tools logic or system commands can be matched here later
            }
        } catch (e) {
            Logger.error(`Lỗi parse message JSON từ ${sessionId}`, e);
            session.socket.send(JSON.stringify({ type: 'error', message: 'Hệ thống Gateway: Invalid JSON format' }));
        }
    }

    private async routeChatMessage(msg: ChatMessage, senderSession: ClientConnection) {
        Logger.info(`Cầu nối Message Router >>> Agent System`);

        // Mặc định gọi đến agent 'main'. (Sẽ hỗ trợ agent routing nếu thêm ở cấu hình dmPolicy)
        const agent = this.agentManager.getAgent('main');
        if (!agent) {
            senderSession.socket.send(JSON.stringify({ type: 'error', message: 'Core Error: Agent hệ thống chưa sẵn sàng!' }));
            return;
        }

        await agent.processMessage(senderSession.id, msg.content, senderSession);
    }
}
