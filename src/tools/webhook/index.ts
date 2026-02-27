import { ITool } from '../tool';
import axios from 'axios';

export class WebhookTool implements ITool {
    name = 'webhook_call';
    description = 'Gửi một yêu cầu HTTP GET/POST tới API ngoài (lấy thời tiết, IoT, trigger Zapier, Make)';
    parameters = {
        type: 'object',
        properties: {
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Phương thức HTTP' },
            url: { type: 'string', description: 'URL API đích' },
            payload: { type: 'string', description: 'Dữ liệu JSON dưới dạng chữ, cho phương thức POST/PUT (tuỳ chọn)' }
        },
        required: ['method', 'url']
    };

    async execute(args: { method: string, url: string, payload?: string }): Promise<any> {
        const { method, url, payload } = args;

        let parsedData = undefined;
        if (payload) {
            try { parsedData = JSON.parse(payload); } catch (e) { parsedData = payload; }
        }

        const response = await axios({
            method: method as any,
            url,
            data: parsedData,
            timeout: 10000
        });

        return {
            status: response.status,
            data: response.data
        };
    }
}
