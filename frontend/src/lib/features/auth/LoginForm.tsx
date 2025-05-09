"use client"

/**
 * 登录表单组件
 */
import React, { useState } from 'react';
import { useAuth } from './authContext';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { loginOrRegister, error, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isNewUser, setIsNewUser] = useState(false);
  const [username, setUsername] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginOrRegister(formData);
      if (result.is_new_user) {
        setIsNewUser(true);
        setUsername(result.username);
      } else {
        if (onSuccess) onSuccess();
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      // 错误已由useAuth处理
    }
  };

  // 新用户欢迎屏幕
  if (isNewUser) {
    return (
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-slate-700">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">欢迎加入!</h2>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">您的账户已创建成功</p>
          <p>您的用户名是: <span className="font-mono">{username}</span></p>
          <p className="text-sm mt-2">您可以在个人设置中修改用户名。</p>
        </div>
        
        <button
          onClick={() => {
            setIsNewUser(false);
            if (onSuccess) onSuccess();
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          开始使用
        </button>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white dark:bg-slate-700 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">登录 / 注册</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label 
            htmlFor="email" 
            className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
          >
            邮箱
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-slate-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            required
          />
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="password" 
            className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
          >
            密码
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-slate-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入密码（至少6个字符）"
            required
            minLength={6}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? '处理中...' : '登录 / 注册'}
          </button>
        </div>
        
        <p className="text-center text-sm text-gray-500 dark:text-gray-300 mt-4">
          输入邮箱和密码登录，如果账号不存在会自动注册。
        </p>
      </form>
    </div>
  );
} 