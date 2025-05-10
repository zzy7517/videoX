import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Shot, 
  Project,
  loadShots as apiLoadShots,
  loadProjects as apiLoadProjects,
  addShot as apiAddShot, 
  saveShot as apiSaveShot,
  deleteShot as apiDeleteShot,
  insertShot as apiInsertShot,
  deleteAllShots as apiDeleteAllShots,
  replaceShotsFromText as apiReplaceShotsFromText,
  replaceShotsFromJson as apiReplaceShotsFromJson,
  getAllShots,
  getProjectInfo,
  updateScript as apiUpdateScript,
  updateCharacters as apiUpdateCharacters
} from './shotApi';
// 我们已经不再使用LLM服务，这里只保留类型定义
import type { LLMService } from '../llm';
import { createLLMService } from '../llm';
import { fetchWithAuth } from '@/lib/utils';

export interface ShotMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// 存储当前使用的模型索引
// const modelIndexes = {
//   current: 0,  // 当前要使用哪个API
//   groq: 0,     // Groq模型列表索引
//   siliconflow: 0 // 硅基流动模型列表索引
// };

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
 * 获取LLM客户端
 * 从缓存中获取或创建新的客户端实例
 * @param provider LLM提供商
 * @param groqApiKey Groq API密钥
 * @param siliconFlowApiKey 硅基流动API密钥
 * @param openaiApiKey OpenAI API密钥
 * @param openaiBaseURL OpenAI基础URL
 * @returns LLM服务实例
 */
export const getLLMClient = (
  provider: 'groq' | 'siliconflow' | 'openai', 
  groqApiKey: string = '', 
  siliconFlowApiKey: string = '',
  openaiApiKey: string = '',
  openaiBaseURL?: string
): LLMService | null => {
  // 根据提供商选择和验证API密钥
  switch (provider) {
    case 'groq':
      // 如果没有API密钥，返回null
      if (!groqApiKey) {
        console.error('缺少Groq API密钥');
        return null;
      }
      
      // 如果密钥与缓存中的不同或缓存为空，创建新实例
      if (!llmClientCache.groq || llmClientCache.groqApiKey !== groqApiKey) {
        console.log('创建新的Groq LLM客户端');
        llmClientCache.groq = createLLMService(groqApiKey, '', '', '');
        llmClientCache.groqApiKey = groqApiKey;
      }
      
      return llmClientCache.groq;
      
    case 'siliconflow':
      // 如果没有API密钥，返回null
      if (!siliconFlowApiKey) {
        console.error('缺少硅基流动API密钥');
        return null;
      }
      
      // 如果密钥与缓存中的不同或缓存为空，创建新实例
      if (!llmClientCache.siliconflow || llmClientCache.siliconflowApiKey !== siliconFlowApiKey) {
        console.log('创建新的硅基流动LLM客户端');
        llmClientCache.siliconflow = createLLMService('', siliconFlowApiKey, '', '');
        llmClientCache.siliconflowApiKey = siliconFlowApiKey;
      }
      
      return llmClientCache.siliconflow;
      
    case 'openai':
      // 如果没有API密钥，返回null
      if (!openaiApiKey) {
        console.error('缺少OpenAI API密钥');
        return null;
      }
      
      // 如果密钥与缓存中的不同或缓存为空，创建新实例
      if (!llmClientCache.openai || llmClientCache.openaiApiKey !== openaiApiKey) {
        console.log('创建新的OpenAI LLM客户端');
        llmClientCache.openai = createLLMService('', '', openaiApiKey, openaiBaseURL);
        llmClientCache.openaiApiKey = openaiApiKey;
      }
      
      return llmClientCache.openai;
      
    default:
      return null;
  }
};

/**
 * 分镜管理自定义 Hook
 * 封装所有与分镜相关的状态和操作逻辑
 */
export const useShotManager = () => {
  // === 状态定义 ===
  const [shots, setShots] = useState<Shot[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingShots, setIsLoadingShots] = useState(false);
  const [shotMessage, setShotMessage] = useState<{id: number | null, message: string, type: 'success' | 'error'} | null>(null);
  const [isDeletingAllShots, setIsDeletingAllShots] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isInsertingShot, setIsInsertingShot] = useState<number | null>(null);
  const [isDeletingShot, setIsDeletingShot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 剧本和角色状态
  const [script, setScript] = useState<string>("");
  const [characters, setCharacters] = useState<{[key: string]: string}>({});
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [isUpdatingCharacters, setIsUpdatingCharacters] = useState(false);

  // 自动保存定时器，使用数据库 id 作为 key
  const saveTimersRef = useRef<{[key: number]: NodeJS.Timeout}>({});
  // 剧本和角色保存定时器
  const scriptSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const charactersSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 清除错误提示的辅助函数
   */
  const clearError = useCallback(() => {
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  /**
   * 从服务器加载所有项目
   */
  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setError("");
    try {
      const data = await apiLoadProjects();
      setProjects(data);
      
      // 如果有项目且当前没有选择项目，自动选择第一个
      if (data.length > 0 && currentProjectId === null) {
        setCurrentProjectId(data[0].project_id);
      }
      
      return data;
    } catch (error) {
      console.error("加载项目失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法加载项目列表";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsLoadingProjects(false);
    }
  }, [clearError, currentProjectId]);

  /**
   * 从服务器加载所有分镜
   */
  const loadShots = useCallback(async () => {
    if (!currentProjectId) {
      console.log("未选择项目，无法加载分镜");
      return [];
    }
    
    setIsLoadingShots(true);
    setError("");
    try {
      const data = await apiLoadShots(currentProjectId);
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
  }, [clearError, currentProjectId]);

  /**
   * 切换当前项目
   */
  const switchProject = useCallback(async (projectId: number) => {
    if (currentProjectId === projectId) return;
    
    setIsLoadingShots(true);
    setCurrentProjectId(projectId);
    
    try {
      // 使用新API获取项目完整信息，包括分镜、剧本和角色
      const projectInfo = await getProjectInfo(projectId);
      
      // 更新各状态
      setShots(projectInfo.shots || []);
      setScript(projectInfo.script || "");
      setCharacters(projectInfo.characters || {});
      
    } catch (error) {
      console.error("切换项目失败:", error);
      const errorMsg = error instanceof Error ? error.message : "切换项目失败";
      setError(errorMsg);
      clearError();
    } finally {
      setIsLoadingShots(false);
    }
  }, [currentProjectId, clearError]);

  /**
   * 添加新分镜到列表末尾
   */
  const addShot = useCallback(async () => {
    if (!currentProjectId) {
      console.error("未选择项目，无法添加分镜");
      return [];
    }
    
    try {
      const updatedShots = await apiAddShot(currentProjectId);
      setShots(updatedShots);
      return updatedShots;
    } catch (error) {
      console.error("添加分镜失败:", error);
      const errorMsg = error instanceof Error ? error.message : "无法添加新分镜";
      setError(errorMsg);
      clearError();
      throw error;
    }
  }, [clearError, currentProjectId]);

  /**
   * 更新本地分镜状态（用于输入时的即时反馈）
   */
  const updateShotLocal = useCallback((id: number, updates: Partial<Pick<Shot, 'content' | 't2i_prompt' | 'characters'>>) => {
    setShots(prev =>
      prev.map(shot =>
        shot.shot_id === id ? { ...shot, ...updates } : shot
      )
    );
    
    // 确保有项目ID才能保存
    if (!currentProjectId) {
      console.error("未选择项目，无法保存分镜");
      return;
    }
    
    // 找到对应的shot，并合并更新
    const shotToSave = shots.find(s => s.shot_id === id);
    if (shotToSave) {
      // 设置延迟保存
      if (saveTimersRef.current[id]) {
        clearTimeout(saveTimersRef.current[id]);
      }
      
      const autoSaveData = { ...shotToSave, ...updates };
      
      // 判断是否需要生成提示词
      let shouldGeneratePrompt = false;
      
      // 与saveShot函数类似的逻辑
      if (updates.content && 
         ((!shotToSave.t2i_prompt || shotToSave.t2i_prompt === "") && 
          !('t2i_prompt' in updates && updates.t2i_prompt === "") ||
          (updates.content !== shotToSave.content && !('t2i_prompt' in updates)))) {
        shouldGeneratePrompt = true;
      }
      
      saveTimersRef.current[id] = setTimeout(() => {
        // 直接内联保存逻辑，而不是调用saveShot
        console.log(`自动保存分镜 ${id}`);
        setShotMessage({ id, message: "保存中...", type: 'success' });
        
        if (shouldGeneratePrompt) {
          console.log("自动保存时需要生成文生图提示词");
        }
        
        apiSaveShot(id, autoSaveData, currentProjectId)
          .then(() => {
            // 显示成功消息
            setShotMessage({ id, message: "已保存", type: 'success' });
            // 3秒后清除消息
            setTimeout(() => setShotMessage(prev => (prev?.id === id ? null : prev)), 3000);
          })
          .catch(error => {
            console.error(`保存分镜 ${id} 失败:`, error);
            setShotMessage({ id, message: "保存失败", type: 'error' });
            // 失败消息也停留3秒
            setTimeout(() => setShotMessage(prev => (prev?.id === id ? null : prev)), 3000);
          });
          
        delete saveTimersRef.current[id];
      }, 3000);
    }
  }, [shots, currentProjectId]);

  /**
   * 手动保存分镜内容到后端
   */
  const saveShot = useCallback(async (id: number, updates: Partial<Pick<Shot, 'content' | 't2i_prompt' | 'characters'>>) => {
    if (!currentProjectId) {
      console.error("未选择项目，无法保存分镜");
      return;
    }
    
    setShotMessage({ id, message: "保存中...", type: 'success' });

    try {
      // 查找当前分镜完整数据
      const currentShot = shots.find(s => s.shot_id === id);
      
      // 确定是否需要生成文生图提示词
      let shouldGeneratePrompt = false;
      
      // 修改判断逻辑：
      // 1. 如果内容有更新且当前提示词为空或未定义，生成新提示词
      // 2. 如果用户明确删除了提示词（updates中有t2i_prompt字段但值为空字符串），则不重新生成
      if (updates.content && 
         ((!currentShot?.t2i_prompt || currentShot.t2i_prompt === "") && 
          // 检查updates是否包含t2i_prompt字段且值为空字符串（用户主动删除）
          !('t2i_prompt' in updates && updates.t2i_prompt === "") ||
          // 内容变更且没有明确设置提示词
          (updates.content !== currentShot?.content && !('t2i_prompt' in updates)))) {
        shouldGeneratePrompt = true;
      }
      
      if (shouldGeneratePrompt) {
        console.log("需要生成文生图提示词");
      } else {
        console.log("跳过生成文生图提示词：", 
          'updates包含t2i_prompt字段:', 't2i_prompt' in updates,
          '提示词值:', updates.t2i_prompt);
      }

      // 等待API保存分镜内容
      await apiSaveShot(id, updates, currentProjectId);
        
      // 保存成功
      setShotMessage({ id, message: "已保存", type: 'success' });
      // 3秒后清除消息
      setTimeout(() => setShotMessage(prev => (prev?.id === id ? null : prev)), 3000);
    } catch (error) {
      console.error(`保存分镜 ${id} 失败:`, error);
      setShotMessage({ id, message: "保存失败", type: 'error' });
      // 失败消息也停留3秒
      setTimeout(() => setShotMessage(prev => (prev?.id === id ? null : prev)), 3000);
    }
  }, [shots, currentProjectId]);

  /**
   * 分镜输入框失焦事件处理
   */
  const handleShotBlur = useCallback((id: number, updates: Partial<Pick<Shot, 'content' | 't2i_prompt' | 'characters'>>) => {
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
      saveShot(id, updates);
    }
  }, [shots, saveShot]);

  /**
   * 删除指定 ID 的分镜
   */
  const deleteShot = useCallback(async (id: number) => {
    if (!currentProjectId) {
      console.error("未选择项目，无法删除分镜");
      return [];
    }
    
    // 防止删除最后一个分镜
    if (shots.length <= 1) {
      setError("至少保留一个分镜");
      clearError();
      return [];
    }

    // 清除可能存在的保存定时器
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
      delete saveTimersRef.current[id];
    }

    setIsDeletingShot(id);
    try {
      const updatedShots = await apiDeleteShot(id, currentProjectId);
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
  }, [shots.length, clearError, currentProjectId]);

  /**
   * 在指定分镜上方或下方插入新分镜
   */
  const insertShot = useCallback(async (referenceShotId: number, position: 'above' | 'below') => {
    if (!currentProjectId) {
      console.error("未选择项目，无法插入分镜");
      return [];
    }
    
    setIsInsertingShot(referenceShotId);
    try {
      const updatedShots = await apiInsertShot(referenceShotId, position, currentProjectId);
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
  }, [clearError, currentProjectId]);

  /**
   * 删除所有分镜
   */
  const deleteAllShots = useCallback(async () => {
    if (!currentProjectId) {
      console.error("未选择项目，无法删除分镜");
      return;
    }
    
    if (!confirm("确定要删除所有分镜吗？此操作不可撤销。")) {
      return;
    }

    setIsDeletingAllShots(true);
    try {
      // 清除所有保存定时器
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      saveTimersRef.current = {};

      await apiDeleteAllShots(currentProjectId);

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
  }, [loadShots, clearError, currentProjectId]);

  /**
   * 从文本批量替换分镜
   */
  const replaceShotsFromText = useCallback(async (text: string) => {
    if (!currentProjectId) {
      console.error("未选择项目，无法导入分镜");
      return [];
    }
    
    if (!text.trim()) {
      setError("文本内容为空，无法导入");
      clearError();
      return [];
    }

    // 清除所有保存定时器
    Object.values(saveTimersRef.current).forEach(clearTimeout);
    saveTimersRef.current = {};

    setIsBulkUpdating(true);
    setError("");
    try {
      const newShots = await apiReplaceShotsFromText(text, currentProjectId);
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
  }, [shots.length, clearError, currentProjectId]);

  /**
   * 从JSON批量替换分镜
   */
  const replaceShotsFromJson = useCallback(async (jsonData: string) => {
    if (!currentProjectId) {
      console.error("未选择项目，无法导入分镜");
      return [];
    }
    
    if (!jsonData.trim()) {
      setError("JSON数据为空，无法导入");
      clearError();
      return [];
    }

    // 清除所有保存定时器
    Object.values(saveTimersRef.current).forEach(clearTimeout);
    saveTimersRef.current = {};

    setIsBulkUpdating(true);
    setError("");
    try {
      const newShots = await apiReplaceShotsFromJson(jsonData, currentProjectId);
      setShots(newShots);
      return newShots;
    } catch (error) {
      console.error("从JSON批量替换分镜失败:", error);
      const errorMsg = error instanceof Error ? error.message : "从JSON导入分镜失败";
      setError(errorMsg);
      clearError();
      throw error;
    } finally {
      setIsBulkUpdating(false);
    }
  }, [shots.length, clearError, currentProjectId]);

  /**
   * 更新剧本内容
   */
  const updateScriptContent = useCallback(async (newScript: string) => {
    if (!currentProjectId) {
      console.error("未选择项目，无法更新剧本");
      return;
    }
    
    // 先更新本地状态，实现即时反馈
    setScript(newScript);
  }, [currentProjectId]);

  /**
   * 保存剧本内容到后端
   */
  const saveScript = useCallback(async () => {
    if (!currentProjectId) {
      console.error("未选择项目，无法保存剧本");
      return;
    }
    
    // 检查script是否为null或undefined
    if (script === null || script === undefined) {
      console.error("剧本内容为null或undefined，无法保存");
      setError("剧本内容无效，无法保存");
      clearError();
      return;
    }
    
    setIsUpdatingScript(true);
    try {
      console.log("正在保存剧本，内容长度:", script.length, "字节");
      
      // 检查script是否为JSON字符串，如果是，则需要先解析再传递内容
      let scriptContent = script;
      try {
        // 如果script是JSON字符串 (例如 "{}")，尝试解析并使用原始字符串
        if (script.trim().startsWith('{') && script.trim().endsWith('}')) {
          const parsedJson = JSON.parse(script);
          // 如果成功解析，则使用JSON.stringify后的内容
          scriptContent = JSON.stringify(parsedJson);
          console.log("检测到script是JSON对象字符串，已处理为:",scriptContent);
        }
      } catch (e) {
        // 解析失败，说明不是有效的JSON，使用原始内容
        console.log("script不是JSON格式，使用原始内容");
      }
      
      await apiUpdateScript(scriptContent, currentProjectId);
      // 设置成功消息
      setShotMessage({ id: null, message: "剧本保存成功", type: 'success' });
      setTimeout(() => {
        setShotMessage(null);
      }, 3000);
    } catch (error) {
      console.error("保存剧本失败:", error);
      // 更详细的错误信息
      if (error instanceof Error) {
        console.error("错误详情:", error.message, error.stack);
      }
      const errorMsg = error instanceof Error ? error.message : "保存剧本失败";
      setError(errorMsg);
      clearError();
    } finally {
      setIsUpdatingScript(false);
    }
  }, [script, currentProjectId, clearError]);

  /**
   * 处理剧本文本框失焦事件，3秒后保存
   */
  const handleScriptBlur = useCallback(() => {
    // 移除自动保存功能，仅在点击保存按钮时保存
    if (scriptSaveTimerRef.current) {
      clearTimeout(scriptSaveTimerRef.current);
      scriptSaveTimerRef.current = null;
    }
    
    // 不再设置自动保存定时器
  }, []);

  /**
   * 更新角色信息
   */
  const updateCharactersInfo = useCallback((newCharacters: {[key: string]: string}) => {
    if (!currentProjectId) {
      console.error("未选择项目，无法更新角色信息");
      return;
    }
    
    // 先更新本地状态，实现即时反馈
    setCharacters(newCharacters);
  }, [currentProjectId]);

  /**
   * 保存角色信息到后端
   */
  const saveCharacters = useCallback(async () => {
    if (!currentProjectId) {
      console.error("未选择项目，无法保存角色信息");
      return;
    }
    
    setIsUpdatingCharacters(true);
    try {
      await apiUpdateCharacters(characters, currentProjectId);
      // 设置成功消息
      setShotMessage({ id: null, message: "角色信息保存成功", type: 'success' });
      setTimeout(() => {
        setShotMessage(null);
      }, 3000);
    } catch (error) {
      console.error("保存角色信息失败:", error);
      const errorMsg = error instanceof Error ? error.message : "保存角色信息失败";
      setError(errorMsg);
      clearError();
    } finally {
      setIsUpdatingCharacters(false);
    }
  }, [characters, currentProjectId, clearError]);

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      if (scriptSaveTimerRef.current) clearTimeout(scriptSaveTimerRef.current);
      if (charactersSaveTimerRef.current) clearTimeout(charactersSaveTimerRef.current);
    };
  }, []);

  // 初始加载项目和分镜
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    // 项目相关状态
    projects,
    currentProjectId,
    isLoadingProjects,
    
    // 分镜相关状态
    shots,
    isLoadingShots,
    shotMessage,
    isDeletingAllShots,
    isBulkUpdating,
    isInsertingShot,
    isDeletingShot,
    error,
    
    // 项目相关操作
    loadProjects,
    switchProject,
    
    // 分镜相关操作
    loadShots,
    addShot,
    updateShotLocal,
    handleShotBlur,
    saveShot,
    deleteShot,
    insertShot,
    deleteAllShots,
    replaceShotsFromText,
    replaceShotsFromJson,
    
    // 剧本和角色相关
    script,
    characters,
    isUpdatingScript,
    isUpdatingCharacters,
    updateScriptContent,
    saveScript,
    handleScriptBlur,
    updateCharactersInfo,
    saveCharacters,
    
    // 辅助方法
    setError,
    clearError
  };
}; 