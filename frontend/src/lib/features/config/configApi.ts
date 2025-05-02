// frontend/src/lib/features/text/textApi.ts

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
}

// API 路径
const API_TEXT_URL = 'http://localhost:8000/text/';

/**
 * 从服务器加载文本内容
 * @returns 文本内容
 */
export const loadTextContent = async (): Promise<TextContent> => {
  const response = await fetch(API_TEXT_URL);
  if (!response.ok) {
    throw new Error(`加载文本失败：状态码 ${response.status}`);
  }
  const data = await response.json();
  return { 
    content: data.content || "", 
    global_comfyui_payload: data.global_comfyui_payload || null,
    comfyui_url: data.comfyui_url || "",
    openai_url: data.openai_url || undefined,
    openai_api_key: data.openai_api_key || undefined,
    model: data.model || undefined
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
  model?: string
): Promise<void> => {
  const response = await fetch(API_TEXT_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      content: content,
      global_comfyui_payload: global_comfyui_payload,
      comfyui_url: comfyui_url,
      openai_url: openai_url,
      openai_api_key: openai_api_key,
      model: model
    }),
  });
  
  if (!response.ok) {
    throw new Error(`保存文本失败：状态码 ${response.status}`);
  }
}; 