"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
// 导入自定义 Hook（更新路径）
import { useShotManager } from '@/lib/features/shot/useShotManager';
import { useTextManager } from '@/lib/features/text/useTextManager';

/**
 * 分镜编辑主页组件
 * 提供分镜的创建、编辑、删除、插入和文本导入功能
 */
export default function Home() {
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
    isLoading,
    isSaving,
    isClearing,
    error: textError,
    message: textMessage,
    
    loadTextContent,
    saveTextContent,
    clearTextContent,
    handleTextChange,
    resetTextState
  } = useTextManager();

  // === UI 状态 ===
  const [dialogOpen, setDialogOpen] = useState(false);

  /**
   * 将输入文本分割为分镜并导入
   */
  const splitByLines = async () => {
    try {
      await replaceShotsFromText(inputText);
      resetTextState(); // 清空文本状态
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
                  导入文本
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">文本导入</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Textarea
                    value={inputText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="在此粘贴或输入文本，每行将成为一个分镜..."
                    className="min-h-[200px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    disabled={isBulkUpdating || isLoading || isSaving || isClearing} 
                  />
                  {textError && (
                    <p className="text-red-500 text-sm">{textError}</p>
                  )}
                  {textMessage && (
                    <p className="text-green-500 text-sm">{textMessage}</p>
                  )}
                </div>
                <DialogFooter className="flex flex-wrap gap-3 justify-between">
                    {/* 左侧按钮组 */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={loadTextContent}
                            disabled={isLoading || isBulkUpdating || isSaving || isClearing}
                            className="hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            {isLoading ? "加载中..." : "加载原文"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={saveTextContent}
                            disabled={isSaving || isBulkUpdating || isLoading || isClearing}
                            className="hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            {isSaving ? "保存中..." : "保存原文"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={clearTextContent}
                            disabled={isClearing || isBulkUpdating || isLoading || isSaving}
                            className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                        >
                            {isClearing ? "清除中..." : "清除原文"}
                        </Button>
                    </div>
                    {/* 右侧主要操作按钮 */}
                    <Button
                        onClick={splitByLines}
                        disabled={isBulkUpdating || !inputText.trim() || isLoading || isSaving || isClearing} 
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity"
                    >
                        {isBulkUpdating ? "导入中..." : "导入为分镜(覆盖)"}
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
                    onChange={(e) => updateShotLocal(shot.shot_id, e.target.value)} 
                    onBlur={(e) => handleShotBlur(shot.shot_id, e.target.value)} 
                    placeholder={`请输入分镜 ${shot.order} 的内容...`}
                    className="min-h-[120px] bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all"
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
  )
}

