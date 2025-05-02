import { useState, useCallback } from 'react';
import {
  loadTextContent as apiLoadTextContent,
  saveTextContent as apiSaveTextContent,
  clearTextContent as apiClearTextContent
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
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
      const { content, global_comfyui_payload, comfyui_url } = await apiLoadTextContent();
      setInputText(content);
      setComfyuiConfig(global_comfyui_payload || null);
      setComfyuiUrl(comfyui_url || "");
      return { content, global_comfyui_payload, comfyui_url };
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
      await apiSaveTextContent(inputText, comfyuiConfig || undefined, comfyuiUrl || undefined);
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
  }, [inputText, comfyuiConfig, comfyuiUrl, clearMessage, clearError]);

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
   * 保存ComfyUI配置到服务器（保留当前文本内容）
   */
  const saveComfyuiConfig = useCallback(async (config: Record<string, unknown> | null) => {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await apiSaveTextContent(inputText, config || undefined, comfyuiUrl || undefined);
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
  }, [inputText, comfyuiUrl, clearMessage, clearError]);

  /**
   * 清空文本内容，不清空comfyui配置
   */
  const clearTextContent = useCallback(async () => {
    if (!confirm("确定要清空全文内容吗？此操作不可撤销。")) {
      return;
    }
    
    setIsClearing(true);
    setError("");
    setMessage("");
    try {
      await apiClearTextContent();
      setInputText("");
      setMessage("内容已清空");
      clearMessage();
    } catch (error) {
      console.error("清空文本内容失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法清空文本内容";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsClearing(false);
    }
  }, [clearMessage, clearError]);

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
    isLoading,
    isSaving,
    isClearing,
    error,
    message,
    
    // 操作方法
    loadTextContent,
    saveTextContent,
    clearTextContent,
    handleTextChange,
    updateComfyuiConfig,
    updateComfyuiUrl,
    saveComfyuiConfig,
    resetTextState,
    
    // 辅助方法
    setError,
    clearError,
    setMessage,
    clearMessage
  };
}; 