import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Shot, 
  loadShots as apiLoadShots,
  addShot as apiAddShot, 
  saveShot as apiSaveShot,
  deleteShot as apiDeleteShot,
  insertShot as apiInsertShot,
  deleteAllShots as apiDeleteAllShots,
  replaceShotsFromText as apiReplaceShotsFromText
} from './shotApi';
import { createLLMService, Message, LLMService } from '../llm';
import { fetchWithAuth } from '@/lib/utils';

export interface ShotMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// 存储当前使用的模型索引
const modelIndexes = {
  current: 0,  // 当前要使用哪个API
  groq: 0,     // Groq模型列表索引
  siliconflow: 0 // 硅基流动模型列表索引
};

// 缓存LLM客户端，避免重复创建
const llmClientCache = {
  groq: null as LLMService | null,
  siliconflow: null as LLMService | null,
  openai: null as LLMService | null,
  groqApiKey: "",
  siliconflowApiKey: "",
  openaiApiKey: ""
};

/**
 * 重置LLM客户端缓存
 * 应在更新API密钥设置时调用
 */
export const resetLLMClientCache = (provider?: 'groq' | 'siliconflow' | 'openai') => {
  if (!provider || provider === 'groq') {
    console.log('重置Groq LLM客户端缓存');
    llmClientCache.groq = null;
    llmClientCache.groqApiKey = "";
  }
  
  if (!provider || provider === 'siliconflow') {
    console.log('重置硅基流动LLM客户端缓存');
    llmClientCache.siliconflow = null;
    llmClientCache.siliconflowApiKey = "";
  }
  
  if (!provider || provider === 'openai') {
    console.log('重置OpenAI LLM客户端缓存');
    llmClientCache.openai = null;
    llmClientCache.openaiApiKey = "";
  }
};

/**
 * 分镜管理自定义 Hook
 * 封装所有与分镜相关的状态和操作逻辑
 */
export const useShotManager = () => {
  // === 状态定义 ===
  const [shots, setShots] = useState<Shot[]>([]);
  const [isLoadingShots, setIsLoadingShots] = useState(false);
  const [shotMessage, setShotMessage] = useState<ShotMessage | null>(null);
  const [isDeletingAllShots, setIsDeletingAllShots] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isInsertingShot, setIsInsertingShot] = useState<number | null>(null);
  const [isDeletingShot, setIsDeletingShot] = useState<number | null>(null);
  const [error, setError] = useState("");

  // 自动保存定时器，使用数据库 id 作为 key
  const saveTimersRef = useRef<{[key: number]: NodeJS.Timeout}>({});

  /**
   * 清除错误提示的辅助函数
   */
  const clearError = useCallback((delay = 3000) => {
    setTimeout(() => setError(""), delay);
  }, []);

  /**
   * 从服务器加载所有分镜
   */
  const loadShots = useCallback(async () => {
    setIsLoadingShots(true);
    setError("");
    try {
      const data = await apiLoadShots();
      setShots(data);
      if (data.length === 0) {
        console.log("加载到的分镜列表为空");
      }
      return data;
    } catch (error) {
      console.error("加载分镜失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法加载分镜列表";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsLoadingShots(false);
    }
  }, [clearError]);

  /**
   * 添加新分镜到列表末尾
   */
  const addShot = useCallback(async () => {
    try {
      const updatedShots = await apiAddShot();
      setShots(updatedShots);
      return updatedShots;
    } catch (error) {
      console.error("添加分镜失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法添加新分镜";
      setError(errorMsg);
      clearError();
      throw error;
    }
  }, [clearError]);

  /**
   * 更新本地分镜状态（用于输入时的即时反馈）
   */
  const updateShotLocal = useCallback((id: number, updates: Partial<Pick<Shot, 'content' | 't2i_prompt'>>) => {
    setShots(prev =>
      prev.map(shot =>
        shot.shot_id === id ? { ...shot, ...updates } : shot
      )
    );
    // 设置延迟保存
    // setupAutoSave(id, updates); // 修改 setupAutoSave 以接受对象
    // 找到对应的shot，并合并更新
    const shotToSave = shots.find(s => s.shot_id === id);
    if (shotToSave) {
      setupAutoSave(id, { ...shotToSave, ...updates });
    }
  }, [shots]); // 添加 shots 依赖

  /**
   * 设置自动保存定时器
   */
  const setupAutoSave = useCallback((id: number, shotData: Partial<Shot>) => {
    // 如果已有定时器则清除
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
    }
    // 设置 3 秒后自动保存的定时器
    saveTimersRef.current[id] = setTimeout(() => {
      saveShot(id, shotData);
      delete saveTimersRef.current[id];
    }, 3000);
  }, []); // 移除 saveShot 依赖，因为 saveShot 本身是 useCallback 且无依赖

  /**
   * 处理分镜文本框失焦事件，立即保存
   */
  const handleShotBlur = useCallback((id: number, updates: Partial<Pick<Shot, 'content' | 't2i_prompt'>>) => {
    // 如果存在自动保存定时器，先清除
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
      delete saveTimersRef.current[id];
    }
    // 立即触发保存
    // 找到对应的shot，并合并更新
    const shotToSave = shots.find(s => s.shot_id === id);
    if (shotToSave) {
        saveShot(id, { ...shotToSave, ...updates });
    } else {
        // 如果找不到 shot (理论上不应该发生)，只保存传入的更新
        saveShot(id, updates)
    }
  }, [shots]); // 添加 shots 依赖

  /**
   * 获取或创建LLM客户端
   */
  const getLLMClient = useCallback((provider: 'groq' | 'siliconflow' | 'openai', apiKey: string): LLMService => {
    // 检查是否需要重新创建客户端（API密钥变更）
    if (provider === 'groq') {
      if (!llmClientCache.groq || llmClientCache.groqApiKey !== apiKey) {
        console.log("创建新的Groq LLM客户端");
        llmClientCache.groq = createLLMService(apiKey, undefined);
        llmClientCache.groqApiKey = apiKey;
      }
      return llmClientCache.groq;
    } else if (provider === 'siliconflow') {
      if (!llmClientCache.siliconflow || llmClientCache.siliconflowApiKey !== apiKey) {
        console.log("创建新的硅基流动LLM客户端");
        llmClientCache.siliconflow = createLLMService(undefined, apiKey);
        llmClientCache.siliconflowApiKey = apiKey;
      }
      return llmClientCache.siliconflow;
    } else if (provider === 'openai') {
      if (!llmClientCache.openai || llmClientCache.openaiApiKey !== apiKey) {
        console.log("创建新的OpenAI LLM客户端");
        llmClientCache.openai = createLLMService(undefined, apiKey);
        llmClientCache.openaiApiKey = apiKey;
      }
      return llmClientCache.openai;
    }
    throw new Error("Invalid provider");
  }, []);

  /**
   * 保存单个分镜内容到后端
   */
  const saveShot = useCallback(async (id: number, shotData: Partial<Pick<Shot, 'content' | 't2i_prompt'>>) => {
    setShotMessage({ id, message: "保存中...", type: 'success' });

    try {
      // 查找当前分镜完整数据
      const currentShot = shots.find(s => s.shot_id === id);
      
      // 确定是否需要生成文生图提示词
      let shouldGeneratePrompt = false;
      
      // 修改判断逻辑：
      // 1. 如果内容有更新且当前提示词为空或未定义，生成新提示词
      // 2. 如果用户明确删除了提示词（shotData中有t2i_prompt字段但值为空字符串），则不重新生成
      if (shotData.content && 
         ((!currentShot?.t2i_prompt || currentShot.t2i_prompt === "") && 
          // 检查shotData是否包含t2i_prompt字段且值为空字符串（用户主动删除）
          !('t2i_prompt' in shotData && shotData.t2i_prompt === "") ||
          // 内容变更且没有明确设置提示词
          (shotData.content !== currentShot?.content && !('t2i_prompt' in shotData)))) {
        shouldGeneratePrompt = true;
      }
      
      if (shouldGeneratePrompt) {
        console.log("需要生成文生图提示词");
      } else {
        console.log("跳过生成文生图提示词：", 
          'shotData包含t2i_prompt字段:', 't2i_prompt' in shotData,
          '提示词值:', shotData.t2i_prompt);
      }
      
      // 如果需要生成提示词
      if (shouldGeneratePrompt) {
        // 查询是否配置了LLM设置
        const textResponse = await fetchWithAuth('/api/text/');
        const textData = await textResponse.json();
        const llmConfig = textData.llm_config || {};
        
        // 我们不再使用system_prompt，因为该字段已被移除
        // 这里可以在将来添加自定义提示词生成逻辑
        console.log("LLM配置:", {
          hasGroq: !!(llmConfig.groq_api_key && llmConfig.groq_models),
          hasSiliconFlow: !!(llmConfig.silicon_flow_api_key && llmConfig.silicon_flow_models),
          hasOpenAI: !!(llmConfig.openai_api_key && llmConfig.openai_url)
        });
        
        // todo 暂时移除自动提示词生成，因为需要重新设计这部分功能
        // 将来可以基于shotData.content自动生成提示词，无需system_prompt
      }

      await apiSaveShot(id, shotData); // 传递对象给 apiSaveShot

      // 更新本地状态，使生成的提示词显示在UI上
      setShots(prev => 
        prev.map(shot => 
          shot.shot_id === id 
            ? { ...shot, ...shotData } 
            : shot
        )
      );

      // 显示成功消息
      setShotMessage({ id, message: "已保存", type: 'success' });
      // 3秒后清除消息
      setTimeout(() => setShotMessage(prev => (prev?.id === id ? null : prev)), 3000);
    } catch (error) {
      console.error(`保存分镜 ${id} 失败:`, error);
      setShotMessage({ id, message: "保存失败", type: 'error' });
      // 失败消息也停留3秒
      setTimeout(() => setShotMessage(prev => (prev?.id === id ? null : prev)), 3000);
      throw error;
    }
  }, [shots, getLLMClient]);

  /**
   * 删除指定 ID 的分镜
   */
  const deleteShot = useCallback(async (id: number) => {
    // 防止删除最后一个分镜
    if (shots.length <= 1) {
      setError("至少保留一个分镜");
      clearError();
      return;
    }

    // 清除可能存在的保存定时器
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
      delete saveTimersRef.current[id];
    }

    setIsDeletingShot(id);
    try {
      const updatedShots = await apiDeleteShot(id);
      setShots(updatedShots);
      return updatedShots;
    } catch (error) {
      console.error(`删除分镜 ${id} 失败:`, error);
      const errorMsg = error instanceof Error ? error.message : "删除分镜失败";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsDeletingShot(null);
    }
  }, [shots.length, clearError]);

  /**
   * 在指定分镜上方或下方插入新分镜
   */
  const insertShot = useCallback(async (referenceShotId: number, position: 'above' | 'below') => {
    setIsInsertingShot(referenceShotId);
    try {
      const updatedShots = await apiInsertShot(referenceShotId, position);
      setShots(updatedShots);
      return updatedShots;
    } catch (error) {
      console.error("插入分镜失败:", error);
      const errorMsg = error instanceof Error ? error.message : "插入新分镜失败";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsInsertingShot(null);
    }
  }, [clearError]);

  /**
   * 删除所有分镜
   */
  const deleteAllShots = useCallback(async () => {
    if (!confirm("确定要删除所有分镜吗？此操作不可撤销。")) {
      return;
    }

    setIsDeletingAllShots(true);
    try {
      // 清除所有保存定时器
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      saveTimersRef.current = {};

      await apiDeleteAllShots();

      // 删除成功后，重新加载列表
      await loadShots();
    } catch (error) {
      console.error("删除所有分镜失败:", error);
      const errorMsg = error instanceof Error ? error.message : "删除所有分镜失败";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsDeletingAllShots(false);
    }
  }, [loadShots, clearError]);

  /**
   * 从文本批量替换分镜
   */
  const replaceShotsFromText = useCallback(async (text: string) => {
    if (!text.trim()) {
      setError("文本内容为空，无法导入");
      clearError();
      return;
    }

    if (shots.length > 0 && !confirm("此操作将会替换所有现有分镜，确定继续吗？")) {
      return;
    }

    // 清除所有保存定时器
    Object.values(saveTimersRef.current).forEach(clearTimeout);
    saveTimersRef.current = {};

    setIsBulkUpdating(true);
    setError("");
    try {
      const newShots = await apiReplaceShotsFromText(text);
      setShots(newShots);
      return newShots;
    } catch (error) {
      console.error("批量替换分镜失败:", error);
      const errorMsg = error instanceof Error ? error.message : "从文本导入分镜失败";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsBulkUpdating(false);
    }
  }, [shots.length, clearError]);

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // 初始加载分镜
  useEffect(() => {
    loadShots();
  }, [loadShots]);

  return {
    // 状态
    shots,
    isLoadingShots,
    shotMessage,
    isDeletingAllShots,
    isBulkUpdating,
    isInsertingShot,
    isDeletingShot,
    error,
    
    // 操作方法
    loadShots,
    addShot,
    updateShotLocal,
    handleShotBlur,
    saveShot,
    deleteShot,
    insertShot,
    deleteAllShots,
    replaceShotsFromText,
    
    // 辅助方法
    setError,
    clearError
  };
}; 