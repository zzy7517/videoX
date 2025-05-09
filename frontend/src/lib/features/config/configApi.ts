// frontend/src/lib/features/text/textApi.ts
import { fetchWithAuth } from '@/lib/utils';

/**
 * LLM配置接口
 */
export interface LLMConfig {
  silicon_flow_api_key?: string;
  silicon_flow_models?: string;
  groq_api_key?: string;
  groq_models?: string;
  openai_url?: string;
  openai_api_key?: string;
  model?: string;
}

/**
 * 文本内容接口定义
 */
export interface TextContent {
  content: string;
  global_comfyui_payload?: Record<string, unknown>;
  comfyui_url?: string;
  llm_config?: LLMConfig;
}

// API 路径
const API_TEXT_URL = '/api/text/';

/**
 * 从服务器加载文本内容
 * @returns 文本内容
 */
export const loadTextContent = async (): Promise<TextContent> => {
  const response = await fetchWithAuth(API_TEXT_URL);
  if (!response.ok) {
    throw new Error(`加载文本失败：状态码 ${response.status}`);
  }
  const data = await response.json();
  
  // 处理 llm_config 数据
  // 兼容处理：从老数据中提取LLM设置到llm_config
  let llmConfig = data.llm_config || data.t2i_copilot || {
    silicon_flow_api_key: data.silicon_flow_api_key || undefined,
    silicon_flow_models: data.silicon_flow_models || undefined,
    groq_api_key: data.groq_api_key || undefined,
    groq_models: data.groq_models || undefined
  };
  
  // 将独立的OpenAI字段合并到llm_config
  if (data.openai_url || data.openai_api_key || data.model) {
    llmConfig = {
      ...llmConfig,
      openai_url: data.openai_url || undefined,
      openai_api_key: data.openai_api_key || undefined,
      model: data.model || undefined
    };
  }
  
  return { 
    content: data.content || "", 
    global_comfyui_payload: data.global_comfyui_payload || null,
    comfyui_url: data.comfyui_url || "",
    llm_config: llmConfig
  };
};

/**
 * 保存文本内容到服务器
 * @param content 要保存的文本内容
 * @param global_comfyui_payload 自定义comfyui工作流
 * @param comfyui_url ComfyUI的URL
 * @param openai_url OpenAI URL
 * @param openai_api_key OpenAI API Key
 * @param model LLM 模型名称
 * @param silicon_flow_api_key 硅基流动的API密钥
 * @param silicon_flow_models 硅基流动的模型列表
 * @param groq_api_key Groq的API密钥
 * @param groq_models Groq的模型列表
 */
export const saveTextContent = async (
  content: string, 
  global_comfyui_payload?: Record<string, unknown>, 
  comfyui_url?: string,
  openai_url?: string,
  openai_api_key?: string,
  model?: string,
  silicon_flow_api_key?: string,
  silicon_flow_models?: string,
  groq_api_key?: string,
  groq_models?: string
): Promise<void> => {
  // 构建llm_config对象，包含所有LLM设置
  const llm_config: LLMConfig = {
    silicon_flow_api_key,
    silicon_flow_models,
    groq_api_key,
    groq_models,
    openai_url,
    openai_api_key,
    model
  };
  
  const response = await fetchWithAuth(API_TEXT_URL, {
    method: 'PUT',
    body: JSON.stringify({ 
      content: content,
      global_comfyui_payload: global_comfyui_payload,
      comfyui_url: comfyui_url,
      llm_config: llm_config
    }),
  });
  
  if (!response.ok) {
    throw new Error(`保存文本失败：状态码 ${response.status}`);
  }
}; 