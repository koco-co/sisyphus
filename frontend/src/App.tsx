import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { ToastProvider } from '@/components/ui/Toast'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import InterfacePage from '@/pages/interface'
import ScenarioListPage from '@/pages/scenario'
import ScenarioEditor from '@/pages/scenario/editor'
import TestCasesPage from '@/pages/cases'
import LoginPage from '@/pages/auth/LoginPage'
// 新增模块导入
import ProjectManagement from '@/pages/api-automation/ProjectManagement'
import DatabaseConfigList from '@/pages/api-automation/DatabaseConfigList'
import ProjectSettings from '@/pages/api-automation/ProjectSettings'
import KeywordManagement from '@/pages/api-automation/KeywordManagement'
import KeywordEditor from '@/pages/api-automation/KeywordEditor'
import ApiManagement from '@/pages/api-automation/ApiManagement'
import ApiTestCaseList from '@/pages/api-automation/ApiTestCaseList'
import ApiTestCaseEditor from '@/pages/api-automation/ApiTestCaseEditor'
import VisualTestCaseEditor from '@/pages/api-automation/VisualTestCaseEditor'
import ExecutionResultPage from '@/pages/api-automation/ExecutionResultPage'
import InterfaceEditor from '@/pages/interface/InterfaceEditor'
import TestReport from '@/pages/reports/TestReport'
import TestPlan from '@/pages/plans/TestPlan'
// 功能测试模块导入
import RequirementList from '@/pages/functional-test/RequirementList'
import AIConfigManagement from '@/pages/functional-test/AIConfigManagement'
import RequirementClarification from '@/pages/functional-test/RequirementClarification'
import TestPointManagement from '@/pages/functional-test/TestPointManagement'
import TestCaseManagement from '@/pages/functional-test/TestCaseManagement'
import GenerateTestCases from '@/pages/functional-test/GenerateTestCases'
import '@/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

// 路由保护组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()



  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={
        <ProtectedRoute>
          <SidebarProvider>
            <AppLayout />
          </SidebarProvider>
        </ProtectedRoute>
      }>
        {/* 仪表盘 */}
        <Route path="/" element={<Dashboard />} />

        {/* 接口自动化模块 */}
        <Route path="/api/projects" element={<ProjectManagement />} />
        <Route path="/api/projects/:id/datasources" element={<DatabaseConfigList />} />
        <Route path="/api/projects/:id/settings" element={<ProjectSettings />} />
        <Route path="/api/keywords" element={<KeywordManagement />} />
        <Route path="/api/keywords/new" element={<KeywordEditor />} />
        <Route path="/api/keywords/:id" element={<KeywordEditor />} />
        <Route path="/api/interfaces" element={<ApiManagement />} />
        <Route path="/api/interfaces/new" element={<InterfaceEditor />} />
        <Route path="/api/interfaces/:id" element={<InterfaceEditor />} />
        <Route path="/api/projects/:projectId/test-cases" element={<ApiTestCaseList />} />
        <Route path="/api/projects/:projectId/test-cases/new" element={<ApiTestCaseEditor />} />
        <Route path="/api/test-cases/:testCaseId" element={<ApiTestCaseEditor />} />
        <Route path="/api/projects/:projectId/test-cases/visual/new" element={<VisualTestCaseEditor />} />
        <Route path="/api/test-cases/visual/:testCaseId" element={<VisualTestCaseEditor />} />
        <Route path="/api/executions/:executionId" element={<ExecutionResultPage />} />

        {/* 场景编排 */}
        <Route path="/scenarios" element={<ScenarioListPage />} />
        <Route path="/scenarios/editor/:id" element={<ScenarioEditor />} />
        <Route path="/scenarios/editor/new" element={<ScenarioEditor />} />

        {/* 测试报告 */}
        <Route path="/reports" element={<TestReport />} />

        {/* 定时任务 (原测试计划) */}
        <Route path="/plans" element={<TestPlan />} />

        {/* 旧模块保留 */}
        <Route path="/interfaces" element={<InterfacePage />} />
        <Route path="/cases" element={<TestCasesPage />} />
        <Route path="/data" element={<div className="p-8 text-white">数据中心 - 开发中</div>} />

        {/* 功能测试模块 */}
        <Route path="/functional-test/requirements" element={<RequirementList />} />
        <Route path="/functional-test/ai-config" element={<AIConfigManagement />} />
        <Route path="/functional-test/clarification/:requirementId" element={<RequirementClarification />} />
        <Route path="/functional-test/test-points/:requirementId" element={<TestPointManagement />} />
        <Route path="/functional-test/test-cases/:requirementId" element={<TestCaseManagement />} />
        <Route path="/functional-test/test-cases/generate" element={<GenerateTestCases />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
