import { IModelProvider, AgentConfig } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { DeepSeekProvider } from './providers/deepseek';
import { OpenRouterProvider } from './providers/openrouter';
import { ContextManager } from './context';
import { WorkspaceLoader } from '../workspace/loader';
import { Logger } from '../shared/logger';
import { ClientConnection } from '../shared/types';
import crypto from 'crypto';

export class Agent {
    private provider: IModelProvider | null = null;
    private contextManager = new ContextManager();
    private systemPrompt: string = '';

    constructor(private config: AgentConfig, private modelKeys: Record<string, any>) {
        this.initProvider();
        this.systemPrompt = WorkspaceLoader.getSystemPrompt(this.config.workspace);
        Logger.info(`Agent [${this.config.name}] nạp xong SOUL: ${this.systemPrompt.substring(0, 50)}...`);
    }

    private initProvider() {
        const [providerName, modelId] = this.config.model.split('/');

        if (providerName.toLowerCase() === 'openai') {
            const key = this.modelKeys?.openai?.apiKey;
            if (!key) { Logger.warn(`Chưa cấu hình API Key cho OpenAI!`); }
            this.provider = new OpenAIProvider(key || '', modelId);
        }
        else if (providerName.toLowerCase() === 'anthropic') {
            const key = this.modelKeys?.anthropic?.apiKey;
            if (!key) { Logger.warn(`Chưa cấu hình API Key cho Anthropic!`); }
            this.provider = new AnthropicProvider(key || '', modelId);
        }
        else if (providerName.toLowerCase() === 'deepseek') {
            const key = this.modelKeys?.deepseek?.apiKey;
            if (!key) { Logger.warn(`Chưa cấu hình API Key cho DeepSeek!`); }
            this.provider = new DeepSeekProvider(key || '', modelId || 'deepseek-chat');
        }
        else if (providerName.toLowerCase() === 'openrouter') {
            const key = this.modelKeys?.openrouter?.apiKey;
            if (!key) { Logger.warn(`Chưa cấu hình API Key cho OpenRouter!`); }
            // Lưu ý: với OpenRouter, modelId có dạng "anthropic/claude-3.5-sonnet", nên ta cần format lại
            // Ví dụ user config agent.model: "openrouter/google/gemini-2.5-flash"
            // -> modelId là "google/gemini-2.5-flash"
            const orModelId = this.config.model.replace('openrouter/', '');
            this.provider = new OpenRouterProvider(key || '', orModelId);
        }
        else {
            Logger.error(`Provider [${providerName}] chưa được hỗ trợ.`);
        }
    }

    async processMessage(sessionId: string, userMessage: string, senderSession: ClientConnection) {
        if (!this.provider) {
            this.sendError(senderSession, "Lỗi Agent: Model Provider chưa được cấu hình. Hãy kiểm tra openclaw.json.");
            return;
        }

        try {
            // 1. Thêm tin nhắn vào bộ nhớ Context
            this.contextManager.addMessage(sessionId, 'user', userMessage);
            const history = this.contextManager.getHistory(sessionId);

            Logger.info(`🧠 [Agent ${this.config.name}] đang xử lý tin nhắn dài ${userMessage.length} kí tự...`);

            // 2. Gửi cho AI Model
            const aiResponse = await this.provider.generateResponse(history, this.systemPrompt);

            if (aiResponse.error) {
                this.sendError(senderSession, `Lỗi khởi tạo API: ${aiResponse.error}`);
                return;
            }

            // 3. Ghi nhớ kết quả AI vào context
            this.contextManager.addMessage(sessionId, 'assistant', aiResponse.content);

            // 4. Phản hồi lại Gateway Session
            Logger.info(`[Agent ${this.config.name}] Phản hồi dài ${aiResponse.content.length} kí tự. 🪙 Usage: ${aiResponse.usage?.prompt_tokens} prompt / ${aiResponse.usage?.completion_tokens} completion`);

            const responseMsg = {
                id: crypto.randomUUID(),
                type: 'chat',
                channelId: (userMessage as any).channelId || "internal", // Phase 3 router fix
                senderId: `agent-${this.config.name}`,
                content: aiResponse.content,
                timestamp: Date.now()
            };

            // Đính kèm metadata để Node biết trả lời platform nào
            if ((userMessage as any)._originAdapter) {
                (responseMsg as any)._originAdapter = (userMessage as any)._originAdapter;
            }

            senderSession.socket.send(JSON.stringify(responseMsg));

        } catch (e: any) {
            Logger.error(`Lỗi Runtime Agent [${this.config.name}]`, e);
            this.sendError(senderSession, "Lỗi hệ thống Agent: Core Crash.");
        }
    }

    private sendError(senderSession: ClientConnection, reason: string) {
        senderSession.socket.send(JSON.stringify({
            id: crypto.randomUUID(),
            type: 'error',
            senderId: `agent-${this.config.name}`,
            content: reason,
            timestamp: Date.now()
        }));
    }
}
