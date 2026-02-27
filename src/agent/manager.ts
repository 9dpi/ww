import { Agent } from './agent';
import { ConfigManager } from '../gateway/config';
import { Logger } from '../shared/logger';
import { ToolRegistry } from '../tools/registry';
import { BrowserScreenshotTool, BrowserScrapeTool } from '../tools/browser';
import { CronTool } from '../tools/cron';
import { WebhookTool } from '../tools/webhook';
import { SkillLoader } from '../skills/loader';

export class AgentManager {
    private static instance: AgentManager;
    private agents: Map<string, Agent> = new Map();

    private constructor() {
        this.registerTools();
        this.initAgents();
    }

    static getInstance(): AgentManager {
        if (!this.instance) {
            this.instance = new AgentManager();
        }
        return this.instance;
    }

    private registerTools() {
        Logger.info('Đang nạp bộ sưu tập Tools...');
        const registry = ToolRegistry.getInstance();
        registry.registerTool(new BrowserScreenshotTool());
        registry.registerTool(new BrowserScrapeTool());
        registry.registerTool(new CronTool());
        registry.registerTool(new WebhookTool());

        // Thử động load các skill markdown
        SkillLoader.loadAll();
    }

    private initAgents() {
        Logger.info("Khởi động Agent Manager...");
        const config = ConfigManager.loadConfig();

        // Trong Phase 2, chúng ta tập trung vào "main" agent được mô tả trong json
        const mainAgentConfig = {
            name: 'main',
            model: config.agent.model,
            workspace: config.agent.workspace
        };

        const mainAgent = new Agent(mainAgentConfig, config.models || {});
        this.agents.set('main', mainAgent);
    }

    getAgent(name: string = 'main'): Agent | undefined {
        return this.agents.get(name);
    }
}
