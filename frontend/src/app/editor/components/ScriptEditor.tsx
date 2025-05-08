import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { DEFAULT_STORYBOARD_PROMPT } from '../constants';

interface ScriptEditorProps {
  script: string | null;
  isUpdatingScript: boolean;
  updateScriptContent: (content: string) => void;
  handleScriptBlur: () => void;
  saveScript: () => void;
  storyboardPrompt: string;
  setStoryboardPrompt: (prompt: string) => void;
  extractStoryboardFromScript: () => Promise<void>;
  isExtractingStoryboard: boolean;
  setError: (error: string) => void;
  clearError: () => void;
}

export function ScriptEditor({
  script,
  isUpdatingScript,
  updateScriptContent,
  handleScriptBlur,
  saveScript,
  storyboardPrompt,
  setStoryboardPrompt,
  extractStoryboardFromScript,
  isExtractingStoryboard,
  setError,
  clearError
}: ScriptEditorProps) {
  return (
    <Card className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>剧本编辑</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 提取分镜Prompt输入框 */}
          <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
            <label htmlFor="extract-storyboard-prompt" className="block text-sm font-medium text-blue-700 dark:text-blue-300">
              提取分镜Prompt
            </label>
            <Textarea
              id="extract-storyboard-prompt"
              className="h-24 font-mono text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700"
              placeholder="输入提示词，用于指导AI如何从剧本提取分镜..."
              value={storyboardPrompt || DEFAULT_STORYBOARD_PROMPT}
              onChange={(e) => setStoryboardPrompt(e.target.value)}
            />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              将使用设置页面中配置的OpenAI信息进行分析。请确保在设置中已正确配置OpenAI的API密钥、模型和API地址。
            </p>
          </div>
          
          {/* 提取分镜按钮 */}
          <div className="flex justify-end">
            <Button
              onClick={extractStoryboardFromScript}
              disabled={isExtractingStoryboard || !script || script.trim() === ""}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isExtractingStoryboard ? (
                <><span className="mr-2">提取中...</span><span className="animate-spin">⟳</span></>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                    <line x1="7" y1="2" x2="7" y2="22"></line>
                    <line x1="17" y1="2" x2="17" y2="22"></line>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="2" y1="7" x2="7" y2="7"></line>
                    <line x1="2" y1="17" x2="7" y2="17"></line>
                    <line x1="17" y1="17" x2="22" y2="17"></line>
                    <line x1="17" y1="7" x2="22" y2="7"></line>
                  </svg>
                  从剧本提取分镜
                </>
              )}
            </Button>
          </div>

          <Textarea
            className="min-h-[300px] font-mono text-sm"
            placeholder="在这里编写剧本内容..."
            value={script || ""}
            onChange={(e) => updateScriptContent(e.target.value)}
            onBlur={() => handleScriptBlur()}
          />
        </div>
      </CardContent>
    </Card>
  )
} 