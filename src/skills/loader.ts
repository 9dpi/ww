import fs from 'fs';
import path from 'path';
import { Logger } from '../shared/logger';
import { ConfigManager } from '../gateway/config';
import { ToolRegistry } from '../tools/registry';
import { ITool } from '../tools/tool';

export class SkillLoader {
    static loadAll() {
        Logger.info(`[SkillLoader] Đang tìm kiếm Plugin Skill / Tool mới...`);
        const config = ConfigManager.loadConfig();

        const workspace = config.agent.workspace.startsWith('~')
            ? path.join(process.env.HOME || process.env.USERPROFILE || '', config.agent.workspace.slice(1))
            : config.agent.workspace;

        const skillsDir = path.join(workspace, 'skills');

        if (!fs.existsSync(skillsDir)) {
            fs.mkdirSync(skillsDir, { recursive: true });
            Logger.info(`Đã tạo thư mục chứa Kỹ năng Custom tại: ${skillsDir}`);
            return;
        }

        const skillFolders = fs.readdirSync(skillsDir).filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
        for (const folder of skillFolders) {
            const skillFile = path.join(skillsDir, folder, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
                this.parseSkillFile(skillFile, folder);
            }
        }
    }

    private static parseSkillFile(filePath: string, skillName: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Sandbox: Parse đoạn mã JSON Tools nhúng trong SKILL.md
            const jsonMatch = content.match(/```(?:json|javascript)\n([\s\S]*?)\n```/);

            if (jsonMatch && jsonMatch[1]) {
                const toolDef = JSON.parse(jsonMatch[1]);

                // Thêm Tool Custom vào Registry (Nhờ AI gọi tự động qua Webhook nội suy)
                // Việc thiết lập Custom Action này sẽ chỉ đóng vai trò chèn Prompt và Definition
                // Core Webhook/Scripts của SKILL sẽ do file JS bổ sung (hoặc API trung gian) sau.
                // Đây là dạng Mô Phỏng Phase 4.
                if (toolDef.type === 'function' && toolDef.function) {
                    const mTool: ITool = {
                        name: toolDef.function.name,
                        description: toolDef.function.description,
                        parameters: toolDef.function.parameters,
                        execute: async (args: any) => {
                            // Custom Skill Action - Default log
                            Logger.info(`🛠️ [Skill ${skillName}] Kích hoạt Custom Tool: ${toolDef.function.name}`);
                            return { success: true, note: `Custom skill [${skillName}] đã chạy thành công qua Loader. Hệ thống thu được args:`, received: args };
                        }
                    };

                    ToolRegistry.getInstance().registerTool(mTool);
                }
            }
        } catch (e) {
            Logger.error(`Lỗi phân tích SKILL.md tại ${filePath}`, e);
        }
    }
}
