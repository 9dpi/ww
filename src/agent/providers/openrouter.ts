import OpenAI from 'openai';
import { AIMessage, IModelProvider, ModelResponse } from '../types';
import { Logger } from '../../shared/logger';
import { ToolRegistry } from '../../tools/registry';
import { SmartRouter } from './smart-router';

export class OpenRouterProvider implements IModelProvider {
    name = 'OpenRouter';
    private client: OpenAI;
    private modelId: string;
    private smartMode: boolean;
    private maxRetries = 5;

    constructor(apiKey: string, modelId: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://github.com/9dpi/OpenClaw',
                'X-Title': 'OpenClaw Agent',
            }
        });
        this.modelId = modelId;
        this.smartMode = !modelId || modelId === 'auto';
    }

    async generateResponse(messages: AIMessage[], systemPrompt?: string): Promise<ModelResponse> {
        let currentModel = this.modelId;
        let lastError = '';

        if (this.smartMode) {
            const smartModel = await SmartRouter.getNextAvailableModel();
            if (smartModel) {
                currentModel = smartModel;
                Logger.info(`\u{1F9E0} [SmartRouter] T\u1EF1 \u0111\u1ED9ng ch\u1ECDn model: ${currentModel}`);
            } else {
                return { content: '', error: 'SmartRouter: Kh\u00F4ng t\u00ECm th\u1EA5y model mi\u1EC5n ph\u00ED n\u00E0o kh\u1EA3 d\u1EE5ng.' };
            }
        }

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                // Smart mode: KHONG gui tools (model mien phi thuong khong ho tro)
                const result = await this.callModel(currentModel, messages, systemPrompt, !this.smartMode);
                return result;
            } catch (error: any) {
                const statusCode = error?.status || error?.statusCode || 0;
                lastError = error.message || 'Unknown error';

                Logger.warn(`[OpenRouter] Loi ${statusCode} voi model [${currentModel}]: ${lastError}`);

                // Neu loi do tool use khong duoc ho tro, thu lai KHONG CO tools
                if (statusCode === 404 && lastError.includes('tool')) {
                    Logger.info(`[SmartRouter] Thu lai [${currentModel}] khong co Tools...`);
                    try {
                        const result = await this.callModel(currentModel, messages, systemPrompt, false);
                        return result;
                    } catch (e2: any) {
                        Logger.warn(`[OpenRouter] Van loi khi bo tools: ${e2.message}`);
                    }
                }

                // Loi 429/402/5xx/404 -> chuyen model
                if (statusCode === 429 || statusCode === 402 || statusCode >= 500 || statusCode === 404 || statusCode === 400) {
                    SmartRouter.markModelFailed(currentModel);
                    const nextModel = await SmartRouter.getNextAvailableModel();
                    if (nextModel && nextModel !== currentModel) {
                        Logger.info(`[SmartRouter] Tu dong chuyen sang: ${nextModel} (Thu lan ${attempt + 2}/${this.maxRetries})`);
                        currentModel = nextModel;
                        continue;
                    }
                }
                break;
            }
        }

        return { content: '', error: `OpenRouter loi sau ${this.maxRetries} lan thu: ${lastError}` };
    }

    private async callModel(modelId: string, messages: AIMessage[], systemPrompt?: string, useTools: boolean = true): Promise<ModelResponse> {
        const gptMessages: any[] = [];

        if (systemPrompt) gptMessages.push({ role: 'system', content: systemPrompt });
        messages.forEach(m => gptMessages.push({ role: m.role, content: m.content }));

        const payload: any = {
            model: modelId,
            messages: gptMessages,
        };

        // Chi gui tools neu duoc phep (model tra phi hoac khong phai smartMode)
        if (useTools) {
            const toolRegistry = ToolRegistry.getInstance();
            const tools = toolRegistry.getAllDefinitions();
            if (tools.length > 0) payload.tools = tools;
        }

        const response = await this.client.chat.completions.create(payload);
        const message = response.choices[0].message;

        // Xu ly Tool Calling
        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolRegistry = ToolRegistry.getInstance();
            Logger.info(`[OpenRouter/${modelId}] AI kich hoat ${message.tool_calls.length} Tools...`);
            let responseContent = 'Toi da thuc hien cac lenh. Ket qua:\n';

            for (const callRaw of message.tool_calls) {
                const call: any = callRaw;
                const args = JSON.parse(call.function.arguments);
                try {
                    const toolResult = await toolRegistry.executeTool(call.function.name, args);
                    responseContent += `- ${call.function.name}: Thanh cong: ${JSON.stringify(toolResult)}\n`;
                } catch (err: any) {
                    responseContent += `- ${call.function.name}: Loi: ${err.message}\n`;
                }
            }
            return {
                content: responseContent,
                usage: { prompt_tokens: response.usage?.prompt_tokens || 0, completion_tokens: response.usage?.completion_tokens || 0 }
            };
        }

        return {
            content: message.content || '',
            usage: {
                prompt_tokens: response.usage?.prompt_tokens || 0,
                completion_tokens: response.usage?.completion_tokens || 0
            }
        };
    }
}
