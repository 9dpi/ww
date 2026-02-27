import { ITool } from '../tool';
import * as cron from 'node-cron';
import { Logger } from '../../shared/logger';

export class CronTool implements ITool {
    name = 'cron_scheduler';
    description = 'Lên lịch thưc thi tự động một chức năng/hành động tại thời điểm nhất định trong tương lai';
    parameters = {
        type: 'object',
        properties: {
            cronExpression: { type: 'string', description: 'Định dạng cron (Vd: "0 8 * * *" chạy lúc 8h sáng)' },
            actionDescription: { type: 'string', description: 'Mô tả rõ hành động cần chạy' }
        },
        required: ['cronExpression', 'actionDescription']
    };

    private static jobs: Map<string, cron.ScheduledTask> = new Map();

    async execute(args: { cronExpression: string, actionDescription: string }): Promise<any> {
        const { cronExpression, actionDescription } = args;

        if (!cron.validate(cronExpression)) {
            throw new Error(`Cron expression không hợp lệ: ${cronExpression} `);
        }

        const jobId = 'job_' + Date.now();
        const task = cron.schedule(cronExpression, () => {
            Logger.info(`⏰[CRON Dậy] Bắt đầu thực hiện hành động: ${actionDescription} `);
            // Thực hiện logic vòng lặp gọi lại Agent Gateway bằng Event (Sẽ làm ở Phase Mở rộng)
            // Ở đây ta báo Event ra Logger.
        });

        CronTool.jobs.set(jobId, task);

        return {
            success: true,
            id: jobId,
            message: `Đã cài lịch trình mới: Chạy lúc(${cronExpression}) để thực hiện: ${actionDescription} `
        };
    }
}
