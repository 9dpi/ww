export interface ITool {
    name: string;
    description: string;
    parameters: any; // Chuẩn định nghĩa JSON Schema (OpenAI format type: object)
    execute(args: any): Promise<any>;
}
