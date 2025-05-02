import { useState, useCallback } from 'react';
import {
  loadTextContent as apiLoadTextContent,
  saveTextContent as apiSaveTextContent
} from './configApi';

/**
 * 文本管理自定义 Hook
 * 封装所有与文本相关的状态和操作逻辑
 */
export const useTextManager = () => {
  // === 状态定义 ===
  const [inputText, setInputText] = useState("");
  const [comfyuiConfig, setComfyuiConfig] = useState<Record<string, unknown> | null>(null);
  const [comfyuiUrl, setComfyuiUrl] = useState("");
  const [openaiUrl, setOpenaiUrl] = useState<string | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /**
   * 清除消息的辅助函数
   */
  const clearMessage = useCallback((delay = 3000) => {
    setTimeout(() => setMessage(""), delay);
  }, []);

  /**
   * 清除错误的辅助函数
   */
  const clearError = useCallback((delay = 3000) => {
    setTimeout(() => setError(""), delay);
  }, []);

  /**
   * 从服务器加载文本内容
   */
  const loadTextContent = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setMessage("");
    try {
      const { content, global_comfyui_payload, comfyui_url, openai_url, openai_api_key, model } = await apiLoadTextContent();
      setInputText(content);
      setComfyuiConfig(global_comfyui_payload || null);
      setComfyuiUrl(comfyui_url || "");
      setOpenaiUrl(openai_url || null);
      setOpenaiApiKey(openai_api_key || null);
      setModel(model || null);
      return { content, global_comfyui_payload, comfyui_url, openai_url, openai_api_key, model };
    } catch (error) {
      console.error("加载文本内容失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法加载文本内容";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  /**
   * 保存文本内容到服务器
   */
  const saveTextContent = useCallback(async () => {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await apiSaveTextContent(
        inputText,
        comfyuiConfig || undefined,
        comfyuiUrl || undefined,
        openaiUrl || undefined,
        openaiApiKey || undefined,
        model || undefined
      );
      setMessage("保存成功");
      clearMessage();
    } catch (error) {
      console.error("保存文本内容失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法保存文本内容";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [inputText, comfyuiConfig, comfyuiUrl, openaiUrl, openaiApiKey, model, clearMessage, clearError]);

  /**
   * 更新ComfyUI配置
   */
  const updateComfyuiConfig = useCallback((config: Record<string, unknown> | null) => {
    setComfyuiConfig(config);
  }, []);

  /**
   * 更新ComfyUI URL
   */
  const updateComfyuiUrl = useCallback((url: string) => {
    setComfyuiUrl(url);
  }, []);

  /**
   * 更新 OpenAI URL
   */
  const updateOpenaiUrl = useCallback((url: string) => {
    setOpenaiUrl(url);
  }, []);

  /**
   * 更新 OpenAI API Key
   */
  const updateOpenaiApiKey = useCallback((key: string) => {
    setOpenaiApiKey(key);
  }, []);

  /**
   * 更新 LLM 模型名称
   */
  const updateModel = useCallback((modelName: string) => {
    setModel(modelName);
  }, []);

  /**
   * 保存ComfyUI配置到服务器（保留当前文本内容）
   */
  const saveComfyuiConfig = useCallback(async (config: Record<string, unknown> | null) => {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await apiSaveTextContent(
        inputText,
        config || undefined,
        comfyuiUrl || undefined,
        openaiUrl || undefined,
        openaiApiKey || undefined,
        model || undefined
      );
      setComfyuiConfig(config);
      setMessage("配置保存成功");
      clearMessage();
    } catch (error) {
      console.error("保存ComfyUI配置失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法保存ComfyUI配置";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [inputText, comfyuiUrl, openaiUrl, openaiApiKey, model, clearMessage, clearError]);

  /**
   * 更新输入文本内容
   */
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
  }, []);

  /**
   * 重置文本状态，不重置comfyui配置
   */
  const resetTextState = useCallback(() => {
    setInputText("");
    setError("");
    setMessage("");
  }, []);

  return {
    // 状态
    inputText,
    comfyuiConfig,
    comfyuiUrl,
    openaiUrl,
    openaiApiKey,
    model,
    isLoading,
    isSaving,
    error,
    message,
    
    // 操作方法
    loadTextContent,
    saveTextContent,
    handleTextChange,
    updateComfyuiConfig,
    updateComfyuiUrl,
    saveComfyuiConfig,
    resetTextState,
    updateOpenaiUrl,
    updateOpenaiApiKey,
    updateModel,
    
    // 辅助方法
    setError,
    clearError,
    setMessage,
    clearMessage
  };
}; 