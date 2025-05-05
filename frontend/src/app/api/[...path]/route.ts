import { NextRequest, NextResponse } from 'next/server';

/**
 * API路由处理程序 - 转发请求到后端服务器
 * 
 * 这个API路由捕获/api/*下的所有请求并将其转发到后端
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const url = new URL(request.url);
  const queryString = url.search;

  // 从请求中获取认证头
  const authHeader = request.headers.get('Authorization');
  
  // 构建API URL
  const apiUrl = `http://localhost:8000/${pathString}${queryString}`;
  
  // 复制请求头，添加认证头
  const headers = new Headers();
  if (authHeader) {
    headers.append('Authorization', authHeader);
  }
  
  try {
    // 转发请求到后端
    const response = await fetch(apiUrl, {
      headers,
      cache: 'no-store',
    });
    
    // 创建新的响应并添加CORS头
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // 添加CORS响应头
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return newResponse;
  } catch (error) {
    console.error(`API代理错误 (GET ${pathString}):`, error);
    return new NextResponse(JSON.stringify({ error: '代理请求失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * POST请求处理程序 
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  
  // 从请求中获取认证头和请求体
  const authHeader = request.headers.get('Authorization');
  const body = await request.text();
  
  // 构建API URL
  const apiUrl = `http://localhost:8000/${pathString}`;
  
  // 复制请求头，添加认证头
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (authHeader) {
    headers.append('Authorization', authHeader);
  }
  
  try {
    // 转发请求到后端
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });
    
    // 创建新的响应并添加CORS头
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // 添加CORS响应头
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return newResponse;
  } catch (error) {
    console.error(`API代理错误 (POST ${pathString}):`, error);
    return new NextResponse(JSON.stringify({ error: '代理请求失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * PUT请求处理程序
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  
  // 从请求中获取认证头和请求体
  const authHeader = request.headers.get('Authorization');
  const body = await request.text();
  
  // 构建API URL
  const apiUrl = `http://localhost:8000/${pathString}`;
  
  // 复制请求头，添加认证头
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (authHeader) {
    headers.append('Authorization', authHeader);
  }
  
  try {
    // 转发请求到后端
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body,
      cache: 'no-store',
    });
    
    // 创建新的响应并添加CORS头
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // 添加CORS响应头
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return newResponse;
  } catch (error) {
    console.error(`API代理错误 (PUT ${pathString}):`, error);
    return new NextResponse(JSON.stringify({ error: '代理请求失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * DELETE请求处理程序
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  
  // 从请求中获取认证头
  const authHeader = request.headers.get('Authorization');
  
  // 构建API URL
  const apiUrl = `http://localhost:8000/${pathString}`;
  
  // 复制请求头，添加认证头
  const headers = new Headers();
  if (authHeader) {
    headers.append('Authorization', authHeader);
  }
  
  try {
    // 转发请求到后端
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    });
    
    // 创建新的响应并添加CORS头
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // 添加CORS响应头
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return newResponse;
  } catch (error) {
    console.error(`API代理错误 (DELETE ${pathString}):`, error);
    return new NextResponse(JSON.stringify({ error: '代理请求失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * OPTIONS请求处理程序 - 用于处理CORS预检请求
 */
export async function OPTIONS(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { params: _params }: { params: Promise<{ path: string[] }> }
) {
  // 返回CORS预检响应
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 