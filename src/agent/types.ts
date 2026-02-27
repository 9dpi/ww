export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ModelResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
    };
    error?: string;
}

export interface IModelProvider {
    name: string;
    generateResponse(messages: AIMessage[], systemPrompt?: string): Promise<ModelResponse>;
}

export interface AgentConfig {
    name: string;
    model: string; // ex: "anthropic/claude-3-5-sonnet-20241022"
    workspace: string;
}
