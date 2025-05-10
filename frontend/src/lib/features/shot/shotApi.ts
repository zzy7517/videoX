// frontend/src/lib/features/shot/shotApi.ts
import { fetchWithAuth } from '@/lib/utils';

/**
 * Shot 接口定义，匹配后端 ShotResponse 模型
 */
export interface Shot {
  shot_id: number;  // 数据库主键 ID
  order: number;   // 由后端维护的顺序
  content: string;
  t2i_prompt?: string; // 重命名 prompt 为 t2i_prompt
  characters?: string[]; // 分镜相关角色列表
}

/**
 * 项目信息接口定义，包含分镜、剧本和角色信息
 */
export interface ProjectInfo {
  shots: Shot[];
  script?: string; // 剧本内容
  characters?: {[key: string]: string}; // 角色信息，键为角色名，值为描述
}

/**
 * 项目接口定义
 */
export interface Project {
  project_id: number;
  name: string;
}

// 注意：确保 API 路径与后端路由配置一致
// 使用Next.js代理，而不是直接访问后端
const API_BASE_URL = '/api';

/**
 * 获取用户的所有项目
 */
export const loadProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/projects/`)
    if (!response.ok) {
      throw new Error(`加载项目失败：状态码 ${response.status}`)
    }
    const data = await response.json()
    // 确保返回的是数组
    if (!Array.isArray(data)) {
      console.error('后端返回的项目数据不是数组格式', data)
      return []
    }
    return data
  } catch (error) {
    console.error('加载项目失败:', error)
    // 出错时返回空数组
    return []
  }
}

/**
 * 获取当前项目的所有分镜
 * @param projectId 项目ID
 * @returns 分镜数组
 */
export const getAllShots = async (projectId: number): Promise<Shot[]> => {
  if (!projectId) {
    console.error('调用getAllShots必须提供有效的projectId');
    return [];
  }

  try {
    const url = `${API_BASE_URL}/shots/?project_id=${projectId}`;
    const response = await fetchWithAuth(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`获取分镜列表失败: 状态码 ${response.status}`);
    }

    // 现在API返回的是ProjectInfo对象，我们只需要返回shots数组
    const data: ProjectInfo = await response.json();
    return data.shots || [];
  } catch (error) {
    console.error("获取分镜列表失败:", error);
    return [];
  }
}

/**
 * 获取项目信息，包含分镜、剧本和角色
 * @param projectId 项目ID
 * @returns 项目信息对象
 */
export const getProjectInfo = async (projectId: number): Promise<ProjectInfo> => {
  if (!projectId) {
    console.error('调用getProjectInfo必须提供有效的projectId');
    return { shots: [] };
  }

  try {
    const url = `${API_BASE_URL}/shots/?project_id=${projectId}`;
    const response = await fetchWithAuth(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`获取项目信息失败: 状态码 ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("获取项目信息失败:", error);
    return { shots: [] };
  }
}

/**
 * 从服务器加载所有分镜
 */
export const loadShots = async (projectId: number): Promise<Shot[]> => {
  try {
    if (!projectId) {
      console.error('调用loadShots必须提供有效的projectId');
      return [];
    }
    
    const url = `${API_BASE_URL}/shots/?project_id=${projectId}`;
    
    const response = await fetchWithAuth(url)
    if (!response.ok) {
      throw new Error(`加载分镜失败：状态码 ${response.status}`)
    }
    const data = await response.json()
    
    // 处理后端返回的数据
    // 如果是ProjectInfo对象（包含shots数组）
    if (data && typeof data === 'object' && 'shots' in data && Array.isArray(data.shots)) {
      return data.shots;
    }
    // 如果是直接返回的数组
    else if (Array.isArray(data)) {
      return data;
    }
    // 其他情况
    else {
      console.error('后端返回的分镜数据格式不正确', data);
      return [];
    }
  } catch (error) {
    console.error('加载分镜失败:', error)
    // 出错时返回空数组
    return []
  }
}

/**
 * 添加新分镜到列表末尾
 */
export const addShot = async (projectId: number): Promise<Shot[]> => {
  try {
    if (!projectId) {
      console.error('调用addShot必须提供有效的projectId');
      return [];
    }
    
    // 构建URL
    const url = `${API_BASE_URL}/shots/?project_id=${projectId}`;
      
    // 调用后端 API 在末尾创建新分镜
    const response = await fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify({ content: "" }), // 只发送内容
    })

    if (!response.ok) {
      throw new Error(`添加分镜失败：状态码 ${response.status}`)
    }
    
    // 获取后端返回的新创建的分镜
    await response.json(); // 读取响应体但不使用结果
    
    // 加载完整的分镜列表
    const updatedShots = await loadShots(projectId);
    return updatedShots;
  } catch (error) {
    console.error('添加分镜失败:', error);
    throw error;
  }
}

/**
 * 保存单个分镜内容到后端
 * @param shot_id 分镜的数据库 ID
 * @param shotData 包含要更新字段的对象 (例如 { content: '...', t2i_prompt: '...', characters: [...] })
 * @param projectId 项目ID
 */
export const saveShot = async (shot_id: number, shotData: Partial<Pick<Shot, 'content' | 't2i_prompt' | 'characters'>>, projectId: number): Promise<void> => {
  if (!projectId) {
    console.error('调用saveShot必须提供有效的projectId');
    return;
  }
  
  // 过滤掉值为 undefined 的字段，避免发送不必要的更新
  const updatePayload: Partial<Pick<Shot, 'content' | 't2i_prompt' | 'characters'>> = {};
  if (shotData.content !== undefined) {
    updatePayload.content = shotData.content;
  }
  if (shotData.t2i_prompt !== undefined) {
    updatePayload.t2i_prompt = shotData.t2i_prompt;
  }
  if (shotData.characters !== undefined) {
    updatePayload.characters = shotData.characters;
  }

  // 如果没有有效字段需要更新，则不发送请求
  if (Object.keys(updatePayload).length === 0) {
    console.log(`没有有效字段需要为分镜 ${shot_id} 保存。`);
    return;
  }

  // 构建URL
  const url = `${API_BASE_URL}/shots/${shot_id}?project_id=${projectId}`;

  const response = await fetchWithAuth(url, { // 使用 ID 更新
    method: 'PUT',
    body: JSON.stringify(updatePayload), // 发送包含更新字段的对象
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
 * @param projectId 项目ID
 * @returns 返回更新后的分镜列表
 */
export const deleteShot = async (shot_id: number, projectId: number): Promise<Shot[]> => {
  if (!projectId) {
    console.error('调用deleteShot必须提供有效的projectId');
    return [];
  }
  
  // 构建URL
  const url = `${API_BASE_URL}/shots/${shot_id}?project_id=${projectId}`;
    
  const response = await fetchWithAuth(url, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error(`删除分镜 ${shot_id} 失败：状态码 ${response.status}`)
  }

  // 处理后端返回的数据
  const data = await response.json();
  // 如果是ProjectInfo对象（包含shots数组）
  if (data && typeof data === 'object' && 'shots' in data && Array.isArray(data.shots)) {
    return data.shots;
  }
  // 如果是直接返回的数组
  else if (Array.isArray(data)) {
    return data;
  }
  // 其他情况
  else {
    console.error('后端返回的分镜数据格式不正确', data);
    return [];
  }
}

/**
 * 在指定分镜上方或下方插入新分镜
 * @param reference_shot_id 参考分镜的数据库 ID
 * @param position 插入位置 "above" 或 "below"
 * @param projectId 项目ID
 * @returns 返回更新后的分镜列表
 */
export const insertShot = async (reference_shot_id: number, position: 'above' | 'below', projectId: number): Promise<Shot[]> => {
  if (!projectId) {
    console.error('调用insertShot必须提供有效的projectId');
    return [];
  }
  
  // 构建URL
  const url = `${API_BASE_URL}/shots/insert?project_id=${projectId}`;
    
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify({
      reference_shot_id: reference_shot_id,
      position: position,
      content: '' // 插入空内容
    }),
  })

  if (!response.ok) {
    throw new Error(`插入分镜失败：状态码 ${response.status}`)
  }

  // 处理后端返回的数据
  const data = await response.json();
  // 如果是ProjectInfo对象（包含shots数组）
  if (data && typeof data === 'object' && 'shots' in data && Array.isArray(data.shots)) {
    return data.shots;
  }
  // 如果是直接返回的数组
  else if (Array.isArray(data)) {
    return data;
  }
  // 其他情况
  else {
    console.error('后端返回的分镜数据格式不正确', data);
    return [];
  }
}

/**
 * 删除所有分镜
 * @param projectId 项目ID
 */
export const deleteAllShots = async (projectId: number): Promise<void> => {
  if (!projectId) {
    console.error('调用deleteAllShots必须提供有效的projectId');
    return;
  }
  
  // 构建URL
  const url = `${API_BASE_URL}/shots/?project_id=${projectId}`;
    
  const response = await fetchWithAuth(url, {
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
 * @param projectId 项目ID
 * @returns 返回新创建的分镜列表
 */
export const replaceShotsFromText = async (textContent: string, projectId: number): Promise<Shot[]> => {
    if (!projectId) {
      console.error('调用replaceShotsFromText必须提供有效的projectId');
      return [];
    }
    
    const lines = textContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        throw new Error("文本内容分割后为空");
    }

    // 首先获取当前项目信息以保存原有的剧本和角色信息
    let script = "";
    let characters = {};
    
    try {
        const projectInfo = await getProjectInfo(projectId);
        script = projectInfo.script || "";
        characters = projectInfo.characters || {};
        console.log('保留原有剧本和角色信息成功', {
            scriptLength: script.length,
            charactersCount: Object.keys(characters).length
        });
    } catch (error) {
        console.error('获取原有项目信息失败，无法保留剧本和角色:', error);
        // 继续执行，使用空值
    }

    // 准备批量更新的数据格式
    const bulkUpdateData = {
        shots: lines.map(content => ({ content: content.trim() })),
        script: script,
        characters: characters
    };

    // 构建URL
    const url = `${API_BASE_URL}/shots/?project_id=${projectId}`;
      
    // 调用后端批量替换 API
    const response = await fetchWithAuth(url, { // PUT /shots/
        method: 'PUT',
        body: JSON.stringify(bulkUpdateData),
    });

    if (!response.ok) {
        throw new Error(`批量替换分镜失败：状态码 ${response.status}`);
    }

    // 处理后端返回的数据
    const data = await response.json();
    // 如果是ProjectInfo对象（包含shots数组）
    if (data && typeof data === 'object' && 'shots' in data && Array.isArray(data.shots)) {
      return data.shots;
    }
    // 如果是直接返回的数组
    else if (Array.isArray(data)) {
      return data;
    }
    // 其他情况
    else {
      console.error('后端返回的分镜数据格式不正确', data);
      return [];
    }
};

/**
 * 创建新项目
 * @param name 项目名称
 * @returns 返回创建的项目
 */
export const createProject = async (name: string): Promise<Project> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/projects/`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(`创建项目失败：状态码 ${response.status}`)
  }

  const newProject: Project = await response.json()
  return newProject
}

/**
 * 删除指定ID的项目
 * @param projectId 项目ID
 * @returns 返回删除操作是否成功
 */
export const deleteProject = async (projectId: number): Promise<boolean> => {
  if (!projectId) {
    console.error('调用deleteProject必须提供有效的projectId');
    return false;
  }
  
  const url = `${API_BASE_URL}/projects/${projectId}`;
    
  const response = await fetchWithAuth(url, {
    method: 'DELETE'
  });

  return response.ok;
}

/**
 * 更新项目剧本
 * @param script 剧本内容
 * @param projectId 项目ID
 * @returns 响应消息
 */
export const updateScript = async (script: string, projectId: number): Promise<{message: string}> => {
  if (!projectId) {
    console.error('调用updateScript必须提供有效的projectId');
    throw new Error('必须提供有效的项目ID');
  }

  const url = `${API_BASE_URL}/shots/script?project_id=${projectId}`;

  // 确保script是字符串类型
  const scriptContent = typeof script === 'string' ? script : String(script);
  
  // 构建请求体，严格按照后端ScriptUpdate模型的格式，同时添加project_id
  const requestBody = JSON.stringify({ 
    script: scriptContent,
    project_id: projectId  // 添加project_id到请求体
  });
  
  console.log('updateScript API 调用:', { 
    projectId, 
    scriptType: typeof script,
    scriptContentType: typeof scriptContent,
    scriptContentLength: scriptContent.length,
    scriptContent: scriptContent.substring(0, 100) + (scriptContent.length > 100 ? '...' : ''),
    requestBody
  });

  try {
    // 确保正确的请求格式，与后端ScriptUpdate模型对应
    const response = await fetchWithAuth(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('更新剧本失败，状态码:', response.status, '服务器响应:', errorText);
      throw new Error(`更新剧本失败：状态码 ${response.status}, 错误信息: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('更新剧本请求失败:', error);
    throw error;
  }
}

/**
 * 更新项目角色信息
 * @param characters 角色信息字典
 * @param projectId 项目ID
 * @returns 响应对象，包含消息和更新后的角色信息
 */
export const updateCharacters = async (
  characters: {[key: string]: string}, 
  projectId: number
): Promise<{message: string, characters: {[key: string]: string}}> => {
  if (!projectId) {
    console.error('调用updateCharacters必须提供有效的projectId');
    throw new Error('必须提供有效的项目ID');
  }

  const url = `${API_BASE_URL}/shots/characters?project_id=${projectId}`;
  
  // 构建请求体，确保格式正确
  const requestBody = JSON.stringify({ 
    characters: characters,
    project_id: projectId
  });
  
  // 添加日志以便调试
  console.log('updateCharacters API 调用:', { 
    projectId,
    charactersLength: Object.keys(characters).length,
    requestBody
  });

  try {
    const response = await fetchWithAuth(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('更新角色信息失败，状态码:', response.status, '服务器响应:', errorText);
      throw new Error(`更新角色信息失败：状态码 ${response.status}, 错误信息: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('更新角色信息请求失败:', error);
    throw error;
  }
}

/**
 * 从JSON数据批量替换分镜
 * @param jsonData 包含分镜数据的JSON字符串
 * @param projectId 项目ID
 * @returns 返回新创建的分镜列表
 */
export const replaceShotsFromJson = async (jsonData: string, projectId: number): Promise<Shot[]> => {
  if (!projectId) {
    console.error('调用replaceShotsFromJson必须提供有效的projectId');
    return [];
  }

  let parsedShots = [];
  try {
    // 解析JSON数据
    const parsedData = JSON.parse(jsonData);
    
    // 检查是否有shots数组
    if (parsedData && parsedData.shots && Array.isArray(parsedData.shots)) {
      parsedShots = parsedData.shots;
      console.log(`成功解析JSON，获取到${parsedShots.length}个分镜数据`);
    } else {
      console.error('JSON数据中未找到有效的shots数组');
      return [];
    }
  } catch (error) {
    console.error('解析JSON数据失败:', error);
    return [];
  }

  // 首先获取当前项目信息以保存原有的剧本和角色信息
  let script = "";
  let characters = {};
  
  try {
    const projectInfo = await getProjectInfo(projectId);
    script = projectInfo.script || "";
    characters = projectInfo.characters || {};
    console.log('保留原有剧本和角色信息成功', {
      scriptLength: script.length,
      charactersCount: Object.keys(characters).length
    });
  } catch (error) {
    console.error('获取原有项目信息失败，无法保留剧本和角色:', error);
    // 继续执行，使用空值
  }

  // 准备批量更新的数据格式
  const bulkUpdateData = {
    shots: parsedShots.map((shot: any) => ({
      content: shot.original_text || shot.description || shot.content || '',
      t2i_prompt: shot.image_prompt || shot.t2i_prompt || '',
      characters: shot.characters || []
    })),
    script: script,
    characters: characters
  };

  // 构建URL
  const url = `${API_BASE_URL}/shots/?project_id=${projectId}`;
    
  // 调用后端批量替换 API
  const response = await fetchWithAuth(url, { // PUT /shots/
    method: 'PUT',
    body: JSON.stringify(bulkUpdateData),
  });

  if (!response.ok) {
    throw new Error(`批量替换分镜失败：状态码 ${response.status}`);
  }

  // 处理后端返回的数据
  const data = await response.json();
  // 如果是ProjectInfo对象（包含shots数组）
  if (data && typeof data === 'object' && 'shots' in data && Array.isArray(data.shots)) {
    return data.shots;
  }
  // 如果是直接返回的数组
  else if (Array.isArray(data)) {
    return data;
  }
  // 其他情况
  else {
    console.error('后端返回的分镜数据格式不正确', data);
    return [];
  }
}; 