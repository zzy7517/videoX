import { useState, useEffect, useCallback } from 'react';
import { getUserPrompt, updateUserPrompt, UserPrompt } from './promptApi';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_STORYBOARD_PROMPT } from '@/app/editor/constants';

// 使用从constants.ts导入的默认提示词
const DEFAULT_CHARACTER_PROMPT = DEFAULT_SYSTEM_PROMPT;
const DEFAULT_SHOT_PROMPT = DEFAULT_STORYBOARD_PROMPT;

/**
 * 提示词管理Hook，用于获取和更新用户提示词
 */
export const usePromptManager = () => {
  // 状态
  const [isLoading, setIsLoading] = useState(false);
  const [userPrompt, setUserPrompt] = useState<UserPrompt>({});
  
  // 计算得到的实际使用提示词（优先使用用户自定义提示词，没有则使用默认提示词）
  const characterPrompt = userPrompt.character_prompt || DEFAULT_CHARACTER_PROMPT;
  const shotPrompt = userPrompt.shot_prompt || DEFAULT_SHOT_PROMPT;
  
  // 是否使用自定义提示词的标志
  const hasCustomCharacterPrompt = !!userPrompt.character_prompt;
  const hasCustomShotPrompt = !!userPrompt.shot_prompt;
  
  // 加载用户提示词
  const loadUserPrompt = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserPrompt();
      setUserPrompt(data);
    } catch (error) {
      console.error('加载用户提示词失败:', error);
      alert('加载提示词失败');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 保存角色提示词
  const saveCharacterPrompt = useCallback(async (prompt: string) => {
    setIsLoading(true);
    try {
      const updatedPrompt = await updateUserPrompt({ character_prompt: prompt });
      setUserPrompt(prev => ({ ...prev, ...updatedPrompt }));
      alert('角色提示词已保存');
      return true;
    } catch (error) {
      console.error('保存角色提示词失败:', error);
      alert('保存角色提示词失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 保存分镜提示词
  const saveShotPrompt = useCallback(async (prompt: string) => {
    setIsLoading(true);
    try {
      const updatedPrompt = await updateUserPrompt({ shot_prompt: prompt });
      setUserPrompt(prev => ({ ...prev, ...updatedPrompt }));
      alert('分镜提示词已保存');
      return true;
    } catch (error) {
      console.error('保存分镜提示词失败:', error);
      alert('保存分镜提示词失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 重置为默认提示词
  const resetToDefaultCharacterPrompt = useCallback(async () => {
    setIsLoading(true);
    try {
      // 传递空字符串让后端将字段设置为NULL
      const updatedPrompt = await updateUserPrompt({ character_prompt: "" });
      setUserPrompt(prev => ({ ...prev, character_prompt: undefined }));
      alert('已重置为默认角色提示词');
      return true;
    } catch (error) {
      console.error('重置角色提示词失败:', error);
      alert('重置角色提示词失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const resetToDefaultShotPrompt = useCallback(async () => {
    setIsLoading(true);
    try {
      // 传递空字符串让后端将字段设置为NULL
      const updatedPrompt = await updateUserPrompt({ shot_prompt: "" });
      setUserPrompt(prev => ({ ...prev, shot_prompt: undefined }));
      alert('已重置为默认分镜提示词');
      return true;
    } catch (error) {
      console.error('重置分镜提示词失败:', error);
      alert('重置分镜提示词失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 初始化时加载用户提示词
  useEffect(() => {
    loadUserPrompt();
  }, [loadUserPrompt]);
  
  return {
    isLoading,
    characterPrompt,
    shotPrompt,
    hasCustomCharacterPrompt,
    hasCustomShotPrompt,
    saveCharacterPrompt,
    saveShotPrompt,
    resetToDefaultCharacterPrompt,
    resetToDefaultShotPrompt,
    DEFAULT_CHARACTER_PROMPT,
    DEFAULT_SHOT_PROMPT
  };
}; 