"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// 导入自定义 Hook
import { useTextManager } from '@/lib/features/config/useConfigManager';
// 导入认证相关组件
import { useAuth, ProtectedRoute } from '@/lib/features/auth';
import { Navbar } from '@/lib/features/auth/Navbar';

/**
 * 设置页面
 * 提供系统配置和API设置功能
 */
export default function SettingsPage() {
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
      <SettingsContent />
    </ProtectedRoute>
  );
}

// 设置页面主要内容组件
function SettingsContent() {
  const router = useRouter();
  
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

  // 返回主页
  const goToHome = () => {
    router.push('/');
  };

  // 去编辑器页面
  const goToEditor = () => {
    router.push('/editor');
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
                系统设置
              </h1>
              
              {/* 返回按钮 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToHome}
                  className="flex items-center gap-1 text-slate-700 dark:text-slate-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  返回主页
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={goToEditor}
                className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-colors"
              >
                分镜编辑器
              </Button>
            </div>
          </div>

          {/* 配置选项卡 */}
          <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>系统配置</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="comfyui" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="comfyui">ComfyUI 配置</TabsTrigger>
                  <TabsTrigger value="language-models">语言模型设置</TabsTrigger>
                </TabsList>
                
                {/* ComfyUI配置选项卡 */}
                <TabsContent value="comfyui" className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        ComfyUI 服务器地址
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={comfyuiUrl}
                          onChange={(e) => updateComfyuiUrl(e.target.value)}
                          placeholder="http://127.0.0.1:8188"
                          className="flex-1 px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        ComfyUI Workflow 配置 (JSON)
                      </label>
                      <Textarea
                        value={comfyuiConfig}
                        onChange={(e) => updateComfyuiConfig(e.target.value)}
                        placeholder="请粘贴ComfyUI Workflow JSON配置"
                        className="min-h-[200px] bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 text-sm monospace font-mono"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                {/* 语言模型设置选项卡 */}
                <TabsContent value="language-models" className="space-y-6">
                  {/* OpenAI 设置 */}
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 space-y-4">
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">OpenAI 设置</h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        OpenAI API 地址
                      </label>
                      <input
                        type="text"
                        value={openaiUrl}
                        onChange={(e) => updateOpenaiUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        OpenAI API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={openaiApiKey}
                          onChange={(e) => updateOpenaiApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="flex-1 px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                        <Button 
                          onClick={validateOpenAIApiKey} 
                          disabled={isValidatingOpenAI || !openaiApiKey}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          {isValidatingOpenAI ? "验证中..." : "验证Key"}
                        </Button>
                      </div>
                      {openAIKeyValid && (
                        <p className="mt-1 text-sm text-green-600">API Key 有效</p>
                      )}
                      {openAIKeyInvalid && (
                        <p className="mt-1 text-sm text-red-600">API Key 无效，请检查后重试</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        模型名称
                      </label>
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => updateModel(e.target.value)}
                        placeholder="gpt-4o"
                        className="w-full px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                  </div>
                  
                  {/* Groq 设置 */}
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 space-y-4">
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Groq 设置</h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        Groq API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={groqApiKey}
                          onChange={(e) => updateGroqApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="flex-1 px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                        <Button 
                          onClick={validateGroqApiKey} 
                          disabled={isValidatingGroq || !groqApiKey}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          {isValidatingGroq ? "验证中..." : "验证Key"}
                        </Button>
                      </div>
                      {groqKeyValid && (
                        <p className="mt-1 text-sm text-green-600">API Key 有效</p>
                      )}
                      {groqKeyInvalid && (
                        <p className="mt-1 text-sm text-red-600">API Key 无效，请检查后重试</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        Groq 模型
                      </label>
                      <input
                        type="text"
                        value={groqModels}
                        onChange={(e) => updateGroqModels(e.target.value)}
                        placeholder="llama3-8b-8192"
                        className="w-full px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                  </div>
                  
                  {/* SiliconFlow 设置 */}
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 space-y-4">
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">SiliconFlow 设置</h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        SiliconFlow API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={siliconFlowApiKey}
                          onChange={(e) => updateSiliconFlowApiKey(e.target.value)}
                          placeholder="sf-..."
                          className="flex-1 px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                        <Button 
                          onClick={validateSiliconFlowApiKey} 
                          disabled={isValidatingSiliconFlow || !siliconFlowApiKey}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          {isValidatingSiliconFlow ? "验证中..." : "验证Key"}
                        </Button>
                      </div>
                      {siliconFlowKeyValid && (
                        <p className="mt-1 text-sm text-green-600">API Key 有效</p>
                      )}
                      {siliconFlowKeyInvalid && (
                        <p className="mt-1 text-sm text-red-600">API Key 无效，请检查后重试</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
                        SiliconFlow 模型
                      </label>
                      <input
                        type="text"
                        value={siliconFlowModels}
                        onChange={(e) => updateSiliconFlowModels(e.target.value)}
                        placeholder="gemma-7b"
                        className="w-full px-3 py-2 border rounded-md text-sm bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* 保存按钮 */}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={saveTextContent}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transition-shadow"
                >
                  {isSaving ? "保存中..." : "保存配置"}
                </Button>
              </div>
            </CardContent>
          </Card>

        {/* 全局错误提示 */} 
        {textError && (
            <div className="fixed bottom-8 left-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
              <span className="block sm:inline">{textError}</span>
            </div>
        )}

        {/* 全局成功消息 */}
        {textMessage && !textError && (
            <div className="fixed bottom-8 left-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
              <span className="block sm:inline">{textMessage}</span>
            </div>
        )}
        </div>
      </main>
    </>
  );
} 