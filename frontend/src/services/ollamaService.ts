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

  async getAvailableModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: OllamaModelsResponse = await response.json();
      
      // Filter out embedding models and sort by parameter size ascending
      const chatModels = data.models.filter(model =>
        !model.name.includes('embed') &&
        !model.name.includes('embedding')
      );
      const parseParams = (m: OllamaModel) => {
        const p = m.details?.parameter_size || '';
        const match = p.match(/([0-9.]+)\s*(B|M)/i);
        if (!match) return Number.MAX_SAFE_INTEGER;
        const val = parseFloat(match[1]);
        const unit = (match[2] || 'B').toUpperCase();
        return unit === 'M' ? val / 1000 : val; // convert M to approx B for ordering
      };
      return chatModels.sort((a, b) => parseParams(a) - parseParams(b));
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
    
    // Generate description based on model characteristics
    if (model.name.includes('deepseek')) {
      return `DeepSeek model (${parameter_size}) - Advanced reasoning and coding`;
    } else if (model.name.includes('gpt-oss')) {
      return `GPT-OSS model (${parameter_size}) - General purpose language model`;
    } else if (model.name.includes('qwen')) {
      return `Qwen model (${parameter_size}) - Multilingual and vision capabilities`;
    } else if (model.name.includes('gemma')) {
      return `Google Gemma model (${parameter_size}) - Efficient and capable`;
    } else if (model.name.includes('kimi')) {
      return `Kimi model (${parameter_size}) - Long context understanding`;
    } else {
      return `${family} model (${parameter_size}) - Language model`;
    }
  }
}

export const ollamaService = new OllamaService();

