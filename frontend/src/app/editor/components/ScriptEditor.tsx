import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface ScriptEditorProps {
  script: string | null;
  isUpdatingScript: boolean;
  updateScriptContent: (content: string) => void;
  handleScriptBlur: () => void;
  saveScript: () => void;
}

export function ScriptEditor({
  script,
  isUpdatingScript,
  updateScriptContent,
  handleScriptBlur,
  saveScript
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