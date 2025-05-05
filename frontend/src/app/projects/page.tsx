"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Navbar } from '@/lib/features/auth/Navbar'
import { useAuth, ProtectedRoute } from '@/lib/features/auth'
import { Project, loadProjects, createProject, deleteProject } from '@/lib/features/shot/shotApi'

/**
 * 项目选择页面
 * 用户可以在此查看项目列表、创建新项目以及选择进入项目
 */
export default function ProjectsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  
  // 如果未登录且不在加载中，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // 如果正在加载认证状态，显示加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    )
  }

  // 使用ProtectedRoute包装内容，确保只有登录用户才能访问
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  )
}

// 项目列表内容组件
function ProjectsContent() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // 加载项目列表
  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await loadProjects()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载项目列表失败")
    } finally {
      setIsLoading(false)
    }
  }
  
  // 创建新项目
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setError("项目名称不能为空")
      return
    }
    
    try {
      setIsCreating(true)
      setError(null)
      const newProject = await createProject(newProjectName)
      setProjects(prev => [...prev, newProject])
      setNewProjectName("")
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建项目失败")
    } finally {
      setIsCreating(false)
    }
  }
  
  // 进入项目
  const goToProject = (projectId: number) => {
    router.push(`/editor?projectId=${projectId}`)
  }
  
  // 删除项目
  const handleDeleteProject = async (projectId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // 阻止冒泡，避免触发进入项目
    
    if (isDeleting) return;
    
    if (!confirm("确定要删除此项目吗？此操作不可撤销。")) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setError(null);
      
      // 使用API删除项目
      const success = await deleteProject(projectId);
      
      if (!success) {
        throw new Error("删除项目失败");
      }
      
      // 从项目列表中移除已删除的项目
      setProjects(prev => prev.filter(p => p.project_id !== projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除项目失败");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 初始加载项目列表
  useEffect(() => {
    fetchProjects()
  }, [])

  return (
    <>
      <Navbar title="VideoX - 项目管理" />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 顶部标题区 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              我的项目
            </h1>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity">
                  创建新项目
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>创建新项目</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input
                    placeholder="请输入项目名称..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isCreating}>取消</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleCreateProject} 
                    disabled={isCreating || !newProjectName.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity"
                  >
                    {isCreating ? "创建中..." : "创建项目"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-400" role="alert">
              {error}
            </div>
          )}

          {/* 项目列表 */}
          {isLoading ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-gray-400">正在加载项目列表...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-white/30 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-slate-700 dark:text-slate-300">没有项目</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">点击"创建新项目"按钮开始</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.project_id} className="group hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {project.name}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={(e) => handleDeleteProject(project.project_id, e)}
                      disabled={isDeleting}
                      title="删除项目"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      项目ID: {project.project_id}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity"
                      onClick={() => goToProject(project.project_id)}
                    >
                      进入项目
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

// 创建简单的Input组件
const Input = ({ value, onChange, placeholder, disabled }: { 
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
    />
  );
}; 