import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { functionalTestCasesApi } from '@/api/client'
import { Loader2, Wand2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function GenerateTestCases() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { requirementId, testPointIds } = location.state || {}

  const [moduleName, setModuleName] = useState('')
  const [pageName, setPageName] = useState('')
  const [caseType, setCaseType] = useState('functional')
  const [includeKnowledge, setIncludeKnowledge] = useState(true)

  // 生成测试用例
  const generateMutation = useMutation({
    mutationFn: (data: any) => functionalTestCasesApi.generate(data),
    onSuccess: (result) => {
      toast.success(`成功生成 ${result.data.total_count} 个测试用例`)
      navigate(`/functional-test/test-cases/${requirementId}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '生成失败')
    }
  })

  const handleGenerate = () => {
    if (!moduleName || !pageName) {
      toast.error('请填写完整信息')
      return
    }

    generateMutation.mutate({
      requirement_id: requirementId,
      test_point_ids: testPointIds,
      module_name: moduleName,
      page_name: pageName,
      case_type: caseType,
      include_knowledge: includeKnowledge
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Wand2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">生成测试用例</h1>
            <p className="text-gray-400 mt-1">已选择 {testPointIds?.length || 0} 个测试点</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              模块名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="例如: 用户管理"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              页面名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="例如: 登录页"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              用例类型
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="functional">功能测试</option>
              <option value="ui">UI 测试</option>
              <option value="api">API 测试</option>
              <option value="integration">集成测试</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={includeKnowledge}
                onChange={(e) => setIncludeKnowledge(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              使用知识库（推荐，基于历史相似用例）
            </label>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 text-sm text-gray-400">
            <p className="font-medium text-white mb-2">提示</p>
            <ul className="list-disc list-inside space-y-1">
              <li>生成的测试用例将包含详细的操作步骤</li>
              <li>每个步骤都有明确的预期结果</li>
              <li>初始状态为草稿，需要审核后才能使用</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !moduleName || !pageName}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                开始生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
