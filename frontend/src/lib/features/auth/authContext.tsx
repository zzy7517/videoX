"use client"

/**
 * 认证上下文
 * 
 * 提供全局认证状态和相关操作
 */
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { AuthState, LoginRequest, RegisterRequest, User } from './types';
import * as authApi from './api';

// 初始认证状态
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// 认证动作类型
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' };

// 认证状态reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    default:
      return state;
  }
}

// 登录或注册请求类型
interface LoginOrRegisterRequest {
  email: string;
  password: string;
}

// 登录或注册响应类型
interface LoginOrRegisterResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  is_new_user: boolean;
}

// 认证上下文接口
interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  loginOrRegister: (credentials: LoginOrRegisterRequest) => Promise<LoginOrRegisterResponse>;
  logout: () => void;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 本地存储键
const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const TOKEN_DURATION = 60 * 60 * 1000; // 1小时，单位毫秒

/**
 * 认证提供者组件
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
      
      if (!token || !expiryStr) {
        dispatch({ type: 'LOGOUT' });
        return;
      }

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      
      // 检查令牌是否过期
      if (now > expiry) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        dispatch({ type: 'AUTH_FAILURE', payload: '会话已过期，请重新登录' });
        return;
      }

      try {
        dispatch({ type: 'AUTH_START' });
        // API现在会从本地存储自动获取token
        const user = await authApi.getCurrentUser();
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        dispatch({ type: 'AUTH_FAILURE', payload: '会话已过期，请重新登录' });
      }
    };

    initAuth();
  }, []);

  // 保存认证信息到本地存储
  const saveAuthData = (token: string) => {
    console.log('[AuthContext] 正在保存令牌到本地存储');
    const expiry = Date.now() + TOKEN_DURATION;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  };

  // 登录
  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authApi.login(credentials);
      
      const token = response.access_token;
      
      // 保存令牌到本地存储
      saveAuthData(token);
      
      // 获取完整的用户信息，API会自动使用本地存储中的token
      const user = await authApi.getCurrentUser();
      
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : '登录失败' });
    }
  };

  // 注册
  const register = async (userData: RegisterRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // 注册新用户
      await authApi.register(userData);
      
      // 注册成功后自动登录
      await login({
        username: userData.email, // 使用邮箱作为登录名
        password: userData.password,
      });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : '注册失败' });
    }
  };

  // 登录或注册
  const loginOrRegister = async (credentials: LoginOrRegisterRequest): Promise<LoginOrRegisterResponse> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // 登录或注册
      const response = await authApi.loginOrRegister(credentials);
      
      const token = response.access_token;
      
      // 保存令牌到本地存储
      saveAuthData(token);
      
      const user: User = {
        user_id: response.user_id,
        username: response.username,
        email: credentials.email
      };
      
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
      
      return response;
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : '操作失败' });
      throw error; // 向上级传递错误
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    dispatch({ type: 'LOGOUT' });
  };

  const value = {
    ...state,
    login,
    register,
    loginOrRegister,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 使用认证钩子
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
}

/**
 * 受保护路由组件
 * 如果用户未登录，则重定向到登录页面
 */
export function ProtectedRoute({ 
  children, 
  fallback = <div>请先登录...</div> 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>正在检查登录状态...</div>;
  }

  if (!isAuthenticated) {
    return fallback;
  }

  return <>{children}</>;
} 