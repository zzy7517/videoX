"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
// 导入自定义 Hook
import { useShotManager } from '@/lib/features/shot/useShotManager';
// 导入认证相关组件
import { useAuth, ProtectedRoute } from '@/lib/features/auth';
import { Navbar } from '@/lib/features/auth/Navbar';

// 导入拆分后的组件
import { ScriptEditor } from './components/ScriptEditor';
import { CharacterEditor } from './components/CharacterEditor';
import { StoryboardEditor } from './components/StoryboardEditor';

// 导入常量
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_STORYBOARD_PROMPT } from './constants';

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
  
  // 添加分镜提取相关状态
  const [storyboardPrompt, setStoryboardPrompt] = useState<string>("");
  const [isExtractingStoryboard, setIsExtractingStoryboard] = useState(false);
  
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
    replaceShotsFromJson,
    
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
  
  // 从剧本中提取角色并生成文生图提示词的函数
  const extractCharactersFromScript = async () => {
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
      const { createLLMService } = await import('@/lib/features/llm');
      const llmService = createLLMService("", "", openaiKey, openaiUrl);
      
      // 准备消息，确保使用系统提示词，如果为空则使用默认系统提示词
      const messages = [
        {
          role: "system" as const,
          content: systemPrompt || DEFAULT_SYSTEM_PROMPT
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
  };
  
  // 从剧本中提取分镜的函数
  const extractStoryboardFromScript = async () => {
    if (!currentProjectId) {
      console.error("未选择项目，无法提取分镜");
      return;
    }
    
    if (!script || script.trim() === "") {
      setError("剧本内容为空，无法提取分镜");
      clearError();
      return;
    }
    
    setIsExtractingStoryboard(true);
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
      
      console.log(`使用模型 ${openaiModel} 提取分镜信息，API URL: ${openaiUrl}`);
      
      // 创建OpenAI客户端，传入URL
      const { createLLMService } = await import('@/lib/features/llm');
      const llmService = createLLMService("", "", openaiKey, openaiUrl);
      
      // 准备角色信息
      const charactersText = Object.keys(characters).length > 0 
        ? "已提取的角色信息：\n" + 
          Object.entries(characters)
            .map(([name, description]) => `角色 "${name}": ${description}`)
            .join('\n') + 
          "\n\n以下是剧本内容：\n"
        : "";
      
      // 准备消息，确保使用分镜提示词，如果为空则使用默认分镜提示词
      const messages = [
        {
          role: "system" as const,
          content: storyboardPrompt || DEFAULT_STORYBOARD_PROMPT
        },
        {
          role: "user" as const,
          content: charactersText + script
        }
      ];
      
      // 调用OpenAI API
      console.log(`正在调用OpenAI API (${openaiModel}) 提取分镜...`);
      const response = await llmService.chat(
        messages, 
        openaiModel,
        "openai"
      );
      
      // 解析响应
      try {
        let parsedResponse: { shots: any[] } = { shots: [] };
        
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
        
        if (!parsedResponse.shots || !Array.isArray(parsedResponse.shots) || parsedResponse.shots.length === 0) {
          throw new Error("无法解析AI响应为有效的分镜信息");
        }
        
        // 获取分镜数量
        const shotCount = parsedResponse.shots.length;
        
        // 直接使用replaceShotsFromJson函数处理JSON数据
        // 这样可以确保分镜的description和image_prompt字段
        // 被正确映射到系统的content和t2i_prompt字段
        console.log('准备替换的分镜数量:', parsedResponse.shots.length);
        
        // 将解析后的分镜数据重新打包成JSON字符串
        const shotsJson = JSON.stringify(parsedResponse);
        
        // 使用replaceShotsFromJson函数替换所有分镜
        await replaceShotsFromJson(shotsJson);
        
        // 提取成功后切换到分镜标签页
        setActiveTab("storyboard");
        
        // 显示成功消息，包含模型和分镜数量信息
        setError(`成功使用${openaiModel}从剧本提取出${shotCount}个分镜`);
        clearError();
        
      } catch (error) {
        console.error("解析分镜信息失败:", error);
        throw new Error("解析AI响应失败，请检查响应格式");
      }
      
    } catch (error) {
      console.error("提取分镜失败:", error);
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
        errorMsg = "从剧本提取分镜失败，请检查API配置和网络连接";
      }
      
      setError(errorMsg);
      clearError();
    } finally {
      setIsExtractingStoryboard(false);
    }
  };
  
  // 返回项目列表
  const goToProjects = () => {
    router.push('/projects');
  };

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
              <StoryboardEditor
                shots={shots}
                characters={characters}
                isLoadingShots={isLoadingShots}
                shotMessage={shotMessage}
                isDeletingAllShots={isDeletingAllShots}
                isBulkUpdating={isBulkUpdating}
                isInsertingShot={isInsertingShot}
                isDeletingShot={isDeletingShot}
                updateShotLocal={updateShotLocal}
                handleShotBlur={handleShotBlur}
                deleteShot={deleteShot}
                insertShot={insertShot}
                addShot={addShot}
                deleteAllShots={deleteAllShots}
              />
            </TabsContent>

            {/* 剧本内容 */}
            <TabsContent value="script" className="mt-6">
              <ScriptEditor
                script={script}
                isUpdatingScript={isUpdatingScript}
                updateScriptContent={updateScriptContent}
                handleScriptBlur={handleScriptBlur}
                saveScript={saveScript}
                storyboardPrompt={storyboardPrompt}
                setStoryboardPrompt={setStoryboardPrompt}
                extractStoryboardFromScript={extractStoryboardFromScript}
                isExtractingStoryboard={isExtractingStoryboard}
                setError={setError}
                clearError={clearError}
              />
            </TabsContent>

            {/* 角色内容 */}
            <TabsContent value="characters">
              <CharacterEditor
                characters={characters}
                systemPrompt={systemPrompt}
                isExtractingCharacters={isExtractingCharacters}
                isUpdatingCharacters={isUpdatingCharacters}
                script={script}
                updateCharactersInfo={updateCharactersInfo}
                saveCharacters={saveCharacters}
                setSystemPrompt={setSystemPrompt}
                extractCharactersFromScript={extractCharactersFromScript}
                setError={setError}
                clearError={clearError}
              />
            </TabsContent>
          </Tabs>

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