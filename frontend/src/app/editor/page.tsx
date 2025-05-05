"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
// 导入自定义 Hook
import { useShotManager } from '@/lib/features/shot/useShotManager';
// 导入认证相关组件
import { useAuth, ProtectedRoute } from '@/lib/features/auth';
import { Navbar } from '@/lib/features/auth/Navbar';

/**
 * 分镜编辑页面
 * 提供分镜的创建、编辑、删除、插入功能
 */
export default function EditorPage() {
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
      <EditorContent />
    </ProtectedRoute>
  );
}

// 分镜编辑器主要内容组件
function EditorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') ? parseInt(searchParams.get('projectId')!) : undefined;
  const router = useRouter();
  // 添加当前标签页状态
  const [activeTab, setActiveTab] = useState("storyboard");
  
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
    
    // 剧本和角色相关状态和操作
    script,
    characters,
    isUpdatingScript,
    isUpdatingCharacters,
    updateScriptContent,
    saveScript,
    handleScriptBlur,
    updateCharactersInfo,
    saveCharacters,
    
    addShot,
    updateShotLocal,
    handleShotBlur,
    deleteShot,
    insertShot,
    deleteAllShots,
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

  // 角色信息处理
  const characterText = useMemo(() => {
    // 将角色对象转换为编辑友好的格式: "角色名:描述\n角色名:描述"
    return Object.entries(characters || {})
      .map(([name, description]) => `${name}:${description}`)
      .join('\n');
  }, [characters]);

  // 处理角色文本变化
  const handleCharacterTextChange = useCallback((text: string) => {
    try {
      // 将文本转换回对象格式
      const lines = text.split('\n').filter(line => line.trim());
      const newCharacters: {[key: string]: string} = {};
      
      lines.forEach(line => {
        const [name, description] = line.split(':', 2);
        if (name && description) {
          newCharacters[name.trim()] = description.trim();
        }
      });
      
      updateCharactersInfo(newCharacters);
    } catch (e) {
      console.error('角色格式解析错误:', e);
    }
  }, [updateCharactersInfo]);

  // 处理角色编辑器失焦事件
  const handleCharactersBlur = useCallback(() => {
    // 移除自动保存功能，不再在失焦时自动保存
  }, []);

  // 标签切换时不再自动保存
  useEffect(() => {
    // 不再自动保存
  }, [activeTab]);

  // === UI 渲染 ===
  return (
    <>
      <Navbar title="视频分镜编辑" />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          {/* 顶部操作栏 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                分镜编辑器
              </h1>
              
              {/* 返回按钮 */}
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
                  返回项目
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={isLoadingShots || isUpdatingScript || isUpdatingCharacters}
                onClick={() => {
                  if (activeTab === 'script') {
                    saveScript();
                  } else if (activeTab === 'characters') {
                    saveCharacters();
                  }
                }}
                className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-colors"
              >
                {(activeTab === 'script' && isUpdatingScript) || (activeTab === 'characters' && isUpdatingCharacters) ? (
                  <><span className="mr-2">保存中...</span><span className="animate-spin">⟳</span></>
                ) : (
                  `立即保存${activeTab === 'script' ? '剧本' : activeTab === 'characters' ? '角色' : ''}`
                )}
              </Button>
            </div>
          </div>

          {/* 标签页 */}
          <Tabs defaultValue="storyboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="script" className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
                剧本
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                角色
              </TabsTrigger>
              <TabsTrigger value="storyboard" className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                分镜表
              </TabsTrigger>
            </TabsList>

            {/* 分镜表内容 */}
            <TabsContent value="storyboard">
              {isLoadingShots ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">加载分镜中...</div>
              ) : !shots || shots.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">暂无分镜，点击右下角 &quot;+&quot; 添加分镜。</div>
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
                      
                      {/* Header with shot order & controls */}
                      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                        <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-2 text-sm">
                            {shot.order}
                          </span>
                          分镜 {shot.order}
                        </CardTitle>
                        
                        <div className="flex items-center space-x-1">
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
                          disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating || shots.length <= 1}
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
                        {/* 提示词文本框 */}
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
            </TabsContent>

            {/* 剧本内容 */}
            <TabsContent value="script">
              <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex flex-col space-y-2">
                    <CardTitle className="text-xl font-bold">剧本</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      输入完成后，点击保存按钮即可保存剧本。
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      value={script || ""}
                      onChange={(e) => updateScriptContent(e.target.value)}
                      onBlur={handleScriptBlur}
                      placeholder="请输入剧本内容..."
                      className="min-h-[400px] bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      disabled={isUpdatingScript || isLoadingShots}
                    />
                    
                    {isUpdatingScript && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        <span className="inline-block mr-2 animate-spin">⟳</span>
                        正在保存剧本...
                      </p>
                    )}
                    
                    {shotMessage && shotMessage.id === null && (
                      <p className={`text-sm ${shotMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                        {shotMessage.message}
                      </p>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        onClick={saveScript}
                        disabled={isUpdatingScript || isLoadingShots}
                        variant="default"
                      >
                        {isUpdatingScript ? "保存中..." : "立即保存剧本"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 角色内容 */}
            <TabsContent value="characters">
              <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex flex-col space-y-2">
                    <CardTitle className="text-xl font-bold">角色</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      添加并编辑角色信息，每个角色包含名称和描述。
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(characters || {}).map(([name, description], index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white/80 dark:bg-slate-900/80">
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">角色名称</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                              const newCharacters = { ...characters };
                              const oldName = name;
                              // 删除旧key并添加新key，保持描述不变
                              delete newCharacters[oldName];
                              newCharacters[e.target.value] = description;
                              updateCharactersInfo(newCharacters);
                            }}
                            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            placeholder="角色名称"
                            disabled={isUpdatingCharacters || isLoadingShots}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">角色描述</label>
                          <input
                            type="text"
                            value={description}
                            onChange={(e) => {
                              const newCharacters = { ...characters };
                              newCharacters[name] = e.target.value;
                              updateCharactersInfo(newCharacters);
                            }}
                            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                            placeholder="角色描述"
                            disabled={isUpdatingCharacters || isLoadingShots}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newCharacters = { ...characters };
                              delete newCharacters[name];
                              updateCharactersInfo(newCharacters);
                            }}
                            disabled={isUpdatingCharacters || isLoadingShots}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30"
                            title="删除此角色"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* 新增角色按钮 */}
                    <Button
                      onClick={() => {
                        const newCharacters = { ...characters };
                        const newKey = `角色${Object.keys(newCharacters).length + 1}`;
                        newCharacters[newKey] = '';
                        updateCharactersInfo(newCharacters);
                      }}
                      disabled={isUpdatingCharacters || isLoadingShots}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 py-3 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      新增角色
                    </Button>
                    
                    {isUpdatingCharacters && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        <span className="inline-block mr-2 animate-spin">⟳</span>
                        正在保存角色信息...
                      </p>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        onClick={saveCharacters}
                        disabled={isUpdatingCharacters || isLoadingShots}
                        variant="default"
                      >
                        {isUpdatingCharacters ? "保存中..." : "保存角色信息"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        {/* 悬浮添加按钮 (添加至末尾) */}
        {activeTab === "storyboard" && (
          <>
            {/* 清空分镜悬浮按钮 */}
            <Button
              onClick={deleteAllShots}
              disabled={isDeletingAllShots || !shots || shots.length === 0}
              className="fixed bottom-28 right-8 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 z-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
              title="清空所有分镜"
            >
              {isDeletingAllShots ? (
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
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
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              )}
            </Button>
            
            <Button
              onClick={addShot}
              disabled={isLoadingShots || isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating} 
              className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 z-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
          </>
        )}

        {/* 全局错误提示 */} 
        {shotError && (
            <div className="fixed bottom-8 left-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
              <span className="block sm:inline">{shotError}</span>
            </div>
        )}

        {/* 全局成功消息 */}
        {shotMessage && !shotError && shotMessage.type !== 'error' && (
            <div className="fixed bottom-8 left-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
              <span className="block sm:inline">{shotMessage.message}</span>
            </div>
        )}
        </div>
      </main>
    </>
  );
} 