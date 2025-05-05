import { useState, useCallback } from 'react';
import {
  loadTextContent as apiLoadTextContent,
  saveTextContent as apiSaveTextContent
} from './configApi';
import { resetLLMClientCache } from '../shot/useShotManager';

/**
 * 验证Groq API密钥
 * @param apiKey Groq API密钥
 * @returns 返回验证结果和可能的错误信息
 */
const validateGroqApiKeyHelper = async (apiKey: string): Promise<{valid: boolean; error?: string}> => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { 
        valid: false, 
        error: error.error?.message || `API验证失败：状态码 ${response.status}` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : '验证Groq API密钥时发生未知错误' 
    };
  }
};

/**
 * 验证硅基流动API密钥
 * @param apiKey 硅基流动API密钥
 * @returns 返回验证结果和可能的错误信息
 */
const validateSiliconFlowApiKeyHelper = async (apiKey: string): Promise<{valid: boolean; error?: string}> => {
  try {
    const response = await fetch('https://api.siliconflow.cn/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { 
        valid: false, 
        error: error.error?.message || `API验证失败：状态码 ${response.status}` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : '验证硅基流动API密钥时发生未知错误' 
    };
  }
};

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
  
  // T2I Copilot相关状态
  const [siliconFlowApiKey, setSiliconFlowApiKey] = useState<string | null>(null);
  const [siliconFlowModels, setSiliconFlowModels] = useState<string | null>(null);
  const [groqApiKey, setGroqApiKey] = useState<string | null>(null);
  const [groqModels, setGroqModels] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  
  // API验证状态
  const [isValidatingGroq, setIsValidatingGroq] = useState(false);
  const [isValidatingSiliconFlow, setIsValidatingSiliconFlow] = useState(false);
  const [groqKeyValid, setGroqKeyValid] = useState(false);
  const [groqKeyInvalid, setGroqKeyInvalid] = useState(false);
  const [siliconFlowKeyValid, setSiliconFlowKeyValid] = useState(false);
  const [siliconFlowKeyInvalid, setSiliconFlowKeyInvalid] = useState(false);
  
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
      const { 
        content, 
        global_comfyui_payload, 
        comfyui_url, 
        openai_url, 
        openai_api_key, 
        model,
        t2i_copilot
      } = await apiLoadTextContent();
      
      setInputText(content);
      setComfyuiConfig(global_comfyui_payload || null);
      setComfyuiUrl(comfyui_url || "");
      setOpenaiUrl(openai_url || null);
      setOpenaiApiKey(openai_api_key || null);
      setModel(model || null);
      
      // 设置 T2I Copilot 相关状态
      if (t2i_copilot) {
        setSiliconFlowApiKey(t2i_copilot.silicon_flow_api_key || null);
        setSiliconFlowModels(t2i_copilot.silicon_flow_models || null);
        setGroqApiKey(t2i_copilot.groq_api_key || null);
        setGroqModels(t2i_copilot.groq_models || null);
        setSystemPrompt(t2i_copilot.system_prompt || null);
      }
      
      return { 
        content, 
        global_comfyui_payload, 
        comfyui_url, 
        openai_url, 
        openai_api_key, 
        model,
        t2i_copilot
      };
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
   * 验证 Groq API密钥
   */
  const validateGroqApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) {
      setError("请输入Groq API密钥");
      return false;
    }
    
    setIsValidatingGroq(true);
    setError("");
    
    try {
      const result = await validateGroqApiKeyHelper(apiKey);
      
      if (result.valid) {
        setMessage("Groq API密钥验证成功");
        setGroqKeyValid(true);
        setGroqKeyInvalid(false);
        clearMessage();
        return true;
      } else {
        setError(`Groq API密钥验证失败: ${result.error}`);
        setGroqKeyValid(false);
        setGroqKeyInvalid(true);
        return false;
      }
    } catch (error) {
      console.error("验证Groq API密钥失败:", error);
      const errorMsg = error instanceof Error ? error.message : "验证Groq API密钥时发生未知错误";
      setError(errorMsg);
      setGroqKeyValid(false);
      setGroqKeyInvalid(true);
      return false;
    } finally {
      setIsValidatingGroq(false);
    }
  }, [clearMessage]);
  
  /**
   * 验证硅基流动API密钥
   */
  const validateSiliconFlowApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) {
      setError("请输入硅基流动API密钥");
      return false;
    }
    
    setIsValidatingSiliconFlow(true);
    setError("");
    
    try {
      const result = await validateSiliconFlowApiKeyHelper(apiKey);
      
      if (result.valid) {
        setMessage("硅基流动API密钥验证成功");
        setSiliconFlowKeyValid(true);
        setSiliconFlowKeyInvalid(false);
        clearMessage();
        return true;
      } else {
        setError(`硅基流动API密钥验证失败: ${result.error}`);
        setSiliconFlowKeyValid(false);
        setSiliconFlowKeyInvalid(true);
        return false;
      }
    } catch (error) {
      console.error("验证硅基流动API密钥失败:", error);
      const errorMsg = error instanceof Error ? error.message : "验证硅基流动API密钥时发生未知错误";
      setError(errorMsg);
      setSiliconFlowKeyValid(false);
      setSiliconFlowKeyInvalid(true);
      return false;
    } finally {
      setIsValidatingSiliconFlow(false);
    }
  }, [clearMessage]);


  /**
   * 保存文本内容到服务器
   */
  const saveTextContent = useCallback(async () => {
    setIsSaving(true);
    setError("");
    setMessage("");
    
    // 检查并验证API密钥
    let groqKeyIsValid = groqKeyValid;
    let siliconFlowKeyIsValid = siliconFlowKeyValid;
    
    // 如果有填写API密钥但未验证通过，则自动尝试验证
    if (groqApiKey && !groqKeyValid && !groqKeyInvalid) {
      try {
        groqKeyIsValid = await validateGroqApiKey(groqApiKey);
      } catch (error) {
        console.error("自动验证Groq API密钥失败:", error);
        groqKeyIsValid = false;
      }
    }
    
    if (siliconFlowApiKey && !siliconFlowKeyValid && !siliconFlowKeyInvalid) {
      try {
        siliconFlowKeyIsValid = await validateSiliconFlowApiKey(siliconFlowApiKey);
      } catch (error) {
        console.error("自动验证硅基流动API密钥失败:", error);
        siliconFlowKeyIsValid = false;
      }
    }
    
    try {
      await apiSaveTextContent(
        inputText,
        comfyuiConfig || undefined,
        comfyuiUrl,
        openaiUrl || undefined,
        openaiApiKey || undefined,
        model || undefined,
        siliconFlowApiKey || undefined,
        siliconFlowModels || undefined,
        groqApiKey || undefined,
        groqModels || undefined,
        systemPrompt || undefined
      );
      setMessage("保存成功");
      clearMessage();
      
      // 保存成功后重置LLM客户端缓存，确保使用最新的API密钥
      resetLLMClientCache();
      
      return true;
    } catch (error) {
      console.error("保存文本内容失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法保存文本内容";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [
    inputText, 
    comfyuiConfig, 
    comfyuiUrl, 
    openaiUrl, 
    openaiApiKey, 
    model, 
    siliconFlowApiKey, 
    siliconFlowModels, 
    groqApiKey, 
    groqModels, 
    systemPrompt,
    groqKeyValid,
    siliconFlowKeyValid,
    groqKeyInvalid,
    siliconFlowKeyInvalid,
    validateGroqApiKey,
    validateSiliconFlowApiKey,
    clearMessage, 
    clearError
  ]);

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
   * 更新硅基流动 API Key
   */
  const updateSiliconFlowApiKey = useCallback((key: string) => {
    setSiliconFlowApiKey(key);
    // 清除验证状态
    if (siliconFlowApiKey !== key) {
      setSiliconFlowKeyValid(false);
      setSiliconFlowKeyInvalid(false);
      // 重置LLM客户端缓存
      resetLLMClientCache('siliconflow');
    }
  }, [siliconFlowApiKey]);
  
  /**
   * 更新硅基流动模型列表
   */
  const updateSiliconFlowModels = useCallback((models: string) => {
    setSiliconFlowModels(models);
  }, []);
  
  /**
   * 更新 Groq API Key
   */
  const updateGroqApiKey = useCallback((key: string) => {
    setGroqApiKey(key);
    // 清除验证状态
    if (groqApiKey !== key) {
      setGroqKeyValid(false);
      setGroqKeyInvalid(false);
      // 重置LLM客户端缓存
      resetLLMClientCache('groq');
    }
  }, [groqApiKey]);
  
  /**
   * 更新 Groq 模型列表
   */
  const updateGroqModels = useCallback((models: string) => {
    setGroqModels(models);
  }, []);

  /**
   * 更新 System Prompt
   */
  const updateSystemPrompt = useCallback((prompt: string) => {
    setSystemPrompt(prompt);
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
        model || undefined,
        siliconFlowApiKey || undefined,
        siliconFlowModels || undefined,
        groqApiKey || undefined,
        groqModels || undefined,
        systemPrompt || undefined
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
  }, [inputText, comfyuiUrl, openaiUrl, openaiApiKey, model, siliconFlowApiKey, siliconFlowModels, groqApiKey, groqModels, systemPrompt, clearMessage, clearError]);

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
    siliconFlowApiKey,
    siliconFlowModels,
    groqApiKey,
    groqModels,
    systemPrompt,
    isLoading,
    isSaving,
    isValidatingGroq,
    isValidatingSiliconFlow,
    groqKeyValid,
    groqKeyInvalid,
    siliconFlowKeyValid,
    siliconFlowKeyInvalid,
    error,
    message,
    
    // 操作方法
    loadTextContent,
    saveTextContent,
    handleTextChange,
    updateComfyuiConfig,
    updateComfyuiUrl,
    updateOpenaiUrl,
    updateOpenaiApiKey,
    updateModel,
    resetTextState,
    saveComfyuiConfig,
    validateGroqApiKey,
    validateSiliconFlowApiKey,
    
    // T2I Copilot相关的状态和方法
    updateSiliconFlowApiKey,
    updateSiliconFlowModels,
    updateGroqApiKey,
    updateGroqModels,
    updateSystemPrompt
  };
}; 