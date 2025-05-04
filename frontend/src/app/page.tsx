"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  const { isAuthenticated, isLoading } = useAuth();
  
  // 如果未登录且不在加载中，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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
    
    addShot,
    updateShotLocal,
    handleShotBlur,
    deleteShot,
    insertShot,
    deleteAllShots,
    replaceShotsFromText
  } = useShotManager();

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
    
    // T2I Copilot相关的状态和方法
    siliconFlowApiKey,
    updateSiliconFlowApiKey,
    siliconFlowModels,
    updateSiliconFlowModels,
    groqApiKey,
    updateGroqApiKey,
    groqModels,
    updateGroqModels,
    systemPrompt,
    updateSystemPrompt
  } = useTextManager();

  // === UI 状态 ===
  const [dialogOpen, setDialogOpen] = useState(false);

  /**
   * 将输入文本分割为分镜并导入
   */
  const splitByLines = async () => {
    try {
      // 首先保存设置
      await saveTextContent(); 
      // 检查保存过程中是否出现错误，如果textError被设置，则不继续执行导出
      if (textError) {
        console.error("保存设置失败，取消导出分镜:", textError);
        // 可以选择在这里显示一个更明确的错误消息给用户
        return; 
      }
      
      // 然后执行导出
      await replaceShotsFromText(inputText);
      resetTextState(); // 清空文本状态 (如果保存和导出都成功)
      setDialogOpen(false); // 关闭对话框
    } catch (error) {
      console.error("导入分镜失败:", error);
      // 错误信息由 hook 内部处理
    }
  }

  // 当对话框打开时加载文本
  useEffect(() => {
    if (dialogOpen) {
      loadTextContent();
    }
  }, [dialogOpen, loadTextContent]);

  // 关闭对话框时的清理
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetTextState();
    }
  }

  // 合并来自两个地方的错误
  const displayError = textError || shotError;
  // 合并来自两个地方的消息
  const displayMessage = textMessage || (dialogOpen ? "" : textMessage);

  // === UI 渲染 ===
  return (
    <>
      <Navbar title="VideoX" />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* 顶部操作栏 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              分镜编辑器
            </h1>
            <div className="flex flex-wrap gap-3">
              <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    设置
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">设置</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="text-input" className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                    <TabsList className="flex-shrink-0 flex flex-col h-auto mb-4 sm:mb-0 sm:mr-4 sm:border-r sm:pr-2">
                      <TabsTrigger value="text-input" className="justify-start mb-2">剧本</TabsTrigger>
                      <TabsTrigger value="comfyui-config" className="justify-start mb-2">comfyui设置</TabsTrigger>
                      <TabsTrigger value="llm-config" className="justify-start mb-2">LLM设置</TabsTrigger>
                      <TabsTrigger value="t2i-copilot" className="justify-start">T2I Copilot</TabsTrigger>
                    </TabsList>

                    <div className="flex-grow overflow-y-auto pr-2">
                      <TabsContent value="text-input" className="space-y-4 py-2 mt-0 h-full">
                        <ScrollableTextarea
                          value={inputText}
                          onChange={(e) => handleTextChange(e.target.value)}
                          placeholder="在此粘贴或输入文本，每行将成为一个分镜..."
                          className="min-h-[200px] max-h-[400px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          disabled={isBulkUpdating || isLoading || isSaving} 
                        />
                        {textError && (
                          <p className="text-red-500 text-sm">{textError}</p>
                        )}
                        {textMessage && (
                          <p className="text-green-500 text-sm">{textMessage}</p>
                        )}
                        <div className="flex justify-end mt-4">
                            <Button
                                onClick={splitByLines}
                                disabled={isBulkUpdating || !inputText.trim() || isLoading || isSaving} 
                                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity"
                            >
                                {isBulkUpdating ? "导出中..." : "剧本导出为分镜(覆盖)"}
                            </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="comfyui-config" className="space-y-4 py-2 mt-0 h-full">
                        {/* ComfyUI URL输入框 */}
                        <div className="space-y-2">
                          <label htmlFor="comfyui-url" className="block text-sm font-medium">
                            ComfyUI URL
                          </label>
                          <input
                            id="comfyui-url"
                            type="text"
                            value={comfyuiUrl}
                            onChange={(e) => updateComfyuiUrl(e.target.value)}
                            placeholder="输入ComfyUI服务URL..."
                            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            disabled={isBulkUpdating || isLoading || isSaving}
                          />
                        </div>
                        <ScrollableTextarea
                          value={comfyuiConfig ? JSON.stringify(comfyuiConfig, null, 2) : ""}
                          onChange={(e) => {
                            try {
                              const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                              updateComfyuiConfig(parsed);
                            } catch {
                              // 允许用户输入无效JSON，但不更新状态
                              console.log("无效的JSON格式");
                            }
                          }}
                          placeholder="在此粘贴JSON格式的ComfyUI配置..."
                          className="min-h-[200px] max-h-[400px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-sm"
                          disabled={isBulkUpdating || isLoading || isSaving} 
                        />
                        {textError && (
                          <p className="text-red-500 text-sm">{textError}</p>
                        )}
                        {textMessage && (
                          <p className="text-green-500 text-sm">{textMessage}</p>
                        )}
                      </TabsContent>

                      {/* 新增 LLM 设置内容 */}
                      <TabsContent value="llm-config" className="space-y-4 py-2 mt-0 h-full">
                        {/* OpenAI URL 输入框 */}
                        <div className="space-y-2">
                          <label htmlFor="openai-url" className="block text-sm font-medium">
                            OpenAI URL
                          </label>
                          <input
                            id="openai-url"
                            type="text"
                            value={openaiUrl || ''}
                            onChange={(e) => updateOpenaiUrl(e.target.value)}
                            placeholder="输入 OpenAI 兼容的 URL (例如 https://api.openai.com/v1)"
                            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            disabled={isBulkUpdating || isLoading || isSaving}
                          />
                        </div>
                        {/* OpenAI API Key 输入框 */}
                        <div className="space-y-2">
                          <label htmlFor="openai-api-key" className="block text-sm font-medium">
                            OpenAI API Key
                          </label>
                          <input
                            id="openai-api-key"
                            type="password"
                            value={openaiApiKey || ''}
                            onChange={(e) => updateOpenaiApiKey(e.target.value)}
                            placeholder="输入 OpenAI API Key"
                            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            disabled={isBulkUpdating || isLoading || isSaving}
                          />
                        </div>
                        {/* LLM Model 输入框 */}
                        <div className="space-y-2">
                          <label htmlFor="llm-model" className="block text-sm font-medium">
                            LLM Model (Optional)
                          </label>
                          <input
                            id="llm-model"
                            type="text"
                            value={model || ''}
                            onChange={(e) => updateModel(e.target.value)}
                            placeholder="输入使用的 LLM 模型名称 (例如 gpt-4o)"
                            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            disabled={isBulkUpdating || isLoading || isSaving}
                          />
                        </div>
                        {textError && (
                          <p className="text-red-500 text-sm">{textError}</p>
                        )}
                        {textMessage && (
                          <p className="text-green-500 text-sm">{textMessage}</p>
                        )}
                      </TabsContent>
                      
                      {/* T2I Copilot 设置 */}
                      <TabsContent value="t2i-copilot" className="space-y-4 py-2 mt-0 h-full">
                        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-600 dark:text-blue-300">
                          此处配置用于T2I Copilot功能，数据将以JSON格式存储在后端。
                        </div>
                      
                        {/* System Prompt */}
                        <div className="space-y-4 border p-4 rounded-md">
                          <h3 className="font-medium">System Prompt 配置</h3>
                          
                          <div className="space-y-2">
                            <label htmlFor="system-prompt" className="block text-sm font-medium">
                              System Prompt
                            </label>
                            <textarea
                              id="system-prompt"
                              value={systemPrompt || ''}
                              onChange={(e) => updateSystemPrompt(e.target.value)}
                              placeholder="这里的提示词会将分镜转化为对应的文生图提示词"
                              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm min-h-[100px]"
                              disabled={isBulkUpdating || isLoading || isSaving}
                            />
                          </div>
                        </div>
                        
                        {/* 硅基流动配置 */}
                        <div className="space-y-4 border p-4 rounded-md">
                          <h3 className="font-medium">硅基流动配置</h3>
                          
                          {/* 硅基流动的apikey */}
                          <div className="space-y-2">
                            <label htmlFor="silicon-flow-apikey" className="block text-sm font-medium">
                              API Key
                            </label>
                            <input
                              id="silicon-flow-apikey"
                              type="password"
                              value={siliconFlowApiKey || ''}
                              onChange={(e) => updateSiliconFlowApiKey(e.target.value)}
                              placeholder="输入硅基流动的 API Key"
                              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                              disabled={isBulkUpdating || isLoading || isSaving}
                            />
                          </div>
                          
                          {/* 硅基流动模型列表 */}
                          <div className="space-y-2">
                            <label htmlFor="silicon-flow-models" className="block text-sm font-medium">
                              模型列表
                            </label>
                            <textarea
                              id="silicon-flow-models"
                              value={siliconFlowModels || ''}
                              onChange={(e) => updateSiliconFlowModels(e.target.value)}
                              placeholder="输入模型名称，每行一个"
                              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm min-h-[80px]"
                              disabled={isBulkUpdating || isLoading || isSaving}
                            />
                          </div>
                        </div>
                        
                        {/* Groq 配置 */}
                        <div className="space-y-4 border p-4 rounded-md">
                          <h3 className="font-medium">Groq 配置</h3>
                          
                          {/* Groq API Key */}
                          <div className="space-y-2">
                            <label htmlFor="groq-apikey" className="block text-sm font-medium">
                              API Key
                            </label>
                            <input
                              id="groq-apikey"
                              type="password"
                              value={groqApiKey || ''}
                              onChange={(e) => updateGroqApiKey(e.target.value)}
                              placeholder="输入 Groq 的 API Key"
                              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                              disabled={isBulkUpdating || isLoading || isSaving}
                            />
                          </div>
                          
                          {/* Groq 模型列表 */}
                          <div className="space-y-2">
                            <label htmlFor="groq-models" className="block text-sm font-medium">
                              模型列表
                            </label>
                            <textarea
                              id="groq-models"
                              value={groqModels || ''}
                              onChange={(e) => updateGroqModels(e.target.value)}
                              placeholder="输入模型名称，每行一个"
                              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm min-h-[80px]"
                              disabled={isBulkUpdating || isLoading || isSaving}
                            />
                          </div>
                        </div>
                        
                        {textError && (
                          <p className="text-red-500 text-sm">{textError}</p>
                        )}
                        {textMessage && (
                          <p className="text-green-500 text-sm">{textMessage}</p>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                  <DialogFooter className="flex flex-wrap gap-3 justify-end mt-6 pt-4 border-t">
                      <Button
                          variant="outline"
                          onClick={saveTextContent}
                          disabled={isSaving || isBulkUpdating || isLoading}
                          className="hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                          {isSaving ? "保存中..." : "保存设置"}
                      </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

