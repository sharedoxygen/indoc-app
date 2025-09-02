/**
 * Service for interacting with Ollama API directly
 */
export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    parameter_size: string;
    quantization_level: string;
    family: string;
  };
  modified_at: string;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export class OllamaService {
  private baseUrl: string;

  constructor() {
    // Ollama typically runs on port 11434
    this.baseUrl = 'http://localhost:11434';
  }

  private parseParameterSize(param: string | undefined): number {
    if (!param) return Number.MAX_SAFE_INTEGER;
    const match = String(param).trim().match(/(\d+(?:\.\d+)?)([kKmMbB])?/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    // Treat parameter_size like tokens count B=Billions, M=Millions, K=Thousands
    const multipliers: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
    const factor = multipliers[unit] ?? 1;
    return value * factor;
  }

  async getAvailableModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: OllamaModelsResponse = await response.json();

      const chatModels = data.models.filter(model =>
        !model.name.includes('embed') &&
        !model.name.includes('embedding')
      );

      // Sort by parameter_size ascending (smallest first)
      return chatModels.sort((a, b) =>
        this.parseParameterSize(a.details?.parameter_size) - this.parseParameterSize(b.details?.parameter_size)
      );
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return [];
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection check failed:', error);
      return false;
    }
  }

  formatModelName(model: OllamaModel): string {
    // Convert technical names to user-friendly format
    return model.name
      .replace(/:/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getModelDescription(model: OllamaModel): string {
    const { parameter_size, family } = model.details;
    const sizeText = parameter_size ? ` (${parameter_size})` : '';
    if (model.name.includes('deepseek')) return `DeepSeek model${sizeText} - Advanced reasoning and coding`;
    if (model.name.includes('gpt-oss')) return `GPT-OSS model${sizeText} - General purpose language model`;
    if (model.name.includes('qwen')) return `Qwen model${sizeText} - Multilingual and vision capabilities`;
    if (model.name.includes('gemma')) return `Google Gemma model${sizeText} - Efficient and capable`;
    if (model.name.includes('kimi')) return `Kimi model${sizeText} - Long context understanding`;
    return `${family} model${sizeText} - Language model`;
  }
}
export const ollamaService = new OllamaService();

