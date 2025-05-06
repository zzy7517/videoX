import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface Shot {
  shot_id: number;
  order: number;
  content: string;
  t2i_prompt?: string;
  characters?: string[];
}

interface ShotMessage {
  id: number | null;
  type: string;
  message: string;
}

interface StoryboardEditorProps {
  shots: Shot[];
  characters: {[key: string]: string};
  isLoadingShots: boolean;
  shotMessage: ShotMessage | null;
  isDeletingAllShots: boolean;
  isBulkUpdating: boolean;
  isInsertingShot: number | null;
  isDeletingShot: number | null;
  updateShotLocal: (shotId: number, updates: Partial<Shot>) => void;
  handleShotBlur: (shotId: number, updates: Partial<Shot>) => void;
  deleteShot: (shotId: number) => void;
  insertShot: (shotId: number, position: 'above' | 'below') => void;
  addShot: () => void;
  deleteAllShots: () => void;
}

export function StoryboardEditor({
  shots,
  characters,
  isLoadingShots,
  shotMessage,
  isDeletingAllShots,
  isBulkUpdating,
  isInsertingShot,
  isDeletingShot,
  updateShotLocal,
  handleShotBlur,
  deleteShot,
  insertShot,
  addShot,
  deleteAllShots
}: StoryboardEditorProps) {

  return (
    <>
      {isLoadingShots ? (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">加载分镜中...</div>
      ) : !shots || shots.length === 0 ? (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">暂无分镜，点击右下角 &quot;+&quot; 添加分镜。</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {Array.isArray(shots) && shots.map((shot) => (
            <Card
              key={shot.shot_id}
              className="group hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 relative"
            >
              {/* Loading/Inserting Indicator */}
              {(isInsertingShot === shot.shot_id || isDeletingShot === shot.shot_id) && (
                  <div className="absolute inset-0 bg-slate-200/30 dark:bg-slate-700/30 flex items-center justify-center z-10 rounded-lg">
                      <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  </div>
              )}
              
              {/* Header with shot order & controls */}
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                <CardTitle className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-2 text-sm">
                    {shot.order}
                  </span>
                  分镜 {shot.order}
                </CardTitle>
                
                <div className="flex items-center space-x-1">
                  {/* 向上插入按钮 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => insertShot(shot.shot_id, 'above')}
                    disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="在此分镜上方插入"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 19V5M5 12l7-7 7 7"/>
                          <line x1="5" y1="5" x2="19" y2="5" />
                      </svg>
                  </Button>
                  
                  {/* 向下插入按钮 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => insertShot(shot.shot_id, 'below')}
                    disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="在此分镜下方插入"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M19 12l-7 7-7-7"/>
                          <line x1="5" y1="19" x2="19" y2="19" />
                      </svg>
                  </Button>
                </div>
                {/* 删除按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteShot(shot.shot_id)}
                  disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating || shots.length <= 1}
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="删除此分镜"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </Button>
              </CardHeader>
              
              <CardContent>
                <Textarea
                  value={shot.content}
                  onChange={(e) => updateShotLocal(shot.shot_id, { content: e.target.value })}
                  onBlur={(e) => handleShotBlur(shot.shot_id, { content: e.target.value })}
                  placeholder={`请输入分镜 ${shot.order} 的内容...`}
                  className="min-h-[120px] bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all mb-3"
                  disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                />
                
                {/* 角色选择区域 */}
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">分镜角色：</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(characters).map((charName) => {
                      const isSelected = (shot.characters || []).includes(charName);
                      return (
                        <button
                          key={charName}
                          type="button"
                          disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors
                            ${isSelected 
                              ? 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}
                          `}
                          onClick={() => {
                            const currentChars = shot.characters || [];
                            let updatedChars;
                            
                            if (isSelected) {
                              // 如果已选中，则移除
                              updatedChars = currentChars.filter(c => c !== charName);
                            } else {
                              // 如果未选中，则添加
                              updatedChars = [...currentChars, charName];
                            }
                            
                            updateShotLocal(shot.shot_id, { characters: updatedChars });
                            handleShotBlur(shot.shot_id, { characters: updatedChars });
                          }}
                        >
                          {charName}
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                    {Object.keys(characters).length === 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">暂无角色，请在角色标签页添加角色</span>
                    )}
                  </div>
                </div>
                
                {/* 提示词文本框 */}
                <Textarea
                  value={shot.t2i_prompt || ""}
                  onChange={(e) => updateShotLocal(shot.shot_id, { t2i_prompt: e.target.value })}
                  onBlur={(e) => handleShotBlur(shot.shot_id, { t2i_prompt: e.target.value })}
                  placeholder={`请输入分镜 ${shot.order} 的提示词...`}
                  className="min-h-[80px] bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                  disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating}
                />
                {/* 保存状态提示 */}
                {shotMessage?.id === shot.shot_id && (
                  <p className={`mt-2 text-xs ${shotMessage.type === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {shotMessage.message}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* 悬浮按钮 */}
      <>
        {/* 清空分镜悬浮按钮 */}
        <Button
          onClick={deleteAllShots}
          disabled={isDeletingAllShots || !shots || shots.length === 0}
          className="fixed bottom-28 right-8 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 z-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          title="清空所有分镜"
        >
          {isDeletingAllShots ? (
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          )}
        </Button>
        
        <Button
          onClick={addShot}
          disabled={isInsertingShot !== null || isDeletingShot !== null || isBulkUpdating} 
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 z-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          title="添加新分镜到末尾"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </Button>
      </>
    </>
  );
} 