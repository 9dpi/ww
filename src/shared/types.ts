import { WebSocket } from 'ws';

export interface BaseMessage {
    id: string;
    type: 'chat' | 'system' | 'tool' | 'error' | 'echo';
    timestamp: number;
}

export interface ChatMessage extends BaseMessage {
    type: 'chat';
    channelId: string;
    senderId: string;
    content: string;
    replyTo?: string;
}

export interface ClientConnection {
    id: string; // Session ID
    socket: WebSocket;
    type: 'channel' | 'agent' | 'app' | 'cli';
    connectedAt: number;
    lastPing: number;
    status: 'active' | 'inactive';
}

export interface OpenClawConfig {
    gateway: {
        port: number;
        bind: string;
        tailscale?: {
            mode: 'off' | 'serve' | 'funnel';
        };
    };
    agent: {
        model: string;
        workspace: string;
    };
    models?: {
        anthropic?: { apiKey: string };
        openai?: { apiKey: string };
        deepseek?: { apiKey: string };
        openrouter?: { apiKey: string };
    };
    channels?: {
        discord?: {
            enabled: boolean;
            botToken: string;
            allowFrom: string[]; // Email người dùng
        };
        whatsapp?: {
            enabled: boolean;
            sessionPath: string;
            allowFrom: string[]; // Số điện thoại
        };
    };
}
