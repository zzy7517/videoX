/**
 * 认证API服务
 * 
 * 处理与后端认证相关的API请求
 */
import { LoginRequest, LoginResponse, RegisterRequest, User } from './types';
import { fetchWithAuth } from '@/lib/utils';

// API基础URL - 使用相对路径，通过Next.js代理转发到后端
const API_BASE_URL = '/api';

/**
 * 用户登录
 * 
 * @param credentials 登录凭据
 * @returns 登录响应，包含令牌和用户信息
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // 使用FormData来符合后端OAuth2的要求
  const formData = new FormData();
  formData.append('username', credentials.username); // 后端将其视为邮箱
  formData.append('password', credentials.password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = '登录失败';
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.detail || errorMessage;
    } catch (e) {
      // 如果响应不是有效的JSON，使用默认错误消息
      console.error('登录响应解析失败:', errorText);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 用户登录或自动注册
 * 
 * @param credentials 登录凭据（邮箱和密码）
 * @returns 登录响应，包含令牌和用户信息，以及是否为新用户标志
 */
export async function loginOrRegister(credentials: { email: string; password: string }): Promise<LoginResponse & { is_new_user: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/login_or_register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = '操作失败';
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.detail || errorMessage;
    } catch (e) {
      console.error('响应解析失败:', errorText);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 用户注册
 * 
 * @param userData 注册信息
 * @returns 新创建的用户
 */
export async function register(userData: RegisterRequest): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '注册失败');
  }

  return response.json();
}

/**
 * 获取当前用户信息
 * 
 * @returns 当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await fetchWithAuth(`${API_BASE_URL}/auth/me`);

  if (!response.ok) {
    throw new Error('获取用户信息失败');
  }

  return response.json();
}

/**
 * 检查是否已登录
 * 
 * 通过获取当前用户信息来验证令牌有效性
 * 
 * @returns 是否已登录
 */
export async function checkAuth(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch (error) {
    return false;
  }
} 