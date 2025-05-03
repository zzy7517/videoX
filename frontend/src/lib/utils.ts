import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 封装fetch函数，自动添加认证头
 * @param url - 请求地址
 * @param options - 请求选项
 * @returns Promise with response
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // 从localStorage获取token
  const token = localStorage.getItem('auth_token');
  
  // 添加调试信息
  console.log(`[fetchWithAuth] 请求: ${url}, Token存在: ${!!token}`);
  
  // 确保请求不会被重定向到后端URL
  // 如果URL不是以/api开头且不是完整URL，添加/api前缀
  if (!url.startsWith('/api') && !url.startsWith('http')) {
    url = `/api${url.startsWith('/') ? '' : '/'}${url}`;
    console.log(`[fetchWithAuth] 规范化URL为: ${url}`);
  }
  
  // 准备请求头
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  
  // 如果有token，添加到Authorization头
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('[fetchWithAuth] 警告: 无认证令牌');
  }
  
  // 返回带认证头的fetch请求
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // 记录响应状态
    console.log(`[fetchWithAuth] 响应状态: ${response.status} ${response.statusText}`);
    
    return response;
  } catch (error) {
    console.error('[fetchWithAuth] 请求失败:', error);
    throw error;
  }
}
