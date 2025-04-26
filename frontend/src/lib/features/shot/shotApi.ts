// frontend/src/lib/features/shot/shotApi.ts

/**
 * Shot 接口定义，匹配后端 ShotResponse 模型
 */
export interface Shot {
  shot_id: number;  // 数据库主键 ID
  order: number;   // 由后端维护的顺序
  content: string;
}

// 注意：确保 API 路径与后端路由配置一致
const API_BASE_URL = 'http://localhost:8000';

/**
 * 从服务器加载所有分镜
 */
export const loadShots = async (): Promise<Shot[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/shots/`)
    if (!response.ok) {
      throw new Error(`加载分镜失败：状态码 ${response.status}`)
    }
    const data = await response.json()
    // 确保返回的是数组
    if (!Array.isArray(data)) {
      console.error('后端返回的分镜数据不是数组格式', data)
      return []
    }
    // 后端已按 order 排序
    return data
  } catch (error) {
    console.error('加载分镜失败:', error)
    // 出错时返回空数组
    return []
  }
}

/**
 * 添加新分镜到列表末尾
 */
export const addShot = async (): Promise<Shot[]> => {
  try {
    // 调用后端 API 在末尾创建新分镜
    const response = await fetch(`${API_BASE_URL}/shots/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: "" }), // 只发送内容
    })

    if (!response.ok) {
      throw new Error(`添加分镜失败：状态码 ${response.status}`)
    }
    
    // 获取后端返回的新创建的分镜
    const newShot = await response.json();
    
    // 加载完整的分镜列表
    const updatedShots = await loadShots();
    return updatedShots;
  } catch (error) {
    console.error('添加分镜失败:', error);
    throw error;
  }
}

/**
 * 保存单个分镜内容到后端
 * @param shot_id 分镜的数据库 ID
 * @param content 要保存的内容
 */
export const saveShot = async (shot_id: number, content: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/shots/${shot_id}`, { // 使用 ID 更新
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: content }), // 只发送 content
  })

  if (!response.ok) {
    throw new Error(`保存分镜 ${shot_id} 失败：状态码 ${response.status}`)
  }
  // PUT 请求成功通常返回 200 OK 和更新后的资源，或者 204 No Content
  // 这里我们不需要返回体，因为本地状态已经更新
}

/**
 * 删除指定 ID 的分镜
 * @param shot_id 分镜的数据库 ID
 * @returns 返回更新后的分镜列表
 */
export const deleteShot = async (shot_id: number): Promise<Shot[]> => {
  const response = await fetch(`${API_BASE_URL}/shots/${shot_id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error(`删除分镜 ${shot_id} 失败：状态码 ${response.status}`)
  }

  // 后端返回了更新后的完整列表
  const updatedShots: Shot[] = await response.json()
  return updatedShots
}

/**
 * 在指定分镜上方或下方插入新分镜
 * @param reference_shot_id 参考分镜的数据库 ID
 * @param position 插入位置 "above" 或 "below"
 * @returns 返回更新后的分镜列表
 */
export const insertShot = async (reference_shot_id: number, position: 'above' | 'below'): Promise<Shot[]> => {
  const response = await fetch(`${API_BASE_URL}/shots/insert/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_shot_id: reference_shot_id,
      position: position,
      content: '' // 插入空内容
    }),
  })

  if (!response.ok) {
    throw new Error(`插入分镜失败：状态码 ${response.status}`)
  }

  // 后端返回了更新后的完整列表
  const updatedShots: Shot[] = await response.json()
  return updatedShots
}

/**
 * 删除所有分镜
 */
export const deleteAllShots = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/shots/`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    // 即使后端是 204 No Content，response.ok 也是 true
    // 检查明确的错误状态码
    if (response.status >= 400) {
        throw new Error(`删除所有分镜失败：状态码 ${response.status}`);
    }
  }
  // 成功时不需要返回列表，调用者应调用 loadShots 刷新
}

/**
 * 将文本内容批量替换为新的分镜列表
 * @param textContent 要分割和导入的文本
 * @returns 返回新创建的分镜列表
 */
export const replaceShotsFromText = async (textContent: string): Promise<Shot[]> => {
    const lines = textContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        throw new Error("文本内容分割后为空");
    }

    // 准备批量更新的数据格式
    const bulkUpdateData = {
        shots: lines.map(content => ({ content: content.trim() }))
    };

    // 调用后端批量替换 API
    const response = await fetch(`${API_BASE_URL}/shots/`, { // PUT /shots/
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkUpdateData),
    });

    if (!response.ok) {
        throw new Error(`批量替换分镜失败：状态码 ${response.status}`);
    }

    // 后端返回了新创建的分镜列表
    const newShots: Shot[] = await response.json();
    return newShots;
}; 