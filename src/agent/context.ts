import { AIMessage } from './types';

export class ContextManager {
    private history: Map<string, AIMessage[]> = new Map();
    private maxHistoryLength = 20; // Giới hạn window trượt (sliding window)

    getHistory(sessionId: string): AIMessage[] {
        if (!this.history.has(sessionId)) {
            this.history.set(sessionId, []);
        }
        return this.history.get(sessionId)!;
    }

    addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
        const sessionHistory = this.getHistory(sessionId);
        sessionHistory.push({ role, content });

        // Cắt bớt lịch sử nếu quá dài
        if (sessionHistory.length > this.maxHistoryLength) {
            // Bỏ các tin nhắn cũ, giữ lại tin nhắn mới nhất
            sessionHistory.splice(0, sessionHistory.length - this.maxHistoryLength);
        }
    }

    clearHistory(sessionId: string) {
        this.history.delete(sessionId);
    }
}
