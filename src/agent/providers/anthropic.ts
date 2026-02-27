import Anthropic from '@anthropic-ai/sdk';
import { AIMessage, IModelProvider, ModelResponse } from '../types';
import { Logger } from '../../shared/logger';
import { ToolRegistry } from '../../tools/registry';

export class AnthropicProvider implements IModelProvider {
    name = 'Anthropic';
    private client: Anthropic;
    private modelId: string;

    constructor(apiKey: string, modelId: string) {
        this.client = new Anthropic({ apiKey });
        this.modelId = modelId;
    }

    async generateResponse(messages: AIMessage[], systemPrompt?: string): Promise<ModelResponse> {
        try {
            const anthropicMessages = messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

            const toolRegistry = ToolRegistry.getInstance();
            const genericTools = toolRegistry.getAllDefinitions();

            // Chuyển đổi chuẩn OpenAPI (dùng cho OpenAI) sang chuẩn JSONSchema nội bộ của Anthropic
            const anthropicTools: Anthropic.Tool[] = genericTools.map(t => ({
                name: t.function.name,
                description: t.function.description,
                input_schema: t.function.parameters as Anthropic.Tool.InputSchema
            }));

            const payload: Anthropic.MessageCreateParamsNonStreaming = {
                model: this.modelId,
                max_tokens: 4096,
                messages: anthropicMessages
            };

            if (systemPrompt) payload.system = systemPrompt;
            if (anthropicTools.length > 0) payload.tools = anthropicTools;

            const response = await this.client.messages.create(payload);

            // Xử lí Tools: Anthropic đính tool_use vào Content thay vì object rời như OpenAI
            const toolUses = response.content.filter(block => block.type === 'tool_use') as Anthropic.ToolUseBlock[];
            if (toolUses.length > 0) {
                Logger.info(`[Anthropic] AI quyết định kích hoạt ${toolUses.length} Tools...`);
                let responseContent = `Đây là kết quả tự động chạy Tools của tôi:\n`;

                for (const tool of toolUses) {
                    try {
                        const toolResult = await toolRegistry.executeTool(tool.name, tool.input);
                        responseContent += `- ${tool.name}: ✅ Thành công: ${JSON.stringify(toolResult)}\n`;
                    } catch (e: any) {
                        responseContent += `- ${tool.name}: ❌ Lỗi: ${e.message}\n`;
                    }
                }

                return {
                    content: responseContent,
                    usage: { prompt_tokens: response.usage.input_tokens, completion_tokens: response.usage.output_tokens }
                };
            }

            // Mặc định Text bình thường
            const textBlock = response.content.find(b => b.type === 'text');
            return {
                content: textBlock ? (textBlock as any).text : '',
                usage: {
                    prompt_tokens: response.usage.input_tokens,
                    completion_tokens: response.usage.output_tokens
                }
            };
        } catch (error: any) {
            Logger.error('Lỗi khi gọi API Anthropic', error);
            return {
                content: '',
                error: error.message || 'Lỗi kết nối API Anthropic'
            };
        }
    }
}
