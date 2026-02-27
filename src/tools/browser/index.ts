import { ITool } from '../tool';
import puppeteer from 'puppeteer';

export class BrowserScreenshotTool implements ITool {
    name = 'browser_screenshot';
    description = 'Chụp ảnh màn hình toàn bộ của một trang web từ đường link URL được cung cấp';
    parameters = {
        type: 'object',
        properties: {
            url: { type: 'string', description: 'Đường dẫn bắt đầu bằng http:// hoặc https://' }
        },
        required: ['url']
    };

    async execute(args: { url: string }): Promise<any> {
        const { url } = args;
        if (!url.startsWith('http')) throw new Error('Cần cung cấp định dạng Link chuẩn (http)');

        const browser = await puppeteer.launch({ headless: true });
        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            const screenshotBase64 = await page.screenshot({ encoding: 'base64', fullPage: true });
            return { success: true, message: `Đã chụp trang ${url}`, image_base64: `[BASE64_IMAGE_DATA] (Đã bị ẩn vì quá lớn để in ra log: dài ${screenshotBase64.length} kí tự)` };
        } finally {
            await browser.close();
        }
    }
}

export class BrowserScrapeTool implements ITool {
    name = 'browser_scrape';
    description = 'Đọc nhanh văn bản hiển thị trên một website (hữu ích để đọc báo, wiki, thông tin tài liệu)';
    parameters = {
        type: 'object',
        properties: {
            url: { type: 'string', description: 'Đường dẫn bài viết để đọc' }
        },
        required: ['url']
    };

    async execute(args: { url: string }): Promise<any> {
        const { url } = args;
        const browser = await puppeteer.launch({ headless: true });
        try {
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

            const content = await page.evaluate(() => {
                return document.body.innerText.substring(0, 5000); // Trả về tối đa 5000 kí tự để tiết kiệm Tokens OpenAI
            });
            return { success: true, content };
        } finally {
            await browser.close();
        }
    }
}
