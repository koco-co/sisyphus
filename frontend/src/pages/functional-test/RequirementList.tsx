import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { requirementsApi } from '@/api/client'
import { Plus, Edit, Trash2, MessageSquare, List, FileText, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Requirement {
  id: number
  requirement_id: string
  title: string
  description: string
  priority: string
  module_name?: string
  status: string
  clarification_status: string
  created_at: string
  updated_at: string
}

export default function RequirementList() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [size] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 获取需求列表
  const { data: requirementsData, isLoading } = useQuery({
    queryKey: ['requirements', page, size, statusFilter],
    queryFn: () => requirementsApi.list({ page, size, status: statusFilter || undefined }).then(res => res.data)
  })

  // 创建需求
  const createMutation = useMutation({
    mutationFn: (data: any) => requirementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
      setIsCreateDialogOpen(false)
      toast.success('需求创建成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '创建失败')
    }
  })

  // 更新需求
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => requirementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
      setIsEditDialogOpen(false)
      setEditingRequirement(null)
      toast.success('需求更新成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '更新失败')
    }
  })

  // 删除需求
  const deleteMutation = useMutation({
    mutationFn: (id: number) => requirementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] })
      setShowDeleteDialog(false)
      setDeletingId(null)
      toast.success('需求删除成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '删除失败')
    }
  })

  const handleCreate = () => {
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (requirement: Requirement) => {
    setEditingRequirement(requirement)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletingId(id)
    setShowDeleteDialog(true)
  }

  const handleStartClarification = (requirementId: string) => {
    navigate(`/functional-test/clarification/${requirementId}`)
  }

  const handleViewTestPoints = (requirementId: number) => {
    navigate(`/functional-test/test-points/${requirementId}`)
  }

  const handleViewTestCases = (requirementId: number) => {
    navigate(`/functional-test/test-cases/${requirementId}`)
  }

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const requirements = requirementsData?.items || requirementsData || []

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('functionalTest.requirements.title')}</h1>
          <p className="text-gray-400 mt-1">管理和跟踪项目需求</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('functionalTest.requirements.createRequirement')}
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索需求标题或描述..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">所有状态</option>
            <option value="draft">草稿</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      {/* 需求列表 */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {requirements.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('functionalTest.requirements.noRequirements')}</p>
            <p className="text-sm mb-4">{t('functionalTest.requirements.createFirst')}</p>
            <button
              onClick={handleCreate}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {t('functionalTest.requirements.createRequirement')}
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  需求编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  优先级
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  澄清状态
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {requirements.map((requirement: Requirement) => (
                <tr key={requirement.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {requirement.requirement_id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{requirement.title}</div>
                    {requirement.module_name && (
                      <div className="text-xs text-gray-400 mt-1">{requirement.module_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium ${
                      requirement.priority === 'p0' ? 'text-red-400' :
                      requirement.priority === 'p1' ? 'text-orange-400' :
                      requirement.priority === 'p2' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {requirement.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      requirement.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                      requirement.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {requirement.status === 'draft' ? '草稿' :
                       requirement.status === 'active' ? '进行中' : '已完成'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      requirement.clarification_status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                      requirement.clarification_status === 'clarifying' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {t(`functionalTest.requirements.clarificationStatuses.${requirement.clarification_status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStartClarification(requirement.requirement_id)}
                        className="text-cyan-400 hover:text-cyan-300"
                        title={t('functionalTest.requirements.startClarification')}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewTestPoints(requirement.id)}
                        className="text-purple-400 hover:text-purple-300"
                        title={t('functionalTest.requirements.generateTestPoints')}
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewTestCases(requirement.id)}
                        className="text-green-400 hover:text-green-300"
                        title={t('functionalTest.requirements.generateTestCases')}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(requirement)}
                        className="text-gray-400 hover:text-white"
                        title={t('functionalTest.requirements.editRequirement')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(requirement.id)}
                        className="text-red-400 hover:text-red-300"
                        title={t('functionalTest.requirements.deleteRequirement')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 创建需求对话框 */}
      {isCreateDialogOpen && (
        <RequirementDialog
          mode="create"
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      )}

      {/* 编辑需求对话框 */}
      {isEditDialogOpen && editingRequirement && (
        <RequirementDialog
          mode="edit"
          requirement={editingRequirement}
          onSubmit={(data) => updateMutation.mutate({ id: editingRequirement.id, data })}
          onClose={() => {
            setIsEditDialogOpen(false)
            setEditingRequirement(null)
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          title={t('functionalTest.requirements.deleteRequirement')}
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

// 需求对话框组件
function RequirementDialog({
  mode,
  requirement,
  onSubmit,
  onClose
}: {
  mode: 'create' | 'edit'
  requirement?: Requirement
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: requirement?.title || '',
    description: requirement?.description || '',
    priority: requirement?.priority || 'p1',
    module_name: requirement?.module_name || '',
    status: requirement?.status || 'draft'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-4">
          {mode === 'create' ? t('functionalTest.requirements.createRequirement') : t('functionalTest.requirements.editRequirement')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              需求描述 <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                优先级
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="p0">P0 - 最高</option>
                <option value="p1">P1 - 高</option>
                <option value="p2">P2 - 中</option>
                <option value="p3">P3 - 低</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="draft">草稿</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              模块名称
            </label>
            <input
              type="text"
              value={formData.module_name}
              onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
              placeholder="例如: 用户管理"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
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
        <p className="text-gray-300 mb-6">确定要删除此需求吗？此操作无法撤销。</p>
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
