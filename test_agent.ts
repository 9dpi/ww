import { GatewayServer } from './src/gateway/server';
import WebSocket from 'ws';

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest2() {
    const server = new GatewayServer();
    server.start();

    console.log('⏳ Đang chờ Gateway khởi động và nạp SOUL (1s)...');
    await delay(1000);

    const ws = new WebSocket('ws://127.0.0.1:18789/?type=channel');

    ws.on('open', () => {
        console.log('✅ Client (Channel) kết nối thành công!');

        const msg = {
            id: "test-ph2-1",
            type: "chat",
            channelId: "telegram-test-id",
            senderId: "tester",
            content: "Bạn là ai? Thử trả lời xem!",
            timestamp: Date.now()
        };

        console.log('⬆️ Channel gửi message:', JSON.stringify(msg));
        ws.send(JSON.stringify(msg));
    });

    ws.on('message', (data) => {
        console.log('⬇️ Có dữ liệu gửi về Client:', data.toString());

        try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === 'error' && parsed.senderId === 'agent-main') {
                console.log('🎉 Audit E2.6 Đạt! (Hệ thống báo lỗi Agent thiếu API Key thay vì sập toàn Gateway hoặc trả Echo)');
                ws.close();
            }
        } catch (e) { }
    });

    ws.on('error', console.error);
    ws.on('close', () => {
        console.log('🛑 Client ngắt kết nối an toàn.');
        server.stop();
        process.exit(0);
    });
}

runTest2();
