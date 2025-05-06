"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
// 导入自定义 Hook
import { useShotManager } from '@/lib/features/shot/useShotManager';
// 导入认证相关组件
import { useAuth, ProtectedRoute } from '@/lib/features/auth';
import { Navbar } from '@/lib/features/auth/Navbar';
// 导入createLLMService函数
import { createLLMService } from '@/lib/features/llm';

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
  
  // 添加系统提示和提取角色相关状态
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isExtractingCharacters, setIsExtractingCharacters] = useState(false);
  const [editingCharacterText, setEditingCharacterText] = useState<string>("");
  const defaultSystemPrompt = `你是一位专业的角色设计师和剧本分析专家。请仔细分析以下剧本，提取所有角色并为每个角色创建详细的视觉描述。

请注意以下几点：
1. 识别剧本中出现的所有重要角色，包括主角、配角和关键的背景角色
2. 根据剧本中的描述、对话和行为推断每个角色的性格、年龄、服装和外观特征
3. 对于未明确描述外观的角色，请基于角色的身份、社会地位、情感状态和剧本的整体风格提供合理的视觉特征
4. 描述要具体、详细、富有想象力，且适合用于AI文生图(text-to-image)

输出格式要求：
请严格按照以下JSON格式输出所有角色信息：
{
  "角色名1": "详细的视觉描述，包括性别、年龄、身材、服装、发型、表情、特征等",
  "角色名2": "详细的视觉描述，包括性别、年龄、身材、服装、发型、表情、特征等"
}

只返回JSON格式的结果，不要包含其他解释性文字。确保JSON格式正确，可被直接解析。`;
  
  // === 使用自定义 Hook 管理分镜相关状态和操作 ===
  const {
    shots,
    isLoadingShots,
    shotMessage,
    isDeletingAllShots,
    isBulkUpdating,
    isInsertingShot,
    isDeletingShot,
    error,
    
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
    replaceShotsFromText,
    
    // 错误处理
    setError,
    clearError
  } = useShotManager();

  // 确保当前项目ID与URL参数一致
  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      switchProject(projectId);
    }
  }, [projectId, currentProjectId, switchProject]);
  
  // 从剧本中提取角色并生成文生图提示词
  const extractCharactersFromScript = useCallback(async () => {
    if (!currentProjectId) {
      console.error("未选择项目，无法提取角色");
      return;
    }
    
    if (!script || script.trim() === "") {
      setError("剧本内容为空，无法提取角色");
      clearError();
      return;
    }
    
    setIsExtractingCharacters(true);
    try {
      // 从localStorage获取API配置
      let openaiKey = "";
      let openaiModel = "";
      let openaiUrl = "";
      
      try {
        const settings = localStorage.getItem('video_editor_settings');
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          openaiKey = parsedSettings.openaiApiKey || "";
          openaiModel = parsedSettings.openaiModel || "";
          openaiUrl = parsedSettings.openaiUrl || "";
          
          console.log("从本地存储读取到OpenAI配置:", {
            keyExists: !!openaiKey,
            modelExists: !!openaiModel,
            urlExists: !!openaiUrl
          });
        } else {
          console.log("本地存储中没有找到API配置");
          throw new Error("未找到OpenAI设置，请先在设置页面配置");
        }
      } catch (e) {
        console.error("无法从本地存储获取API配置", e);
        throw new Error("无法读取OpenAI设置，请重新配置");
      }
      
      // 验证设置完整性
      if (!openaiKey) {
        throw new Error("未设置OpenAI API密钥，请在设置中配置");
      }
      
      if (!openaiModel) {
        throw new Error("未设置OpenAI模型，请在设置中配置");
      }
      
      if (!openaiUrl) {
        throw new Error("未设置OpenAI API地址，请在设置中配置");
      }
      
      console.log(`使用模型 ${openaiModel} 提取角色信息，API URL: ${openaiUrl}`);
      
      // 创建OpenAI客户端，传入URL
      const llmService = createLLMService("", "", openaiKey, openaiUrl);
      
      // 准备消息
      const messages = [
        {
          role: "system" as const,
          content: systemPrompt || defaultSystemPrompt
        },
        {
          role: "user" as const,
          content: script
        }
      ];
      
      // 调用OpenAI API
      console.log(`正在调用OpenAI API (${openaiModel}) 提取角色...`);
      const response = await llmService.chat(
        messages, 
        openaiModel,
        "openai"
      );
      
      // 解析响应
      try {
        let parsedResponse: {[key: string]: string} = {};
        
        // 尝试解析JSON
        // 如果响应是纯JSON，直接解析
        if (response.trim().startsWith('{') && response.trim().endsWith('}')) {
          parsedResponse = JSON.parse(response);
        } 
        // 如果响应包含代码块，提取代码块中的JSON
        else if (response.includes('```json')) {
          const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            parsedResponse = JSON.parse(jsonMatch[1]);
          }
        }
        // 如果上面方法都失败，尝试在响应中寻找任何JSON对象
        else {
          const jsonMatch = response.match(/{[\s\S]*?}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          }
        }
        
        if (Object.keys(parsedResponse).length === 0) {
          throw new Error("无法解析AI响应为有效的角色信息");
        }
        
        // 获取角色数量
        const characterCount = Object.keys(parsedResponse).length;
        
        // 更新角色信息
        updateCharactersInfo(parsedResponse);
        
        // 自动保存到后端
        await saveCharacters();
        
        // 提取成功后切换到角色标签页
        setActiveTab("characters");
        
        // 显示成功消息，包含模型和角色数量信息
        setError(`成功使用${openaiModel}从剧本提取出${characterCount}个角色`);
        clearError();
        
      } catch (error) {
        console.error("解析角色信息失败:", error);
        throw new Error("解析AI响应失败，请检查响应格式");
      }
      
    } catch (error) {
      console.error("提取角色失败:", error);
      let errorMsg = "";
      
      if (error instanceof Error) {
        // 检查是否是API密钥错误
        if (error.message.includes('API key')) {
          errorMsg = "OpenAI API密钥无效或未设置，请在设置中配置正确的API密钥";
        }
        // 检查是否是配额错误
        else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          errorMsg = "OpenAI API限额已用尽或速率受限，请稍后再试";
        }
        // 检查是否是模型错误
        else if (error.message.includes('model')) {
          errorMsg = "所选模型不可用或不存在，请在设置中检查模型配置";
        }
        // 检查是否是URL错误
        else if (error.message.includes('URL') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
          errorMsg = "无法连接到OpenAI API，请检查API URL配置和网络连接";
        }
        // 检查是否是请求错误
        else if (error.message.includes('status code 4') || error.message.includes('status code 5')) {
          errorMsg = `请求失败: ${error.message}，请检查API配置`;
        }
        else {
          errorMsg = error.message;
        }
      } else {
        errorMsg = "从剧本提取角色失败，请检查API配置和网络连接";
      }
      
      setError(errorMsg);
      clearError();
    } finally {
      setIsExtractingCharacters(false);
    }
  }, [script, systemPrompt, defaultSystemPrompt, currentProjectId, updateCharactersInfo, saveCharacters, setError, clearError]);
  
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
  
  // 初始化editingCharacterText
  useEffect(() => {
    setEditingCharacterText(characterText);
  }, [characterText]);

  // 处理角色文本变化
  const handleCharacterTextChange = useCallback((text: string) => {
    // 更新临时编辑状态
    setEditingCharacterText(text);
    
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
    // 确保文本框中的内容与characters状态同步
    try {
      // 将文本转换回对象格式
      const lines = editingCharacterText.split('\n').filter(line => line.trim());
      const newCharacters: {[key: string]: string} = {};
      
      lines.forEach(line => {
        const [name, description] = line.split(':', 2);
        if (name && description) {
          newCharacters[name.trim()] = description.trim();
        }
      });
      
      // 更新角色状态
      updateCharactersInfo(newCharacters);
      
      // 可以选择在失焦时自动保存
      // saveCharacters();
    } catch (e) {
      console.error('处理失焦事件时出错:', e);
    }
  }, [editingCharacterText, updateCharactersInfo]);

  // 标签切换时不再自动保存
  useEffect(() => {
    // 不再自动保存
  }, [activeTab]);

  // 添加角色编辑状态
  const [characterName, setCharacterName] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  
  // 处理添加新角色
  const handleAddCharacter = useCallback(() => {
    if (!characterName.trim() || !characterDescription.trim()) {
      setError("角色名和描述不能为空");
      clearError();
      return;
    }
    
    // 更新角色列表
    const newCharacters = { ...characters };
    
    // 如果是编辑现有角色且角色名已更改
    if (editingCharacterId && editingCharacterId !== characterName.trim()) {
      // 删除旧角色名
      delete newCharacters[editingCharacterId];
    }
    
    // 添加或更新角色
    newCharacters[characterName.trim()] = characterDescription.trim();
    updateCharactersInfo(newCharacters);
    
    // 清空输入框
    setCharacterName("");
    setCharacterDescription("");
    setEditingCharacterId(null);
  }, [characterName, characterDescription, characters, editingCharacterId, updateCharactersInfo, setError, clearError]);
  
  // 处理编辑角色
  const handleEditCharacter = useCallback((name: string) => {
    setEditingCharacterId(name);
    setCharacterName(name);
    setCharacterDescription(characters[name] || "");
  }, [characters]);
  
  // 处理删除角色
  const handleDeleteCharacter = useCallback((name: string) => {
    const newCharacters = { ...characters };
    delete newCharacters[name];
    updateCharactersInfo(newCharacters);
  }, [characters, updateCharactersInfo]);

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
                  `保存${activeTab === 'script' ? '剧本' : activeTab === 'characters' ? '角色' : ''}`
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
                  <CardTitle className="flex justify-between items-center">
                    <span>剧本编辑</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="在这里编写剧本内容..."
                      value={script || ""}
                      onChange={(e) => updateScriptContent(e.target.value)}
                      onBlur={() => handleScriptBlur()}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 角色内容 */}
            <TabsContent value="characters">
              <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>角色信息</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 添加提取角色Prompt输入框 */}
                    <div className="space-y-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
                      <label htmlFor="extract-characters-prompt" className="block text-sm font-medium text-purple-700 dark:text-purple-300">
                        提取角色Prompt
                      </label>
                      <Textarea
                        id="extract-characters-prompt"
                        className="h-24 font-mono text-sm bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-700"
                        placeholder="输入提示词，用于指导AI如何提取角色和生成提示词..."
                        value={systemPrompt || defaultSystemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                      />
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        将使用设置页面中配置的OpenAI信息进行分析。请确保在设置中已正确配置OpenAI的API密钥、模型和API地址，缺少任何一项都将无法使用此功能。
                      </p>
                    </div>
                    
                    {/* 添加提取角色按钮 */}
                        <div className="flex justify-end">
                          <Button
                        onClick={extractCharactersFromScript}
                        disabled={isExtractingCharacters || !script || script.trim() === ""}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isExtractingCharacters ? (
                          <><span className="mr-2">提取中...</span><span className="animate-spin">⟳</span></>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                            从剧本提取角色
                          </>
                        )}
                          </Button>
                        </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      以"角色名:角色描述"的格式编辑角色信息，每行一个角色。角色描述将用作文生图提示词。
                    </p>
                    
                    <div className="mt-6">
                      <div className="flex items-center mb-4">
                        <div className="flex-grow h-px bg-slate-200 dark:bg-slate-700"></div>
                        <h3 className="px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                          角色编辑区域
                        </h3>
                        <div className="flex-grow h-px bg-slate-200 dark:bg-slate-700"></div>
                      </div>
                      
                      {/* 角色输入表单 */}
                      <div className="space-y-4 bg-white/70 dark:bg-slate-800/70 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="space-y-2">
                          <label htmlFor="character-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            角色名称
                          </label>
                          <Input
                            id="character-name"
                            value={characterName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCharacterName(e.target.value)}
                            placeholder="请输入角色名称..."
                            className="bg-white dark:bg-slate-900"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="character-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            角色描述
                          </label>
                          <Textarea
                            id="character-description"
                            value={characterDescription}
                            onChange={(e) => setCharacterDescription(e.target.value)}
                            placeholder="请输入角色描述（用于生成图像的提示词）..."
                            className="min-h-[100px] bg-white dark:bg-slate-900"
                          />
                        </div>
                        
                        <div className="flex justify-end">
                          {editingCharacterId && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCharacterName("");
                                setCharacterDescription("");
                                setEditingCharacterId(null);
                              }}
                              className="mr-2"
                            >
                              取消
                            </Button>
                          )}
                          <Button
                            onClick={handleAddCharacter}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {editingCharacterId ? "更新角色" : "添加角色"}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <h3 className="text-lg font-medium mb-2">角色列表</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(characters || {}).map(([name, description]) => (
                          <div key={name} className="border rounded-lg p-4 bg-white/80 dark:bg-slate-800/80 relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCharacter(name)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCharacter(name)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                              </Button>
                            </div>
                            <h4 className="font-bold text-md">{name}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
                          </div>
                        ))}
                        {Object.keys(characters || {}).length === 0 && (
                          <p className="text-slate-500 dark:text-slate-400 col-span-2 text-center py-8">
                            暂无角色信息。你可以使用上方的表单添加角色，或从剧本标签页使用AI自动提取。
                          </p>
                        )}
                      </div>
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
        {error && (
            <div className="fixed bottom-8 left-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
        )}

        {/* 全局成功消息 */}
        {shotMessage && !error && shotMessage.type !== 'error' && (
            <div className="fixed bottom-8 left-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
              <span className="block sm:inline">{shotMessage.message}</span>
            </div>
        )}
        </div>
      </main>
    </>
  );
} 