import { WebSocket } from 'ws';
import { ClientConnection } from '../shared/types';
import { Logger } from '../shared/logger';
import crypto from 'crypto';

export class SessionManager {
    private sessions: Map<string, ClientConnection> = new Map();

    createSession(socket: WebSocket, type: ClientConnection['type']): string {
        const id = crypto.randomUUID();
        const conn: ClientConnection = {
            id,
            socket,
            type,
            connectedAt: Date.now(),
            lastPing: Date.now(),
            status: 'active'
        };

        this.sessions.set(id, conn);
        Logger.info(`🆕 Tạo session mới: ${id} [${type}]`);
        return id;
    }

    getSession(id: string): ClientConnection | undefined {
        return this.sessions.get(id);
    }

    removeSession(id: string) {
        const session = this.sessions.get(id);
        if (session) {
            session.status = 'inactive';
            this.sessions.delete(id);
            Logger.info(`❌ Đã ngắt session: ${id}`);
        }
    }

    getAllSessions(): ClientConnection[] {
        return Array.from(this.sessions.values());
    }
}
