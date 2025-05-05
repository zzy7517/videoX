"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea, ScrollableTextarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// 导入自定义 Hook
import { useShotManager } from '@/lib/features/shot/useShotManager';
import { useTextManager } from '@/lib/features/config/useConfigManager';
// 导入认证相关组件
import { useAuth, ProtectedRoute } from '@/lib/features/auth';
import { Navbar } from '@/lib/features/auth/Navbar';

/**
 * 分镜编辑主页组件
 * 提供分镜的创建、编辑、删除、插入和文本导入功能
 */
export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  
  // 如果未登录且不在加载中，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 如果已登录但没有选择项目，重定向到项目页
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const projectId = searchParams.get('projectId');
      if (!projectId) {
        router.push('/projects');
      }
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  // 如果正在加载认证状态，显示加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }

  // 使用ProtectedRoute包装内容，确保只有登录用户才能访问
  return (
    <ProtectedRoute>
      <MainContent />
    </ProtectedRoute>
  );
}

// 分离出主要内容组件
function MainContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') ? parseInt(searchParams.get('projectId')!) : undefined;
  const router = useRouter();
  
  // === 使用自定义 Hook 管理分镜相关状态和操作 ===
  const {
    shots,
    isLoadingShots,
    shotMessage,
    isDeletingAllShots,
    isBulkUpdating,
    isInsertingShot,
    isDeletingShot,
    error: shotError,
    
    // 项目相关状态和操作
    projects,
    currentProjectId,
    isLoadingProjects,
    switchProject,
    
    addShot,
    updateShotLocal,
    handleShotBlur,
    deleteShot,
    insertShot,
    deleteAllShots,
    replaceShotsFromText
  } = useShotManager();

  // 确保当前项目ID与URL参数一致
  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      switchProject(projectId);
    }
  }, [projectId, currentProjectId, switchProject]);
  
  // 返回项目列表
  const goToProjects = () => {
    router.push('/projects');
  };

  // === 使用自定义 Hook 管理文本相关状态和操作 ===
  const {
    inputText,
    comfyuiConfig,
    isLoading,
    isSaving,
    error: textError,
    message: textMessage,
    
    loadTextContent,
    saveTextContent,
    handleTextChange,
    updateComfyuiConfig,
    resetTextState,
    comfyuiUrl,
    updateComfyuiUrl,
    openaiUrl,
    updateOpenaiUrl,
    openaiApiKey,
    updateOpenaiApiKey,
    model,
    updateModel,
    
    // LLM Config相关的状态和方法
    siliconFlowApiKey,
    updateSiliconFlowApiKey,
    siliconFlowModels,
    updateSiliconFlowModels,
    groqApiKey,
    updateGroqApiKey,
    groqModels,
    updateGroqModels,
    isValidatingGroq,
    validateGroqApiKey,
    isValidatingSiliconFlow,
    validateSiliconFlowApiKey,
    siliconFlowKeyValid,
    siliconFlowKeyInvalid,
    groqKeyValid,
    groqKeyInvalid,
    isValidatingOpenAI,
    validateOpenAIApiKey,
    openAIKeyValid,
    openAIKeyInvalid
  } = useTextManager();

  // 合并来自两个地方的错误
  const displayError = textError || shotError;
  // 使用文本管理器的消息
  const displayMessage = textMessage;

  // 处理项目切换
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = parseInt(e.target.value, 10);
    if (!isNaN(projectId)) {
      switchProject(projectId);
    }
  };

  // === UI 渲染 ===
  return (
    <>
      <Navbar title="VideoX" />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* 顶部操作栏 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                分镜编辑器
              </h1>
              
              {/* 项目信息和返回按钮 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToProjects}
                  className="flex items-center gap-1 text-slate-700 dark:text-slate-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  返回项目列表
                </Button>
                
                {projects.length > 0 && currentProjectId && (
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-2">
                    当前项目: {projects.find(p => p.project_id === currentProjectId)?.name || `项目 ${currentProjectId}`}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={deleteAllShots}
                disabled={isDeletingAllShots || !shots || shots.length === 0} 
                className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
              >
                {isDeletingAllShots ? "删除中..." : "清空所有分镜"}
              </Button>
            </div>
          </div>

          {/* 分镜列表 */}
        {isLoadingShots ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">加载分镜中...</div>
        ) : !shots || shots.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">暂无分镜，点击右下角 &quot;+&quot; 添加或导入文本。</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {Array.isArray(shots) && shots.map((shot) => (
              <Card
                key={shot.shot_id}
                className="group hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 relative"
              >
                {/* Loading/Inserting Indicator */}
                {(isInsertingShot === shot.shot_id || isDeletingShot === shot.shot_id) && (
                    <div className="absolute inset-0 bg-slate-200/30 dark:bg-slate-700/30 flex items-center justify-center z-10 rounded-lg">
                        <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-4 pl-4">
                  {/* 插入和标题区域 */}
                  <div className="flex items-center gap-1.5 flex-grow min-w-0">
                    {/* 向上插入按钮 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => insertShot(shot.shot_id, 'above')}
                      disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      title="在此分镜上方插入"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                            <line x1="5" y1="5" x2="19" y2="5" />
                        </svg>
                    </Button>

                    {/* 标题 */}
                    <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200 truncate" title={`分镜 ${shot.order} (ID: ${shot.shot_id})`}>
                      分镜 {shot.order}
                    </CardTitle>

                    {/* 向下插入按钮 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => insertShot(shot.shot_id, 'below')}
                      disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      title="在此分镜下方插入"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M19 12l-7 7-7-7"/>
                            <line x1="5" y1="19" x2="19" y2="19" />
                        </svg>
                    </Button>
                  </div>
                  {/* 删除按钮 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteShot(shot.shot_id)}
                    disabled={!Array.isArray(shots) || shots.length <= 1 || isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="删除此分镜"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </Button>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={shot.content}
                    onChange={(e) => updateShotLocal(shot.shot_id, { content: e.target.value })}
                    onBlur={(e) => handleShotBlur(shot.shot_id, { content: e.target.value })}
                    placeholder={`请输入分镜 ${shot.order} 的内容...`}
                    className="min-h-[120px] bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all mb-3"
                    disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                  />
                  {/* 新增：提示词文本框 */}
                  <Textarea
                    value={shot.t2i_prompt || ""}
                    onChange={(e) => updateShotLocal(shot.shot_id, { t2i_prompt: e.target.value })}
                    onBlur={(e) => handleShotBlur(shot.shot_id, { t2i_prompt: e.target.value })}
                    placeholder={`请输入分镜 ${shot.order} 的提示词...`}
                    className="min-h-[80px] bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                    disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                  />
                  {/* 保存状态提示 */}
                  {shotMessage?.id === shot.shot_id && (
                    <p className={`mt-2 text-xs ${shotMessage.type === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                      {shotMessage.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 悬浮添加按钮 (添加至末尾) */}
        <Button
          onClick={addShot}
          disabled={isLoadingShots || isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating} 
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-all z-50 flex items-center justify-center floating-btn slide-in-bottom backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          title="添加新分镜到末尾"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </Button>

        {/* 全局错误提示 */} 
        {displayError && (
             <div className="fixed bottom-8 left-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
                <span className="block sm:inline">{displayError}</span>
            </div>
        )}

        {/* 全局成功消息 */}
        {displayMessage && !displayError && (
             <div className="fixed bottom-8 left-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
                <span className="block sm:inline">{displayMessage}</span>
            </div>
        )}
        </div>
      </main>
    </>
  );
}

