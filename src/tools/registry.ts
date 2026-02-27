import { ITool } from './tool';
import { Logger } from '../shared/logger';

export class ToolRegistry {
    private static instance: ToolRegistry;
    private tools: Map<string, ITool> = new Map();

    private constructor() { }

    static getInstance(): ToolRegistry {
        if (!this.instance) {
            this.instance = new ToolRegistry();
        }
        return this.instance;
    }

    registerTool(tool: ITool) {
        if (this.tools.has(tool.name)) {
            Logger.warn(`[Tool] Đang ghi đè công cụ đã tồn tại: ${tool.name}`);
        }
        this.tools.set(tool.name, tool);
        Logger.info(`🧩 [Tool] Đăng ký công cụ thành công: ${tool.name}`);
    }

    getTool(name: string): ITool | undefined {
        return this.tools.get(name);
    }

    getAllDefinitions(): any[] {
        return Array.from(this.tools.values()).map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        }));
    }

    async executeTool(name: string, args: any): Promise<any> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Công cụ [${name}] không có sẵn (Không được hỗ trợ/Chưa đăng ký)`);
        }

        try {
            const result = await tool.execute(args);
            return result;
        } catch (e: any) {
            Logger.error(`[Tool] Lỗi thực thi công cụ [${name}]`, e);
            throw new Error(`Lỗi nội bộ công cụ: ${e.message}`);
        }
    }
}
