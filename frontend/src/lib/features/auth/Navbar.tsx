"use client"

/**
 * 导航栏组件
 * 
 * 显示应用标题、登录按钮或用户菜单
 */
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './authContext';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = 'VideoX' }: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            </div>
            
            <div className="flex items-center">
              {isAuthenticated ? (
                <div className="relative ml-3">
                  <div>
                    <button
                      ref={buttonRef}
                      onClick={toggleUserMenu}
                      className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-gray-300"
                      aria-expanded="false"
                      aria-haspopup="true"
                    >
                      <span className="sr-only">打开用户菜单</span>
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                        {user?.username.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </button>
                  </div>
                  
                  {/* 用户菜单下拉 */}
                  {showUserMenu && (
                    <div
                      ref={menuRef}
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                      tabIndex={-1}
                    >
                      <div className="block px-4 py-2 text-sm text-gray-700 border-b">
                        <div>已登录为:</div>
                        <div className="font-medium">{user?.username}</div>
                      </div>
                      <div className="flex flex-col">
                        <a
                          href="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          tabIndex={-1}
                          id="user-menu-item-0"
                        >
                          设置
                        </a>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
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