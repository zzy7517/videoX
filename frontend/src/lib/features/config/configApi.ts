// frontend/src/lib/features/text/textApi.ts
import { fetchWithAuth } from '@/lib/utils';

/**
 * T2I Copilot配置接口
 */
export interface T2ICopilotConfig {
  silicon_flow_api_key?: string;
  silicon_flow_models?: string;
  groq_api_key?: string;
  groq_models?: string;
  system_prompt?: string;
}

/**
 * 文本内容接口定义
 */
export interface TextContent {
  content: string;
  global_comfyui_payload?: Record<string, unknown>;
  comfyui_url?: string;
  openai_url?: string;
  openai_api_key?: string;
  model?: string;
  t2i_copilot?: T2ICopilotConfig;
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
  
  // 处理 t2i_copilot 数据
  // 如果后端直接返回了t2i_copilot字段，则直接使用
  // 否则从独立字段中构建（兼容旧版本）
  const t2iCopilot = data.t2i_copilot || {
    silicon_flow_api_key: data.silicon_flow_api_key,
    silicon_flow_models: data.silicon_flow_models,
    groq_api_key: data.groq_api_key,
    groq_models: data.groq_models
  };
  
  return { 
    content: data.content || "", 
    global_comfyui_payload: data.global_comfyui_payload || null,
    comfyui_url: data.comfyui_url || "",
    openai_url: data.openai_url || undefined,
    openai_api_key: data.openai_api_key || undefined,
    model: data.model || undefined,
    t2i_copilot: t2iCopilot
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
  groq_models?: string,
  system_prompt?: string
): Promise<void> => {
  // 构建t2i_copilot对象
  const t2i_copilot: T2ICopilotConfig = {
    silicon_flow_api_key,
    silicon_flow_models,
    groq_api_key,
    groq_models,
    system_prompt
  };
  
  const response = await fetchWithAuth(API_TEXT_URL, {
    method: 'PUT',
    body: JSON.stringify({ 
      content: content,
      global_comfyui_payload: global_comfyui_payload,
      comfyui_url: comfyui_url,
      openai_url: openai_url,
      openai_api_key: openai_api_key,
      model: model,
      t2i_copilot: t2i_copilot
    }),
  });
  
  if (!response.ok) {
    throw new Error(`保存文本失败：状态码 ${response.status}`);
  }
}; 