"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/lib/features/auth/LoginForm';
import { useAuth } from '@/lib/features/auth';

/**
 * 登录页面
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // 如果已登录，重定向到项目页
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/projects');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            VideoX
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            分镜与视频生成工具
          </p>
        </div>
        
        <LoginForm 
          onSuccess={() => {
            router.push('/projects');
          }}
        />
      </div>
    </div>
  );
} 