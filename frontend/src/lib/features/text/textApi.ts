// frontend/src/lib/features/text/textApi.ts

/**
 * 文本内容接口定义
 */
export interface TextContent {
  content: string;
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
  return { content: data.content || "" };
};

/**
 * 保存文本内容到服务器
 * @param content 要保存的文本内容
 */
export const saveTextContent = async (content: string): Promise<void> => {
  const response = await fetch(API_TEXT_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: content }),
  });
  
  if (!response.ok) {
    throw new Error(`保存文本失败：状态码 ${response.status}`);
  }
};

/**
 * 清除服务器上的文本内容
 */
export const clearTextContent = async (): Promise<void> => {
  const response = await fetch(API_TEXT_URL, {
    method: 'DELETE',
  });
  
  if (!response.ok && response.status !== 204) { // 204 No Content 是成功状态
    throw new Error(`清除文本失败：状态码 ${response.status}`);
  }
}; 