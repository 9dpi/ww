import fs from 'fs';
import path from 'path';
import { OpenClawConfig } from '../shared/types';
import { Logger } from '../shared/logger';

export class ConfigManager {
    private static homeDir = process.env.HOME || process.env.USERPROFILE || '';
    private static configPath = path.join(this.homeDir, '.openclaw', 'openclaw.json');

    static loadConfig(): OpenClawConfig {
        if (!fs.existsSync(this.configPath)) {
            Logger.warn(`Cấu hình không tồn tại tại ${this.configPath}. Bắt đầu khởi tạo thư mục và sử dụng mặc định.`);
            const defaultConfig = this.getDefaultConfig();
            this.saveConfig(defaultConfig);
            return defaultConfig;
        }
        try {
            const content = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(content) as OpenClawConfig;
        } catch (error) {
            Logger.error(`Lỗi khi đọc file cấu hình:`, error);
            return this.getDefaultConfig();
        }
    }

    static saveConfig(config: OpenClawConfig) {
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
        Logger.info(`Đã lưu cấu hình tại ${this.configPath}`);
    }

    private static getDefaultConfig(): OpenClawConfig {
        return {
            gateway: {
                port: 18789,
                bind: '127.0.0.1',
            },
            agent: {
                model: 'anthropic/claude-3-5-sonnet-20241022',
                workspace: '~/.openclaw/workspace'
            },
            models: {
                anthropic: { apiKey: '' },
                openai: { apiKey: '' },
                deepseek: { apiKey: '' },
                openrouter: { apiKey: '' }
            },
            channels: {
                discord: {
                    enabled: true,
                    botToken: "MOCK_TOKEN_HERE",
                    allowFrom: ["vuquangcuong@gmail.com"]
                },
                whatsapp: {
                    enabled: true,
                    sessionPath: "~/.openclaw/whatsapp-session",
                    allowFrom: ["84912580018"]
                }
            }
        };
    }
}
