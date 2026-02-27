import fs from 'fs';
import path from 'path';
import { Logger } from '../shared/logger';

export class WorkspaceLoader {
    static getSystemPrompt(workspacePathStr: string): string {
        // Xử lý dấu ~ (nếu dùng thư mục thư mục nhà người dùng)
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const resolvedPath = workspacePathStr.startsWith('~')
            ? path.join(homeDir, workspacePathStr.slice(1))
            : workspacePathStr;

        const soulPath = path.join(resolvedPath, 'SOUL.md');

        // Nếu thư mục không có SOUL.md, tạo file mặc định
        if (!fs.existsSync(resolvedPath)) {
            fs.mkdirSync(resolvedPath, { recursive: true });
        }

        if (!fs.existsSync(soulPath)) {
            const defaultPrompt = `# SOUL\n\nBạn là 3G AI, một trợ lý AI phân tích dữ liệu và điều hành tối ưu. Trả lời ngắn gọn, súc tích và chính xác.`;
            fs.writeFileSync(soulPath, defaultPrompt, 'utf8');
            Logger.info(`Đã tạo profile mặc định SOUL.md tại ${soulPath}`);
            return defaultPrompt;
        }

        try {
            return fs.readFileSync(soulPath, 'utf8');
        } catch (e) {
            Logger.error(`Lỗi đọc SOUL.md tại ${soulPath}`, e);
            return "Bạn là trợ lý AI hữu ích.";
        }
    }
}
