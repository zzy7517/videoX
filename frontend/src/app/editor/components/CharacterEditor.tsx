import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// 导入全局默认系统提示词
import { DEFAULT_SYSTEM_PROMPT } from '../constants';

interface CharacterEditorProps {
  characters: {[key: string]: string};
  systemPrompt: string;
  isExtractingCharacters: boolean;
  isUpdatingCharacters: boolean;
  script: string | null;
  updateCharactersInfo: (characters: {[key: string]: string}) => void;
  saveCharacters: () => Promise<void>;
  setSystemPrompt: (prompt: string) => void;
  extractCharactersFromScript: () => Promise<void>;
  setError: (error: string) => void;
  clearError: () => void;
}

export function CharacterEditor({
  characters,
  systemPrompt,
  isExtractingCharacters,
  isUpdatingCharacters,
  script,
  updateCharactersInfo,
  saveCharacters,
  setSystemPrompt,
  extractCharactersFromScript,
  setError,
  clearError
}: CharacterEditorProps) {
  
  // 角色编辑状态
  const [characterName, setCharacterName] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingCharacterText, setEditingCharacterText] = useState<string>("");
  
  // 初始化编辑文本
  useEffect(() => {
    const text = Object.entries(characters || {})
      .map(([name, description]) => `${name}:${description}`)
      .join('\n');
    setEditingCharacterText(text);
  }, [characters]);

  // 处理添加新角色
  const handleAddCharacter = useCallback(() => {
    if (!characterName.trim() || !characterDescription.trim()) {
      setError("角色名和描述不能为空");
      clearError();
      return;
    }
    
    // 更新角色列表
    const newCharacters = { ...characters };
    
    // 如果是编辑现有角色且角色名已更改
    if (editingCharacterId && editingCharacterId !== characterName.trim()) {
      // 删除旧角色名
      delete newCharacters[editingCharacterId];
    }
    
    // 添加或更新角色
    newCharacters[characterName.trim()] = characterDescription.trim();
    updateCharactersInfo(newCharacters);
    
    // 清空输入框
    setCharacterName("");
    setCharacterDescription("");
    setEditingCharacterId(null);
  }, [characterName, characterDescription, characters, editingCharacterId, updateCharactersInfo, setError, clearError]);
  
  // 处理编辑角色
  const handleEditCharacter = useCallback((name: string) => {
    setEditingCharacterId(name);
    setCharacterName(name);
    setCharacterDescription(characters[name] || "");
  }, [characters]);
  
  // 处理删除角色
  const handleDeleteCharacter = useCallback((name: string) => {
    const newCharacters = { ...characters };
    delete newCharacters[name];
    updateCharactersInfo(newCharacters);
  }, [characters, updateCharactersInfo]);

  return (
    <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>角色信息</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 提取角色Prompt输入框 */}
          <div className="space-y-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
            <label htmlFor="extract-characters-prompt" className="block text-sm font-medium text-purple-700 dark:text-purple-300">
              提取角色Prompt
            </label>
            <Textarea
              id="extract-characters-prompt"
              className="h-24 font-mono text-sm bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-700"
              placeholder="输入提示词，用于指导AI如何提取角色和生成提示词..."
              value={systemPrompt || DEFAULT_SYSTEM_PROMPT}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <p className="text-xs text-purple-600 dark:text-purple-400">
              将使用设置页面中配置的OpenAI信息进行分析。请确保在设置中已正确配置OpenAI的API密钥、模型和API地址，缺少任何一项都将无法使用此功能。
            </p>
          </div>
          
          {/* 提取角色按钮 */}
          <div className="flex justify-end">
            <Button
              onClick={extractCharactersFromScript}
              disabled={isExtractingCharacters || !script || script.trim() === ""}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isExtractingCharacters ? (
                <><span className="mr-2">提取中...</span><span className="animate-spin">⟳</span></>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  从剧本提取角色
                </>
              )}
            </Button>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400">
            以"角色名:角色描述"的格式编辑角色信息，每行一个角色。角色描述将用作文生图提示词。
          </p>
          
          <div className="mt-6">
            <div className="flex items-center mb-4">
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-700"></div>
              <h3 className="px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                角色编辑区域
              </h3>
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
            
            {/* 角色输入表单 */}
            <div className="space-y-4 bg-white/70 dark:bg-slate-800/70 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="space-y-2">
                <label htmlFor="character-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  角色名称
                </label>
                <Input
                  id="character-name"
                  value={characterName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCharacterName(e.target.value)}
                  placeholder="请输入角色名称..."
                  className="bg-white dark:bg-slate-900"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="character-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  角色描述
                </label>
                <Textarea
                  id="character-description"
                  value={characterDescription}
                  onChange={(e) => setCharacterDescription(e.target.value)}
                  placeholder="请输入角色描述（用于生成图像的提示词）..."
                  className="min-h-[100px] bg-white dark:bg-slate-900"
                />
              </div>
              
              <div className="flex justify-end">
                {editingCharacterId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCharacterName("");
                      setCharacterDescription("");
                      setEditingCharacterId(null);
                    }}
                    className="mr-2"
                  >
                    取消
                  </Button>
                )}
                <Button
                  onClick={handleAddCharacter}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {editingCharacterId ? "更新角色" : "添加角色"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <h3 className="text-lg font-medium mb-2">角色列表</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(characters || {}).map(([name, description]) => (
                <div key={name} className="border rounded-lg p-4 bg-white/80 dark:bg-slate-800/80 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCharacter(name)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCharacter(name)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </Button>
                  </div>
                  <h4 className="font-bold text-md">{name}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
                </div>
              ))}
              {Object.keys(characters || {}).length === 0 && (
                <p className="text-slate-500 dark:text-slate-400 col-span-2 text-center py-8">
                  暂无角色信息。你可以使用上方的表单添加角色，或从剧本标签页使用AI自动提取。
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 