import { fetchWithAuth } from '@/lib/utils';

/**
 * 用户提示词接口定义
 */
export interface UserPrompt {
  id?: number;
  user_id?: number;
  character_prompt?: string; // 角色提示词
  shot_prompt?: string;     // 分镜提示词
  updated_at?: string;
  created_at?: string;
}

// API 路径
const API_PROMPTS_URL = '/api/prompts/';

/**
 * 从服务器获取用户的提示词
 * @returns 用户提示词对象 
 */
export const getUserPrompt = async (): Promise<UserPrompt> => {
  try {
    const response = await fetchWithAuth(API_PROMPTS_URL);
    if (!response.ok) {
      throw new Error(`获取提示词失败：状态码 ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('获取提示词失败:', error);
    // 出错时返回空对象
    return {};
  }
};

/**
 * 更新用户提示词
 * @param promptData 包含要更新的提示词字段
 */
export const updateUserPrompt = async (promptData: Partial<UserPrompt>): Promise<UserPrompt> => {
  try {
    const response = await fetchWithAuth(API_PROMPTS_URL, {
      method: 'PUT',
      body: JSON.stringify(promptData),
    });
    
    if (!response.ok) {
      throw new Error(`更新提示词失败：状态码 ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('更新提示词失败:', error);
    throw error;
  }
};

/**
 * 更新角色提示词
 * @param characterPrompt 角色提示词内容
 */
export const updateCharacterPrompt = async (characterPrompt: string): Promise<UserPrompt> => {
  return updateUserPrompt({ character_prompt: characterPrompt });
};

/**
 * 更新分镜提示词
 * @param shotPrompt 分镜提示词内容
 */
export const updateShotPrompt = async (shotPrompt: string): Promise<UserPrompt> => {
  return updateUserPrompt({ shot_prompt: shotPrompt });
}; 