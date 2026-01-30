import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { testPointsApi, requirementsApi } from '@/api/client'
import { Plus, Trash2, ChevronLeft, Wand2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface TestPoint {
  id: number
  requirement_id: number
  category: string
  title: string
  description: string
  priority: string
  risk_level?: string
  is_ai_generated: boolean
  confidence_score?: number
  created_at: string
}

interface Requirement {
  id: number
  requirement_id: string
  title: string
  description: string
  priority: string
  status: string
}

export default function TestPointManagement() {
  const { t } = useTranslation()
  const toast = useToast()
  const { requirementId } = useParams<{ requirementId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 获取需求信息
  const { data: requirement, isLoading: requirementLoading } = useQuery({
    queryKey: ['requirement', requirementId],
    queryFn: () => requirementsApi.get(Number(requirementId)).then(res => res.data),
    enabled: !!requirementId
  })

  // 获取测试点列表
  const { data: testPoints, isLoading: testPointsLoading } = useQuery({
    queryKey: ['test-points', requirementId],
    queryFn: () => testPointsApi.listByRequirement(Number(requirementId)).then(res => res.data),
    enabled: !!requirementId
  })

  // 生成测试点
  const generateMutation = useMutation({
    mutationFn: (data: any) => testPointsApi.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-points', requirementId] })
      setShowGenerateDialog(false)
      toast.success('测试点生成成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '生成失败')
    }
  })

  // 删除测试点
  const deleteMutation = useMutation({
    mutationFn: (id: number) => testPointsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-points', requirementId] })
      setShowDeleteDialog(false)
      setDeletingId(null)
      toast.success('测试点删除成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '删除失败')
    }
  })

  const handleSelectAll = () => {
    if (selectedIds.length === testPoints?.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(testPoints?.map((tp: TestPoint) => tp.id) || [])
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleDelete = (id: number) => {
    setDeletingId(id)
    setShowDeleteDialog(true)
  }

  const handleGenerateTestCases = () => {
    if (selectedIds.length === 0) {
      toast.error('请先选择测试点')
      return
    }
    navigate(`/functional-test/test-cases/generate`, {
      state: { requirementId, testPointIds: selectedIds }
    })
  }

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId)
    }
  }

  if (requirementLoading || testPointsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/functional-test/requirements')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('functionalTest.testPoints.title')}</h1>
            {requirement && (
              <p className="text-gray-400 mt-1">需求: {requirement.title}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGenerateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            {t('functionalTest.testPoints.generate')}
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      {testPoints && testPoints.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div className="text-gray-400">
                总计: <span className="text-white font-medium">{testPoints.length}</span> 个测试点
              </div>
              {selectedIds.length > 0 && (
                <div className="text-cyan-400">
                  {t('functionalTest.testPoints.selectedCount').replace('{0}', selectedIds.length)}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleGenerateTestCases}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  生成测试用例
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 测试点列表 */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {testPoints && testPoints.length > 0 ? (
          <>
            {/* 表头 */}
            <div className="bg-slate-700 px-6 py-3 flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedIds.length === testPoints.length}
                onChange={handleSelectAll}
                className="rounded bg-slate-600 border-slate-500"
              />
              <div className="flex-1 grid grid-cols-6 gap-4 text-xs font-medium text-gray-300 uppercase">
                <div>{t('functionalTest.testPoints.category')}</div>
                <div className="col-span-2">{t('functionalTest.testPoints.title')}</div>
                <div>{t('functionalTest.testPoints.priority')}</div>
                <div>{t('functionalTest.testPoints.riskLevel')}</div>
                <div className="text-right">{t('functionalTest.aiConfig.actions')}</div>
              </div>
            </div>

            {/* 列表 */}
            <div className="divide-y divide-slate-700">
              {testPoints.map((testPoint: TestPoint) => (
                <div
                  key={testPoint.id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-slate-700/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(testPoint.id)}
                    onChange={() => handleSelectOne(testPoint.id)}
                    className="rounded bg-slate-600 border-slate-500"
                  />
                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        testPoint.category === 'functional' ? 'bg-blue-500/20 text-blue-400' :
                        testPoint.category === 'performance' ? 'bg-purple-500/20 text-purple-400' :
                        testPoint.category === 'security' ? 'bg-red-500/20 text-red-400' :
                        testPoint.category === 'compatibility' ? 'bg-green-500/20 text-green-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {t(`functionalTest.testPoints.categories.${testPoint.category}`)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm font-medium text-white">{testPoint.title}</div>
                      {testPoint.description && (
                        <div className="text-xs text-gray-400 mt-1">{testPoint.description}</div>
                      )}
                    </div>
                    <div>
                      <span className={`text-xs font-medium ${
                        testPoint.priority === 'p0' ? 'text-red-400' :
                        testPoint.priority === 'p1' ? 'text-orange-400' :
                        testPoint.priority === 'p2' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {testPoint.priority.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      {testPoint.risk_level && (
                        <span className="text-xs text-gray-300">
                          {testPoint.risk_level === 'high' ? '高' :
                           testPoint.risk_level === 'medium' ? '中' :
                           testPoint.risk_level === 'low' ? '低' : testPoint.risk_level}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => handleDelete(testPoint.id)}
                        className="text-red-400 hover:text-red-300"
                        title={t('functionalTest.testPoints.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center text-gray-400">
            <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('functionalTest.testPoints.noTestPoints')}</p>
            <p className="text-sm mb-4">{t('functionalTest.testPoints.generateFromRequirement')}</p>
            <button
              onClick={() => setShowGenerateDialog(true)}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {t('functionalTest.testPoints.generate')}
            </button>
          </div>
        )}
      </div>

      {/* 生成对话框 */}
      {showGenerateDialog && (
        <GenerateDialog
          requirementId={Number(requirementId)}
          onGenerate={(data) => generateMutation.mutate(data)}
          onClose={() => setShowGenerateDialog(false)}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          title="删除测试点"
          onConfirm={confirmDelete}
          onClose={() => {
            setShowDeleteDialog(false)
            setDeletingId(null)
          }}
        />
      )}
    </div>
  )
}

// 生成对话框
function GenerateDialog({
  requirementId,
  onGenerate,
  onClose
}: {
  requirementId: number
  onGenerate: (data: any) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<string[]>(['functional', 'performance', 'security'])
  const [useKnowledge, setUseKnowledge] = useState(true)

  const handleGenerate = () => {
    onGenerate({
      requirement_id: requirementId,
      categories,
      use_knowledge: useKnowledge
    })
  }

  const toggleCategory = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category))
    } else {
      setCategories([...categories, category])
    }
  }

  const allCategories = ['functional', 'performance', 'security', 'compatibility', 'usability']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">{t('functionalTest.testPoints.generate')}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              测试类别
            </label>
            <div className="grid grid-cols-2 gap-2">
              {allCategories.map(category => (
                <label key={category} className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="rounded bg-slate-700 border-slate-600"
                  />
                  {t(`functionalTest.testPoints.categories.${category}`)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={useKnowledge}
                onChange={(e) => setUseKnowledge(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              使用知识库（推荐）
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleGenerate}
            disabled={categories.length === 0}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            开始生成
          </button>
        </div>
      </div>
    </div>
  )
}

// 删除确认对话框
function DeleteConfirmDialog({
  title,
  onConfirm,
  onClose
}: {
  title: string
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <p className="text-gray-300 mb-6">确定要删除此测试点吗？此操作无法撤销。</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
