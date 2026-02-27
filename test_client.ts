import { GatewayServer } from './src/gateway/server';
import WebSocket from 'ws';

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    const server = new GatewayServer();
    server.start();

    console.log('⏳ Đang chờ Gateway khởi động (1s)...');
    await delay(1000);

    console.log('🔌 Đang kết nối tới ws://127.0.0.1:18789/?type=channel');
    const ws = new WebSocket('ws://127.0.0.1:18789/?type=channel');

    ws.on('open', () => {
        console.log('✅ Kết nối WebSocket thành công!');

        const msg = {
            id: "test-123",
            type: "chat",
            channelId: "webchat-test",
            senderId: "tester",
            content: "Xin chào thế giới!",
            timestamp: Date.now()
        };

        console.log('⬆️ Gửi message:', JSON.stringify(msg));
        ws.send(JSON.stringify(msg));
    });

    ws.on('message', (data) => {
        console.log('⬇️ Nhận được dữ liệu phản hồi:', data.toString());

        try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === 'chat' && parsed.content.includes("Gateway Echo")) {
                console.log('🎉 Audit E2E Đạt! (Nhận được tin phản hồi từ Router/Gateway)');

                // Disconnect and test reconect logic essentially
                console.log('🔄 Đang kiểm tra ngắt kết nối an toàn...');
                ws.close();
            }
        } catch (e) { }
    });

    ws.on('error', console.error);
    ws.on('close', () => {
        console.log('🛑 Hệ thống đóng kết nối với client.');
        server.stop();
        process.exit(0);
    });
}

runTest();
