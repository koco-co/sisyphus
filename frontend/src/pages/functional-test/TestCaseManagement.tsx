import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { functionalTestCasesApi } from '@/api/client'
import { ChevronLeft, Eye, Check, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface TestStep {
  step_number: number
  action: string
  expected_result: string
}

interface TestCase {
  id: number
  case_id: string
  requirement_id: number
  module_name: string
  page_name: string
  title: string
  priority: string
  case_type: string
  preconditions: string[]
  steps: TestStep[]
  tags: string[]
  estimated_time?: number
  complexity?: string
  status: string
  is_ai_generated: boolean
  created_at: string
  updated_at: string
}

export default function TestCaseManagement() {
  const { t } = useTranslation()
  const toast = useToast()
  const { requirementId } = useParams<{ requirementId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 获取测试用例列表
  const { data: testCases, isLoading } = useQuery({
    queryKey: ['test-cases', requirementId],
    queryFn: () => functionalTestCasesApi.listByRequirement(Number(requirementId)).then(res => res.data),
    enabled: !!requirementId
  })

  // 审核通过
  const approveMutation = useMutation({
    mutationFn: (caseId: string) => functionalTestCasesApi.approve(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', requirementId] })
      toast.success('测试用例已审核通过')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '操作失败')
    }
  })

  // 删除测试用例
  const deleteMutation = useMutation({
    mutationFn: (caseId: string) => functionalTestCasesApi.delete(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', requirementId] })
      setShowDeleteDialog(false)
      setDeletingId(null)
      toast.success('测试用例删除成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '删除失败')
    }
  })

  const handleView = (testCase: TestCase) => {
    setSelectedCaseId(testCase.case_id)
  }

  const handleApprove = (caseId: string) => {
    approveMutation.mutate(caseId)
  }

  const handleDelete = (caseId: string) => {
    setDeletingId(caseId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId)
    }
  }

  const selectedCase = testCases?.find((tc: TestCase) => tc.case_id === selectedCaseId)

  if (isLoading) {
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
            onClick={() => navigate(`/functional-test/test-points/${requirementId}`)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('functionalTest.testCases.title')}</h1>
            <p className="text-gray-400 mt-1">{t('functionalTest.testCases.description')}</p>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      {testCases && testCases.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="text-gray-400">
              总计: <span className="text-white font-medium">{testCases.length}</span> 个测试用例
            </div>
            <div className="text-green-400">
              已审核: <span className="font-medium">{testCases.filter((tc: TestCase) => tc.status === 'approved').length}</span>
            </div>
            <div className="text-yellow-400">
              草稿: <span className="font-medium">{testCases.filter((tc: TestCase) => tc.status === 'draft').length}</span>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 测试用例列表 */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="bg-slate-700 px-6 py-3">
            <h2 className="text-sm font-medium text-gray-300 uppercase">测试用例列表</h2>
          </div>
          <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
            {testCases && testCases.length > 0 ? (
              testCases.map((testCase: TestCase) => (
                <div
                  key={testCase.case_id}
                  className={`px-6 py-4 hover:bg-slate-700/50 cursor-pointer ${
                    selectedCaseId === testCase.case_id ? 'bg-slate-700' : ''
                  }`}
                  onClick={() => handleView(testCase)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{testCase.case_id}</span>
                        {testCase.status === 'approved' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                            已审核
                          </span>
                        )}
                        {testCase.status === 'draft' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                            草稿
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white mt-1">{testCase.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className={`font-medium ${
                          testCase.priority === 'p0' ? 'text-red-400' :
                          testCase.priority === 'p1' ? 'text-orange-400' :
                          'text-yellow-400'
                        }`}>
                          {testCase.priority.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span>{testCase.steps.length} 步</span>
                        {testCase.estimated_time && (
                          <>
                                <span>•</span>
                                <span>{testCase.estimated_time} 分钟</span>
                              </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-400">
                <p className="text-lg font-medium mb-2">{t('functionalTest.testCases.noTestCases')}</p>
                <p className="text-sm">从测试点生成测试用例</p>
              </div>
            )}
          </div>
        </div>

        {/* 测试用例详情 */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          {selectedCase ? (
            <>
              <div className="bg-slate-700 px-6 py-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-300 uppercase">用例详情</h2>
                <div className="flex gap-2">
                  {selectedCase.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApprove(selectedCase.case_id)
                      }}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      审核通过
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(selectedCase.case_id)
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">用例编号</div>
                    <div className="text-white font-medium">{selectedCase.case_id}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">优先级</div>
                    <div className={`font-medium ${
                      selectedCase.priority === 'p0' ? 'text-red-400' :
                      selectedCase.priority === 'p1' ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>
                      {selectedCase.priority.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">模块</div>
                    <div className="text-white">{selectedCase.module_name}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">页面</div>
                    <div className="text-white">{selectedCase.page_name}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">复杂度</div>
                    <div className="text-white">
                      {selectedCase.complexity && t(`functionalTest.testCases.complexities.${selectedCase.complexity}`)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">预估时间</div>
                    <div className="text-white">{selectedCase.estimated_time} 分钟</div>
                  </div>
                </div>

                {/* 标题 */}
                <div>
                  <div className="text-gray-400 text-sm mb-1">用例标题</div>
                  <div className="text-white font-medium">{selectedCase.title}</div>
                </div>

                {/* 标签 */}
                {selectedCase.tags && selectedCase.tags.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2">标签</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCase.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 前置条件 */}
                {selectedCase.preconditions && selectedCase.preconditions.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2">前置条件</div>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                      {selectedCase.preconditions.map((condition, index) => (
                        <li key={index}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 测试步骤 */}
                <div>
                  <div className="text-gray-400 text-sm mb-2">测试步骤</div>
                  <div className="space-y-3">
                    {selectedCase.steps.map((step, index) => (
                      <div key={index} className="bg-slate-700 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {step.step_number}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-white mb-1">{step.action}</div>
                            <div className="text-xs text-gray-400">预期: {step.expected_result}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">选择一个测试用例查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          title="删除测试用例"
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
        <p className="text-gray-300 mb-6">确定要删除此测试用例吗？此操作无法撤销。</p>
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
