import { useState, useCallback } from 'react';
import {
  loadTextContent as apiLoadTextContent,
  saveTextContent as apiSaveTextContent,
  clearTextContent as apiClearTextContent
} from './textApi';

/**
 * 文本管理自定义 Hook
 * 封装所有与文本相关的状态和操作逻辑
 */
export const useTextManager = () => {
  // === 状态定义 ===
  const [inputText, setInputText] = useState("");
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
      const { content } = await apiLoadTextContent();
      setInputText(content);
      return content;
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
      await apiSaveTextContent(inputText);
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
  }, [inputText, clearMessage, clearError]);

  /**
   * 清空文本内容
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
   * 重置文本状态
   */
  const resetTextState = useCallback(() => {
    setInputText("");
    setError("");
    setMessage("");
  }, []);

  return {
    // 状态
    inputText,
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
    resetTextState,
    
    // 辅助方法
    setError,
    clearError,
    setMessage,
    clearMessage
  };
}; 