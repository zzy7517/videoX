"use client"

/**
 * 导航栏组件
 * 
 * 显示应用标题、登录按钮或用户菜单
 */
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './authContext';
import { AuthModal } from './AuthModal';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTextarea } from "@/components/ui/textarea";
import { useTextManager } from '@/lib/features/config/useConfigManager';
import { replaceShotsFromText } from '@/lib/features/shot/shotApi';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = 'VideoX' }: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [saveButtonClicked, setSaveButtonClicked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 使用文本配置钩子
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

  // 打开登录模态框
  const openLoginModal = () => {
    setShowAuthModal(true);
  };

  // 关闭认证模态框
  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  // 切换用户菜单
  const toggleUserMenu = () => {
    setShowUserMenu(prev => !prev);
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  // 当设置对话框打开时加载文本
  useEffect(() => {
    if (settingsDialogOpen) {
      loadTextContent();
    }
  }, [settingsDialogOpen, loadTextContent]);

  // 关闭设置对话框时的清理
  const handleSettingsDialogChange = (open: boolean) => {
    setSettingsDialogOpen(open);
    if (!open) {
      resetTextState();
    }
  }

  // 处理点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showUserMenu && 
        menuRef.current && 
        buttonRef.current && 
        !menuRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <>
      <nav className="bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 设置按钮 */}
              {isAuthenticated && (
                <Dialog open={settingsDialogOpen} onOpenChange={handleSettingsDialogChange}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span className="sr-only">设置</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[800px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">设置</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="comfyui-config" className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                      <TabsList className="flex-shrink-0 flex flex-col h-auto mb-4 sm:mb-0 sm:mr-4 sm:border-r sm:pr-2">
                        <TabsTrigger value="comfyui-config" className="justify-start mb-2">ComfyUI设置</TabsTrigger>
                        <TabsTrigger value="t2i-copilot" className="justify-start">大语言模型设置</TabsTrigger>
                      </TabsList>

                      <div className="flex-grow overflow-y-auto pr-2">
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
                              disabled={isLoading || isSaving}
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
                            disabled={isLoading || isSaving} 
                          />
                          {textError && (
                            <p className="text-red-500 text-sm">{textError}</p>
                          )}
                          {textMessage && (
                            <p className="text-green-500 text-sm">{textMessage}</p>
                          )}
                        </TabsContent>

                        {/* LLM 设置 */}
                        <TabsContent value="t2i-copilot" className="space-y-4 py-2 mt-0 h-full">
                          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-600 dark:text-blue-300">
                            此处配置用于LLM功能，包含语言模型(LLM)设置，数据将以JSON格式存储在后端。
                          </div>
                        
                          {/* 免费LLM设置部分 */}
                          <div className="space-y-4 border p-4 rounded-md">
                            <h3 className="font-medium flex items-center gap-1.5">
                              免费LLM设置
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                免费
                              </span>
                            </h3>
                          
                            {/* 硅基流动配置 */}
                            <div className="space-y-4 border-b pb-4 mb-4">
                              <h4 className="font-medium">硅基流动配置</h4>
                              
                              {/* 硅基流动的apikey */}
                              <div className="space-y-2">
                                <label htmlFor="silicon-flow-apikey" className="block text-sm font-medium">
                                  API Key
                                </label>
                                <div className="flex gap-2 items-center">
                                <input
                                  id="silicon-flow-apikey"
                                  type="password"
                                  value={siliconFlowApiKey || ''}
                                  onChange={(e) => updateSiliconFlowApiKey(e.target.value)}
                                  placeholder="输入硅基流动的 API Key"
                                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                  disabled={isLoading || isSaving}
                                />
                                  {siliconFlowApiKey && (
                                    <div className="flex gap-2 items-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => validateSiliconFlowApiKey(siliconFlowApiKey)}
                                        disabled={isValidatingSiliconFlow || isSaving || isLoading}
                                        className="flex-shrink-0 text-xs h-auto py-2"
                                      >
                                        {isValidatingSiliconFlow ? "验证中..." : "验证"}
                                      </Button>
                                      {siliconFlowKeyValid && (
                                        <svg className="text-green-500 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {siliconFlowKeyInvalid && (
                                        <svg className="text-red-500 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                    </div>
                                  )}
                                </div>
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
                                  disabled={isLoading || isSaving}
                                />
                              </div>
                            </div>
                            
                            {/* Groq 配置 */}
                            <div className="space-y-4">
                              <h4 className="font-medium">Groq 配置</h4>
                              
                              {/* Groq API Key */}
                              <div className="space-y-2">
                                <label htmlFor="groq-apikey" className="block text-sm font-medium">
                                  API Key
                                </label>
                                <div className="flex gap-2 items-center">
                                <input
                                  id="groq-apikey"
                                  type="password"
                                  value={groqApiKey || ''}
                                  onChange={(e) => updateGroqApiKey(e.target.value)}
                                  placeholder="输入 Groq 的 API Key"
                                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                  disabled={isLoading || isSaving}
                                />
                                  {groqApiKey && (
                                    <div className="flex gap-2 items-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => validateGroqApiKey(groqApiKey)}
                                        disabled={isValidatingGroq || isSaving || isLoading}
                                        className="flex-shrink-0 text-xs h-auto py-2"
                                      >
                                        {isValidatingGroq ? "验证中..." : "验证"}
                                      </Button>
                                      {groqKeyValid && (
                                        <svg className="text-green-500 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {groqKeyInvalid && (
                                        <svg className="text-red-500 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                    </div>
                                  )}
                                </div>
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
                                  disabled={isLoading || isSaving}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* 付费LLM设置部分 */}
                          <div className="space-y-4 border p-4 rounded-md">
                            <h3 className="font-medium flex items-center gap-1.5">
                              OpenAI设置
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                付费
                              </span>
                            </h3>
                            
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
                                disabled={isLoading || isSaving}
                              />
                            </div>
                            
                            {/* OpenAI API Key 输入框 */}
                            <div className="space-y-2">
                              <label htmlFor="openai-api-key" className="block text-sm font-medium">
                                OpenAI API Key
                              </label>
                              <div className="flex gap-2 items-center">
                                <input
                                  id="openai-api-key"
                                  type="password"
                                  value={openaiApiKey || ''}
                                  onChange={(e) => updateOpenaiApiKey(e.target.value)}
                                  placeholder="输入 OpenAI API Key"
                                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                  disabled={isLoading || isSaving}
                                />
                                {openaiApiKey && (
                                  <div className="flex gap-2 items-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => validateOpenAIApiKey(openaiApiKey)}
                                      disabled={isValidatingOpenAI || isSaving || isLoading}
                                      className="flex-shrink-0 text-xs h-auto py-2"
                                    >
                                      {isValidatingOpenAI ? "验证中..." : "验证"}
                                    </Button>
                                    {openAIKeyValid && (
                                      <svg className="text-green-500 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                    {openAIKeyInvalid && (
                                      <svg className="text-red-500 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* LLM Model 输入框 */}
                            <div className="space-y-2">
                              <label htmlFor="llm-model" className="block text-sm font-medium">
                                LLM Model
                              </label>
                              <input
                                id="llm-model"
                                type="text"
                                value={model || ''}
                                onChange={(e) => updateModel(e.target.value)}
                                placeholder="输入使用的 LLM 模型名称 (例如 gpt-4o)"
                                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                disabled={isLoading || isSaving}
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
                    <DialogFooter className="flex flex-wrap gap-3 justify-end mt-6 pt-4 border-t relative">
                        <Button
                            variant="outline"
                            onClick={() => {
                              // 直接调用保存函数，让useConfigManager中的逻辑处理API密钥验证
                              // 在内部实现中，未修改的API密钥将被自动视为已验证
                              saveTextContent();
                              setSaveButtonClicked(false);
                            }}
                            disabled={isSaving || isLoading || isValidatingGroq || isValidatingSiliconFlow || isValidatingOpenAI}
                            className="hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            {isSaving ? "保存中..." : "保存设置"}
                        </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              {/* 主题切换按钮 */}
              <ThemeToggle />
              
              {isAuthenticated ? (
                <div className="relative ml-3">
                  <div>
                    <button
                      ref={buttonRef}
                      onClick={toggleUserMenu}
                      className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-gray-300 dark:focus:border-gray-600"
                      aria-expanded="false"
                      aria-haspopup="true"
                    >
                      <span className="sr-only">打开用户菜单</span>
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-200">
                        {user?.username.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </button>
                  </div>
                  
                  {/* 用户菜单下拉 */}
                  {showUserMenu && (
                    <div
                      ref={menuRef}
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 focus:outline-none z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                      tabIndex={-1}
                    >
                      <div className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b dark:border-gray-700">
                        <div>已登录为:</div>
                        <div className="font-medium">{user?.username}</div>
                      </div>
                      <div className="flex flex-col">
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          role="menuitem"
                          tabIndex={-1}
                          id="user-menu-item-2"
                        >
                          退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <button
                    onClick={openLoginModal}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 认证模态框 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
      />
    </>
  );
} 