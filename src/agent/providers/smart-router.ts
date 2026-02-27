import https from 'https';
import { Logger } from '../../shared/logger';

export interface FreeModelInfo {
    id: string;
    name: string;
    contextLength: number;
    provider: string;
}

// Danh sách ưu tiên: những model mạnh nhất sẽ được thử trước
const PRIORITY_VENDORS = [
    'google',      // Gemma mạnh nhất trong miễn phí
    'meta-llama',  // Llama 3.3 70B
    'qwen',        // Qwen3
    'mistralai',   // Mistral  
    'nvidia',      // Nemotron
    'nousresearch',
    'openai',      // GPT-OSS
];

export class SmartRouter {
    private static freeModels: FreeModelInfo[] = [];
    private static lastFetchTime: number = 0;
    private static failedModels: Set<string> = new Set();
    private static currentModelIndex: number = 0;
    private static CACHE_TTL = 10 * 60 * 1000; // Cache 10 phút

    /**
     * Quét OpenRouter API để lấy danh sách tất cả model miễn phí
     */
    static async discoverFreeModels(): Promise<FreeModelInfo[]> {
        // Nếu cache còn hiệu lực
        if (this.freeModels.length > 0 && (Date.now() - this.lastFetchTime) < this.CACHE_TTL) {
            return this.freeModels;
        }

        Logger.info('🔍 [SmartRouter] Đang quét OpenRouter để tìm danh sách Model AI miễn phí...');

        return new Promise((resolve, reject) => {
            https.get('https://openrouter.ai/api/v1/models', (res) => {
                let data = '';
                res.on('data', (chunk: string) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const allModels = json.data || [];

                        // Lọc chỉ lấy các model miễn phí (kết thúc bằng :free HOẶC pricing.prompt === '0')
                        const freeOnes: FreeModelInfo[] = allModels
                            .filter((m: any) => {
                                const isFree = m.id.endsWith(':free') ||
                                    (m.pricing?.prompt === '0' && m.pricing?.completion === '0');
                                // Bỏ qua model quá nhỏ (< 1B params thường yếu)
                                return isFree;
                            })
                            .map((m: any) => ({
                                id: m.id,
                                name: m.name || m.id,
                                contextLength: m.context_length || 4096,
                                provider: m.id.split('/')[0]
                            }));

                        // Sắp xếp ưu tiên: Vendor mạnh lên trước + context dài ưu tiên
                        freeOnes.sort((a: FreeModelInfo, b: FreeModelInfo) => {
                            const aPriority = PRIORITY_VENDORS.indexOf(a.provider);
                            const bPriority = PRIORITY_VENDORS.indexOf(b.provider);
                            const aScore = aPriority === -1 ? 99 : aPriority;
                            const bScore = bPriority === -1 ? 99 : bPriority;
                            if (aScore !== bScore) return aScore - bScore;
                            return b.contextLength - a.contextLength; // Context dài hơn = mạnh hơn
                        });

                        this.freeModels = freeOnes;
                        this.lastFetchTime = Date.now();

                        Logger.info(`🌐 [SmartRouter] Tìm thấy ${freeOnes.length} model MIỄN PHÍ. Top 5:`);
                        freeOnes.slice(0, 5).forEach((m, i) => {
                            Logger.info(`   ${i + 1}. ${m.id} (context: ${m.contextLength})`);
                        });

                        resolve(freeOnes);
                    } catch (e) {
                        Logger.error('[SmartRouter] Lỗi phân tích dữ liệu OpenRouter', e);
                        reject(e);
                    }
                });
            }).on('error', (e) => {
                Logger.error('[SmartRouter] Lỗi kết nối tới OpenRouter API', e);
                reject(e);
            });
        });
    }

    /**
     * Lấy model miễn phí tiếp theo chưa bị fail
     */
    static async getNextAvailableModel(): Promise<string | null> {
        const models = await this.discoverFreeModels();

        // Tìm model chưa bị đánh dấu fail
        for (let i = 0; i < models.length; i++) {
            const idx = (this.currentModelIndex + i) % models.length;
            const model = models[idx];
            if (!this.failedModels.has(model.id)) {
                this.currentModelIndex = idx;
                return model.id;
            }
        }

        // Nếu tất cả đã fail, xóa blacklist và thử lại từ đầu 
        Logger.warn('[SmartRouter] Tất cả model miễn phí đều đang bận. Reset danh sách...');
        this.failedModels.clear();
        this.currentModelIndex = 0;
        return models.length > 0 ? models[0].id : null;
    }

    /**
     * Đánh dấu model hiện tại là lỗi (429/5xx), và nhảy sang cái tiếp theo
     */
    static markModelFailed(modelId: string) {
        this.failedModels.add(modelId);
        this.currentModelIndex++;
        Logger.warn(`⚠️ [SmartRouter] Model [${modelId}] bị đánh dấu lỗi. Đang chuyển sang model tiếp theo...`);

        // Tự động xóa blacklist sau 5 phút (model có thể hồi phục)
        setTimeout(() => {
            this.failedModels.delete(modelId);
            Logger.info(`♻️ [SmartRouter] Model [${modelId}] đã được khôi phục lại danh sách.`);
        }, 5 * 60 * 1000);
    }

    /**
     * Lấy danh sách model hiện có (đã cache)
     */
    static getCachedModels(): FreeModelInfo[] {
        return this.freeModels;
    }
}
