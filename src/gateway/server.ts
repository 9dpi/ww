import { WebSocketServer, WebSocket } from 'ws';
import { ConfigManager } from './config';
import { SessionManager } from './session';
import { MessageRouter } from './router';
import { Logger } from '../shared/logger';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export class GatewayServer {
    private wss: WebSocketServer | null = null;
    private httpServer: http.Server | null = null;
    private sessionManager = new SessionManager();
    private router = new MessageRouter(this.sessionManager);

    start() {
        Logger.init();
        Logger.info('Bắt đầu khởi động Gateway Server...');
        const config = ConfigManager.loadConfig();
        const port = config.gateway.port || 18789;
        const host = config.gateway.bind || '127.0.0.1';

        // 1. Tạo HTTP Server để phục vụ giao diện tĩnh (Control UI) ở thư mục public
        this.httpServer = http.createServer((req, res) => {
            const publicDir = path.join(process.cwd(), 'public');
            let filePath = req.url === '/' ? 'index.html' : req.url;
            if (filePath && filePath.startsWith('/')) filePath = filePath.substring(1);

            // Xóa query string (nếu có)
            filePath = filePath?.split('?')[0] || '';
            const extname = String(path.extname(filePath)).toLowerCase();

            const mimeTypes: { [key: string]: string } = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.png': 'image/png',
                '.svg': 'image/svg+xml'
            };

            const contentType = mimeTypes[extname] || 'application/octet-stream';
            const absolutePath = path.join(publicDir, filePath);

            fs.readFile(absolutePath, (error, content) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1 style="color:white; font-family:sans-serif;">404 - Control UI Not Found. Please run `mkdir public` and add UI files.</h1>', 'utf-8');
                    } else {
                        res.writeHead(500);
                        res.end('Server Error: ' + error.code + ' ..\n');
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        });

        // 2. Tích hợp WebSockets chạy chung 1 cổng với UI Dashboard Http Server
        this.wss = new WebSocketServer({ server: this.httpServer });

        this.wss.on('connection', (ws: WebSocket, req) => {
            let clientType: any = 'cli';
            try {
                const url = new URL(req.url || '/', `http://${host}:${port}`);
                clientType = url.searchParams.get('type') || 'cli';
            } catch (e) { }

            const sessionId = this.sessionManager.createSession(ws, clientType);

            ws.send(JSON.stringify({
                type: 'system',
                message: 'Welcome to 3G AI Gateway (Phase 5 - UI Connected)',
                sessionId
            }));

            ws.on('message', (message: Buffer) => {
                this.router.handleMessage(sessionId, message.toString('utf8'));
            });

            ws.on('close', () => {
                this.sessionManager.removeSession(sessionId);
            });

            ws.on('error', (err) => {
                Logger.error(`Lỗi kết nối WebSocket từ session ${sessionId}`, err);
            });
        });

        this.wss.on('error', (err) => {
            Logger.error('Lỗi sống còn trên WebSocket Server:', err);
        });

        // Chờ lắng nghe mọi kết nối HTTP và WebSocket
        this.httpServer.listen(port, host, () => {
            Logger.info(`✅ Web UI Control Dashboard đã sẵn sàng tại http://${host}:${port}`);
            Logger.info(`🔌 Kênh Socket API đang chờ kết nối tại ws://${host}:${port}`);
        });
    }

    stop() {
        if (this.wss) {
            Logger.info('Đang tắt Gateway Server WebSocket...');
            this.wss.close((err) => {
                if (err) Logger.error('Lỗi khi tắt Gateway Socket', err);
                else Logger.info('🛑 Socket Channel đã được tắt an toàn');
            });
        }
        if (this.httpServer) {
            this.httpServer.close(() => {
                Logger.info('🛑 HTTP Control UI đã dừng phục vụ');
                process.exit(0);
            });
        }
    }
}
