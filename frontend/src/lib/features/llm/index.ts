import { GroqClient, SiliconFlowClient, OpenAIClient } from './clients';
import { LLMClient, LLMProvider, LLMRequestOptions, LLMResponse, Message } from './types';

/**
 * LLM服务类，提供统一的接口来使用不同的LLM提供商
 */
export class LLMService {
  private clients: Partial<Record<LLMProvider, LLMClient>> = {};
  private defaultProvider: LLMProvider = 'groq';
  private groqApiKey?: string;
  private siliconflowApiKey?: string;
  private openaiApiKey?: string;
  private openaiBaseURL?: string;

  constructor(groqApiKey?: string, siliconflowApiKey?: string, openaiApiKey?: string, openaiBaseURL?: string) {
    // 保存API密钥，但不立即创建客户端
    this.groqApiKey = groqApiKey;
    this.siliconflowApiKey = siliconflowApiKey;
    this.openaiApiKey = openaiApiKey;
    this.openaiBaseURL = openaiBaseURL;
    
    // 只初始化有API密钥的客户端
    if (groqApiKey) {
      this.clients.groq = new GroqClient(groqApiKey);
    }
    
    if (siliconflowApiKey) {
      this.clients.siliconflow = new SiliconFlowClient(siliconflowApiKey);
      // 如果没有Groq API密钥但有硅基流动API密钥，则默认使用硅基流动
      if (!groqApiKey) {
        this.defaultProvider = 'siliconflow';
      }
    }
    
    if (openaiApiKey) {
      this.clients.openai = new OpenAIClient(openaiApiKey, openaiBaseURL);
      // 如果没有其他API密钥但有OpenAI API密钥，则默认使用OpenAI
      if (!groqApiKey && !siliconflowApiKey) {
        this.defaultProvider = 'openai';
      }
    }
  }

  /**
   * 设置默认LLM提供商
   */
  setDefaultProvider(provider: LLMProvider): void {
    // 验证提供商是否已初始化
    if (!this.clients[provider]) {
      throw new Error(`无法设置默认提供商 ${provider}，因为它未初始化`);
    }
    this.defaultProvider = provider;
  }

  /**
   * 使用指定的提供商生成文本
   */
  async generate(
    options: LLMRequestOptions,
    provider?: LLMProvider
  ): Promise<LLMResponse> {
    if (!options.model) {
      throw new Error('必须指定模型名称');
    }
    
    const selectedProvider = provider || this.defaultProvider;
    const client = this.clients[selectedProvider];

    if (!client) {
      throw new Error(`提供商 ${selectedProvider} 未初始化或API密钥缺失`);
    }

    return client.generate(options);
  }

  /**
   * 简化的聊天接口
   */
  async chat(
    messages: Message[],
    model: string,
    provider?: LLMProvider,
    options: Partial<Omit<LLMRequestOptions, 'messages' | 'model'>> = {}
  ): Promise<string> {
    const response = await this.generate(
      {
        messages,
        model,
        ...options,
      },
      provider
    );
    
    return response.text;
  }
  
  /**
   * 返回已初始化的提供商列表
   */
  getAvailableProviders(): LLMProvider[] {
    return Object.keys(this.clients) as LLMProvider[];
  }
}

// 默认导出创建LLM服务的函数
export function createLLMService(
  groqApiKey?: string,
  siliconflowApiKey?: string,
  openaiApiKey?: string,
  openaiBaseURL?: string
): LLMService {
  return new LLMService(groqApiKey, siliconflowApiKey, openaiApiKey, openaiBaseURL);
}

// 导出类型
export * from './types';
export * from './clients'; 