"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// 导入认证相关组件
import { useAuth, ProtectedRoute } from '@/lib/features/auth';
import { Navbar } from '@/lib/features/auth/Navbar';

/**
 * 主页组件
 * 重定向到项目管理页面
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

  // 如果已登录，重定向到项目页
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/projects');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">正在跳转到项目页面...</p>
      </div>
    </div>
  );
}

// 主要内容组件
function MainContent() {
  const router = useRouter();
  
  return (
    <>
      <Navbar title="VideoX" />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* 欢迎标题 */}
          <div className="flex flex-col items-center justify-center backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
              欢迎使用 VideoX
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-center max-w-2xl mb-8">
              VideoX 是一个强大的视频分镜管理工具，帮助您轻松创建、编辑和管理视频分镜。
            </p>
            
            {/* 功能导航卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-5xl">
              {/* 项目管理卡片 */}
              <Card className="hover:shadow-xl transition-all duration-300 backdrop-blur-sm cursor-pointer" 
                    onClick={() => router.push('/projects')}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200">项目管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400">创建、管理和选择您的视频项目</p>
                  <Button className="mt-4 w-full" variant="outline">查看项目</Button>
                </CardContent>
              </Card>
              
              {/* 分镜编辑器卡片 */}
              <Card className="hover:shadow-xl transition-all duration-300 backdrop-blur-sm cursor-pointer"
                    onClick={() => router.push('/editor')}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200">分镜编辑器</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400">创建和编辑视频分镜内容</p>
                  <Button className="mt-4 w-full" variant="outline">打开编辑器</Button>
                </CardContent>
              </Card>
              
              {/* 设置卡片 */}
              <Card className="hover:shadow-xl transition-all duration-300 backdrop-blur-sm cursor-pointer"
                    onClick={() => router.push('/settings')}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200">系统设置</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400">配置API和系统参数</p>
                  <Button className="mt-4 w-full" variant="outline">打开设置</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

