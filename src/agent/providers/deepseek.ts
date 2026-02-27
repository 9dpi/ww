import OpenAI from 'openai';
import { AIMessage, IModelProvider, ModelResponse } from '../types';
import { Logger } from '../../shared/logger';
import { ToolRegistry } from '../../tools/registry';

export class DeepSeekProvider implements IModelProvider {
    name = 'DeepSeek';
    private client: OpenAI;
    private modelId: string;

    constructor(apiKey: string, modelId: string) {
        // DeepSeek tương thích chuẩn OpenAI 100%, ta chỉ cần chuyển hướng BaseURL
        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://api.deepseek.com'
        });
        // Các model phổ biến: deepseek-chat, deepseek-reasoner
        this.modelId = modelId || 'deepseek-chat';
    }

    async generateResponse(messages: AIMessage[], systemPrompt?: string): Promise<ModelResponse> {
        try {
            const gptMessages: any[] = [];
            const toolRegistry = ToolRegistry.getInstance();
            const tools = toolRegistry.getAllDefinitions();

            if (systemPrompt) gptMessages.push({ role: 'system', content: systemPrompt });

            messages.forEach(m => gptMessages.push({ role: m.role, content: m.content }));

            const payload: any = {
                model: this.modelId,
                messages: gptMessages,
            };

            // DeepSeek-Chat cũng hỗ trợ Tool Calling (Functions)
            if (tools.length > 0) payload.tools = tools;

            const response = await this.client.chat.completions.create(payload);

            const message = response.choices[0].message;

            // Xử lý Function Calling cho DeepSeek giống hệt OpenAI
            if (message.tool_calls && message.tool_calls.length > 0) {
                Logger.info(`[🌟 DeepSeek] AI yêu cầu sử dụng ${message.tool_calls.length} Tools...`);
                let responseContent = 'Tôi đã thực hiện các lệnh. Kết quả:\n';

                for (const callRaw of message.tool_calls) {
                    const call: any = callRaw;
                    const args = JSON.parse(call.function.arguments);
                    try {
                        const toolResult = await toolRegistry.executeTool(call.function.name, args);
                        responseContent += `- ${call.function.name}: Xuất sắc: ${JSON.stringify(toolResult)}\n`;
                    } catch (err: any) {
                        responseContent += `- ${call.function.name}: Lỗi: ${err.message}\n`;
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
        } catch (error: any) {
            Logger.error('Lỗi khi gọi API DeepSeek', error);
            return { content: '', error: error.message || 'Lỗi kết nối API DeepSeek' };
        }
    }
}
