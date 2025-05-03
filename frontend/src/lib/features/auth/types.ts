/**
 * 认证功能的类型定义
 */

// 用户基本信息类型
export interface User {
  user_id: number;
  username: string;
  email: string;
}

// 登录响应类型
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
}

// 注册请求类型
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 登录请求类型
export interface LoginRequest {
  username: string; // 实际上是邮箱
  password: string;
}

// 认证状态类型
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
} 