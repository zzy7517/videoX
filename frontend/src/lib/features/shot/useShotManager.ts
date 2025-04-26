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

export interface ShotMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

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
  const updateShotLocal = useCallback((id: number, content: string) => {
    setShots(prev =>
      prev.map(shot =>
        shot.shot_id === id ? { ...shot, content } : shot
      )
    );
    // 设置延迟保存
    setupAutoSave(id, content);
  }, []);

  /**
   * 设置自动保存定时器
   */
  const setupAutoSave = useCallback((id: number, content: string) => {
    // 如果已有定时器则清除
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
    }
    // 设置 3 秒后自动保存的定时器
    saveTimersRef.current[id] = setTimeout(() => {
      saveShot(id, content);
      delete saveTimersRef.current[id];
    }, 3000);
  }, []);

  /**
   * 处理分镜文本框失焦事件，立即保存
   */
  const handleShotBlur = useCallback((id: number, content: string) => {
    // 如果存在自动保存定时器，先清除
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
      delete saveTimersRef.current[id];
    }
    // 立即触发保存
    saveShot(id, content);
  }, []);

  /**
   * 保存单个分镜内容到后端
   */
  const saveShot = useCallback(async (id: number, content: string) => {
    setShotMessage({ id, message: "保存中...", type: 'success' });

    try {
      await apiSaveShot(id, content);
      
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
  }, []);

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