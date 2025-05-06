import OpenAI from 'openai';
import { LLMClient, LLMRequestOptions, LLMResponse, LLMProvider } from './types';

// Groq 客户端实现
export class GroqClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      dangerouslyAllowBrowser: true // 允许在浏览器环境中运行，注意API密钥安全风险
    });
  }

  async generate(options: LLMRequestOptions): Promise<LLMResponse> {
    if (!options.model) {
      throw new Error('必须指定模型名称');
    }
    
    try {
      // 确保stream为false
      const streamOption = options.stream === true ? false : false;
      
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 1.0,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stopSequences,
        stream: streamOption,
      });

      return {
        text: completion.choices[0]?.message.content || '',
        provider: 'groq' as LLMProvider,
        model: options.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Groq API Error:', error);
      throw error;
    }
  }
}

// 硅基流动客户端实现
export class SiliconFlowClient implements LLMClient {
  private apiKey: string;
  private baseURL = 'https://api.siliconflow.cn/v1/chat/completions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY as string);
  }

  async generate(options: LLMRequestOptions): Promise<LLMResponse> {
    if (!options.model) {
      throw new Error('必须指定模型名称');
    }
    
    try {
      const payload = {
        model: options.model,
        messages: options.messages,
        stream: false, // 固定为false
        max_tokens: options.maxTokens || 512,
        temperature: options.temperature ?? 1.0,
        top_p: options.topP || 0.7,
        top_k: options.topK || 50,
        frequency_penalty: options.frequencyPenalty || 0.5,
        n: 1,
        response_format: { type: 'text' },
      };

      const requestOptions = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };

      const response = await fetch(this.baseURL, requestOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '硅基流动API调用失败');
      }

      return {
        text: data.choices?.[0]?.message?.content || '',
        provider: 'siliconflow' as LLMProvider,
        model: options.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('硅基流动API Error:', error);
      throw error;
    }
  }
}

// OpenAI 客户端实现
export class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      baseURL: baseURL || process.env.NEXT_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true // 允许在浏览器环境中运行，注意API密钥安全风险
    });
  }

  async generate(options: LLMRequestOptions): Promise<LLMResponse> {
    if (!options.model) {
      throw new Error('必须指定模型名称');
    }
    
    try {
      // 确保stream为false
      const streamOption = options.stream === true ? false : false;
      
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 1.0,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stopSequences,
        stream: streamOption,
      });

      return {
        text: completion.choices[0]?.message.content || '',
        provider: 'openai' as LLMProvider,
        model: options.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
} 