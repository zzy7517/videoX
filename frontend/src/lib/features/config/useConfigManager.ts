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
 * 验证OpenAI API密钥
 * @param apiKey OpenAI API密钥
 * @param baseUrl OpenAI API基础URL(可选)
 * @returns 返回验证结果和可能的错误信息
 */
const validateOpenAIApiKeyHelper = async (apiKey: string, baseUrl?: string): Promise<{valid: boolean; error?: string}> => {
  try {
    // 使用提供的baseUrl或默认的OpenAI API URL
    const url = `${baseUrl || 'https://api.openai.com/v1'}/models`;
    
    const response = await fetch(url, {
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
      error: error instanceof Error ? error.message : '验证OpenAI API密钥时发生未知错误' 
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
  
  // LLM Config相关状态
  const [siliconFlowApiKey, setSiliconFlowApiKey] = useState<string | null>(null);
  const [siliconFlowModels, setSiliconFlowModels] = useState<string | null>(null);
  const [groqApiKey, setGroqApiKey] = useState<string | null>(null);
  const [groqModels, setGroqModels] = useState<string | null>(null);
  
  // 记录初始加载的API密钥值
  const [initialGroqApiKey, setInitialGroqApiKey] = useState<string | null>(null);
  const [initialSiliconFlowApiKey, setInitialSiliconFlowApiKey] = useState<string | null>(null);
  const [initialOpenAIApiKey, setInitialOpenAIApiKey] = useState<string | null>(null);
  
  // API验证状态
  const [isValidatingGroq, setIsValidatingGroq] = useState(false);
  const [isValidatingSiliconFlow, setIsValidatingSiliconFlow] = useState(false);
  const [isValidatingOpenAI, setIsValidatingOpenAI] = useState(false);
  const [groqKeyValid, setGroqKeyValid] = useState(false);
  const [groqKeyInvalid, setGroqKeyInvalid] = useState(false);
  const [siliconFlowKeyValid, setSiliconFlowKeyValid] = useState(false);
  const [siliconFlowKeyInvalid, setSiliconFlowKeyInvalid] = useState(false);
  const [openAIKeyValid, setOpenAIKeyValid] = useState(false);
  const [openAIKeyInvalid, setOpenAIKeyInvalid] = useState(false);
  
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
        llm_config
      } = await apiLoadTextContent();
      
      setInputText(content);
      setComfyuiConfig(global_comfyui_payload || null);
      setComfyuiUrl(comfyui_url || "");
      
      // 设置 LLM 相关状态
      if (llm_config) {
        const groqKey = llm_config.groq_api_key || null;
        const siliconFlowKey = llm_config.silicon_flow_api_key || null;
        const openAIKey = llm_config.openai_api_key || null;
        
        setSiliconFlowApiKey(siliconFlowKey);
        setSiliconFlowModels(llm_config.silicon_flow_models || null);
        setGroqApiKey(groqKey);
        setGroqModels(llm_config.groq_models || null);
        setOpenaiUrl(llm_config.openai_url || null);
        setOpenaiApiKey(openAIKey);
        setModel(llm_config.model || null);
        
        // 记录初始加载的API密钥值，用于后续比较是否有修改
        setInitialGroqApiKey(groqKey);
        setInitialSiliconFlowApiKey(siliconFlowKey);
        setInitialOpenAIApiKey(openAIKey);
        
        // 初始化验证状态：非空的API密钥初始状态设置为已验证
        if (groqKey) {
          console.log("初始化Groq API密钥为已验证状态");
          setGroqKeyValid(true);
          setGroqKeyInvalid(false);
        }
        
        if (siliconFlowKey) {
          console.log("初始化硅基流动API密钥为已验证状态");
          setSiliconFlowKeyValid(true);
          setSiliconFlowKeyInvalid(false);
        }
        
        if (openAIKey) {
          console.log("初始化OpenAI API密钥为已验证状态");
          setOpenAIKeyValid(true);
          setOpenAIKeyInvalid(false);
        }
      } else {
        // 如果数据库中没有设置，尝试从localStorage中读取
        try {
          const localSettings = localStorage.getItem('video_editor_settings');
          if (localSettings) {
            const parsedSettings = JSON.parse(localSettings);
            
            // 使用本地保存的设置更新状态
            if (parsedSettings.openaiApiKey) {
              setOpenaiApiKey(parsedSettings.openaiApiKey);
              setInitialOpenAIApiKey(parsedSettings.openaiApiKey);
              setOpenAIKeyValid(true);
              setOpenAIKeyInvalid(false);
              console.log("从本地存储加载OpenAI API密钥");
            }
            
            if (parsedSettings.openaiUrl) {
              setOpenaiUrl(parsedSettings.openaiUrl);
            }
            
            if (parsedSettings.openaiModel) {
              setModel(parsedSettings.openaiModel);
            }
            
            if (parsedSettings.groqApiKey) {
              setGroqApiKey(parsedSettings.groqApiKey);
              setInitialGroqApiKey(parsedSettings.groqApiKey);
              setGroqKeyValid(true);
              setGroqKeyInvalid(false);
            }
            
            if (parsedSettings.siliconFlowApiKey) {
              setSiliconFlowApiKey(parsedSettings.siliconFlowApiKey);
              setInitialSiliconFlowApiKey(parsedSettings.siliconFlowApiKey);
              setSiliconFlowKeyValid(true);
              setSiliconFlowKeyInvalid(false);
            }
          }
        } catch (e) {
          console.error("从本地存储加载设置失败:", e);
        }
      }
      
      return { 
        content, 
        global_comfyui_payload, 
        comfyui_url, 
        llm_config
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
   * 验证OpenAI API密钥
   */
  const validateOpenAIApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) {
      setError("请输入OpenAI API密钥");
      return false;
    }
    
    setIsValidatingOpenAI(true);
    setError("");
    
    try {
      // 使用当前设置的URL，如果没有则使用默认的OpenAI URL
      const result = await validateOpenAIApiKeyHelper(apiKey, openaiUrl || undefined);
      
      if (result.valid) {
        setMessage("OpenAI API密钥验证成功");
        setOpenAIKeyValid(true);
        setOpenAIKeyInvalid(false);
        clearMessage();
        return true;
      } else {
        setError(`OpenAI API密钥验证失败: ${result.error}`);
        setOpenAIKeyValid(false);
        setOpenAIKeyInvalid(true);
        return false;
      }
    } catch (error) {
      console.error("验证OpenAI API密钥失败:", error);
      const errorMsg = error instanceof Error ? error.message : "验证OpenAI API密钥时发生未知错误";
      setError(errorMsg);
      setOpenAIKeyValid(false);
      setOpenAIKeyInvalid(true);
      return false;
    } finally {
      setIsValidatingOpenAI(false);
    }
  }, [clearMessage, openaiUrl]);

  /**
   * 保存文本内容
   */
  const saveTextContent = useCallback(async () => {
    setIsSaving(true);
    setError("");
    
    // 验证逻辑：如果API密钥发生了变化并且不为空，需要先验证
    const needToValidateGroq = groqApiKey && groqApiKey !== initialGroqApiKey && !groqKeyValid;
    const needToValidateSiliconFlow = siliconFlowApiKey && siliconFlowApiKey !== initialSiliconFlowApiKey && !siliconFlowKeyValid;
    const needToValidateOpenAI = openaiApiKey && openaiApiKey !== initialOpenAIApiKey && !openAIKeyValid;
    
    // 如果任何一个API密钥已经被标记为无效，阻止保存
    if (groqKeyInvalid || siliconFlowKeyInvalid || openAIKeyInvalid) {
      setError("有API密钥验证失败，请先验证所有API密钥或移除它们");
      setIsSaving(false);
      clearError();
      return false;
    }
    
    // 需要验证的API密钥
    let validationResults = true;
    
    // 验证GROQ API密钥（如果需要）
    if (needToValidateGroq) {
      console.log("验证Groq API密钥...");
      const isGroqValid = await validateGroqApiKey(groqApiKey);
      if (!isGroqValid) {
        validationResults = false;
      }
    }
    
    // 验证硅基流动API密钥（如果需要）
    if (needToValidateSiliconFlow) {
      console.log("验证硅基流动API密钥...");
      const isSiliconFlowValid = await validateSiliconFlowApiKey(siliconFlowApiKey);
      if (!isSiliconFlowValid) {
        validationResults = false;
      }
    }
    
    // 验证OpenAI API密钥（如果需要）
    if (needToValidateOpenAI) {
      console.log("验证OpenAI API密钥...");
      const isOpenAIValid = await validateOpenAIApiKey(openaiApiKey);
      if (!isOpenAIValid) {
        validationResults = false;
      }
    }
    
    // 如果任何验证失败，终止保存
    if (!validationResults) {
      setError("API密钥验证失败，请先验证所有API密钥或移除它们");
      setIsSaving(false);
      clearError();
      return false;
    }
    
    // 所有验证通过，执行保存
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
        groqModels || undefined
      );
      setMessage("保存成功");
      clearMessage();
      
      // 保存成功后更新初始API密钥值
      setInitialGroqApiKey(groqApiKey);
      setInitialSiliconFlowApiKey(siliconFlowApiKey);
      setInitialOpenAIApiKey(openaiApiKey);
      
      // 保存成功后重置LLM客户端缓存，确保使用最新的API密钥
      resetLLMClientCache();
      
      // 同时保存设置到localStorage，以便客户端功能使用
      try {
        const localSettings = {
          openaiApiKey: openaiApiKey || '',
          openaiUrl: openaiUrl || '',
          openaiModel: model || 'gpt-3.5-turbo',
          groqApiKey: groqApiKey || '',
          groqModels: groqModels || '',
          siliconFlowApiKey: siliconFlowApiKey || '',
          siliconFlowModels: siliconFlowModels || ''
        };
        localStorage.setItem('video_editor_settings', JSON.stringify(localSettings));
        console.log('设置已保存到本地存储');
      } catch (e) {
        console.error('保存设置到本地存储失败:', e);
      }
      
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
    groqKeyValid,
    siliconFlowKeyValid,
    openAIKeyValid,
    groqKeyInvalid,
    siliconFlowKeyInvalid,
    openAIKeyInvalid,
    validateGroqApiKey,
    validateSiliconFlowApiKey,
    validateOpenAIApiKey,
    initialGroqApiKey,
    initialSiliconFlowApiKey,
    initialOpenAIApiKey,
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
    
    // 如果API密钥已验证，URL变更后可能需要重新验证
    if (openAIKeyValid && openaiApiKey) {
      setOpenAIKeyValid(false);
      setOpenAIKeyInvalid(false);
      // 重置LLM客户端缓存
      resetLLMClientCache('openai');
    }
  }, [openAIKeyValid, openaiApiKey]);

  /**
   * 更新 OpenAI API Key
   */
  const updateOpenaiApiKey = useCallback((key: string) => {
    setOpenaiApiKey(key);
    
    // 如果密钥与初始加载值相同，保持为已验证状态
    if (key === initialOpenAIApiKey) {
      console.log("OpenAI API密钥与初始加载值相同，保持已验证状态");
      setOpenAIKeyValid(true);
      setOpenAIKeyInvalid(false);
    } 
    // 如果密钥变更了，清除验证状态
    else if (key !== openaiApiKey) {
      console.log("OpenAI API密钥已更改，清除验证状态");
      setOpenAIKeyValid(false);
      setOpenAIKeyInvalid(false);
      // 重置LLM客户端缓存
      resetLLMClientCache('openai');
    }
  }, [openaiApiKey, initialOpenAIApiKey]);

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
    
    // 如果密钥与初始加载值相同，保持为已验证状态
    if (key === initialSiliconFlowApiKey) {
      console.log("硅基流动API密钥与初始加载值相同，保持已验证状态");
      setSiliconFlowKeyValid(true);
      setSiliconFlowKeyInvalid(false);
    } 
    // 如果密钥变更了，清除验证状态
    else if (key !== siliconFlowApiKey) {
      console.log("硅基流动API密钥已更改，清除验证状态");
      setSiliconFlowKeyValid(false);
      setSiliconFlowKeyInvalid(false);
      // 重置LLM客户端缓存
      resetLLMClientCache('siliconflow');
    }
  }, [siliconFlowApiKey, initialSiliconFlowApiKey]);
  
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
    
    // 如果密钥与初始加载值相同，保持为已验证状态
    if (key === initialGroqApiKey) {
      console.log("Groq API密钥与初始加载值相同，保持已验证状态");
      setGroqKeyValid(true);
      setGroqKeyInvalid(false);
    }
    // 如果密钥变更了，清除验证状态
    else if (key !== groqApiKey) {
      console.log("Groq API密钥已更改，清除验证状态");
      setGroqKeyValid(false);
      setGroqKeyInvalid(false);
      // 重置LLM客户端缓存
      resetLLMClientCache('groq');
    }
  }, [groqApiKey, initialGroqApiKey]);
  
  /**
   * 更新 Groq 模型列表
   */
  const updateGroqModels = useCallback((models: string) => {
    setGroqModels(models);
  }, []);
  
  /**
   * 处理文本内容变更
   */
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
  }, []);
  
  /**
   * 重置文本相关状态
   */
  const resetTextState = useCallback(() => {
    setInputText("");
    setError("");
    setMessage("");
  }, []);
  
  // 返回所有需要暴露的状态和方法
  return {
    inputText,
    comfyuiConfig,
    comfyuiUrl,
    openaiUrl,
    openaiApiKey,
    model,
    systemPrompt: null,
    siliconFlowApiKey,
    siliconFlowModels,
    groqApiKey,
    groqModels,
    isLoading,
    isSaving,
    error,
    message,
    isValidatingGroq,
    isValidatingSiliconFlow,
    isValidatingOpenAI,
    groqKeyValid,
    groqKeyInvalid,
    siliconFlowKeyValid,
    siliconFlowKeyInvalid,
    openAIKeyValid,
    openAIKeyInvalid,
    
    loadTextContent,
    saveTextContent,
    handleTextChange,
    updateComfyuiConfig,
    updateComfyuiUrl,
    updateOpenaiUrl,
    updateOpenaiApiKey,
    updateModel,
    updateSiliconFlowApiKey,
    updateSiliconFlowModels,
    updateGroqApiKey,
    updateGroqModels,
    validateGroqApiKey,
    validateSiliconFlowApiKey,
    validateOpenAIApiKey,
    resetTextState
  };
}; 