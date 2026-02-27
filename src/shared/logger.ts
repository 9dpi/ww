import fs from 'fs';
import path from 'path';

const homeDir = process.env.HOME || process.env.USERPROFILE || '';
const LOG_DIR = path.join(homeDir, '.openclaw', 'logs');

export class Logger {
    static init() {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    }

    static info(message: string, meta?: any) {
        this.log('INFO', message, meta);
    }

    static error(message: string, error?: any) {
        this.log('ERROR', message, error);
    }

    static warn(message: string, meta?: any) {
        this.log('WARN', message, meta);
    }

    private static log(level: string, message: string, meta?: any) {
        const timestamp = new Date().toISOString();
        const metaString = meta ? (meta instanceof Error ? meta.message : JSON.stringify(meta)) : '';
        const logEntry = `[${timestamp}] [${level}] ${message} ${metaString}`.trim();

        // Print to console
        if (level === 'ERROR') {
            console.error(logEntry);
        } else if (level === 'WARN') {
            console.warn(logEntry);
        } else {
            console.log(logEntry);
        }

        // Write to file
        try {
            const logFile = path.join(LOG_DIR, `gateway-${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFileSync(logFile, logEntry + '\n');
        } catch (e) {
            // Avoid recursive errors
        }
    }
}
