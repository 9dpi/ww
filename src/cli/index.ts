import { GatewayServer } from '../gateway/server';
import { Logger } from '../shared/logger';

const args = process.argv.slice(2);
const command = args[0] || 'start';

async function main() {
    if (command === 'gateway') {
        const action = args[1] || 'start';
        if (action === 'start') {
            const server = new GatewayServer();
            server.start();

            process.on('SIGINT', () => {
                Logger.info('Nhận tín hiệu SIGINT từ CLI. Tiến hành tắt server.');
                server.stop();
                process.exit(0);
            });
            process.on('SIGTERM', () => {
                Logger.info('Nhận tín hiệu SIGTERM. Tiến hành tắt server.');
                server.stop();
                process.exit(0);
            });
        } else {
            console.log(`Lệnh 'gateway ${action}' đang phát triển. Chỉ hỗ trợ 'gateway start' ở Phase 1 hiện tại.`);
        }
    } else if (command === 'channels') {
        console.log('📡 Đang thiết lập Các kênh tương tác nền tảng Chat (WhatsApp/Discord/...)');
        const { ChannelNode } = require('../channels/manager');
        const node = new ChannelNode();

        // Cần import crypto thủ công cho node 18/20 nếu tsx quên
        global.crypto = global.crypto || require('crypto').webcrypto || require('crypto');

        node.start().catch((e: Error) => {
            console.error('Core Crash Channel Nodes:', e);
            process.exit(1);
        });

    } else if (command === 'agent') {
        // 2.8 Agent CLI testing
        const messageFlagIndex = args.indexOf('--message');
        if (messageFlagIndex !== -1 && args[messageFlagIndex + 1]) {
            const messageStr = args[messageFlagIndex + 1];
            console.log(`[CLI] Đang đẩy tin nhắn trực tiếp vào nội bộ Agent: "${messageStr}"`);
            // Khởi tạo nhanh agent và inject input giả lập giống Message Router
            const { AgentManager } = require('../agent/manager');
            const agent = AgentManager.getInstance().getAgent('main');
            if (agent) {
                // Create mock session
                const mockSession = {
                    id: 'cli-terminal', socket: { send: (data: string) => console.log('\n[Agent Response]:', JSON.parse(data)) }
                };
                agent.processMessage('cli-terminal', messageStr, mockSession as any).then(() => process.exit(0));
            } else {
                console.error('[CLI] Lỗi: Agent "main" không tồn tại!');
                process.exit(1);
            }
        } else {
            console.log('Cú pháp: npm run start -- agent --message "Câu hỏi của bạn"');
        }
    } else {
        // Helper short command (npm run dev)
        if (command === 'start') {
            const server = new GatewayServer();
            server.start();
        } else {
            console.log(`OpenClaw CLI: Không nhận dạng được lệnh '${command}'`);
        }
    }
}

main().catch(err => {
    console.error("Lỗi crash CLI hệ thống:", err);
});
