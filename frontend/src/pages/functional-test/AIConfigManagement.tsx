import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { aiConfigApi } from '@/api/client'
import { Plus, Edit, Trash2, Check, Settings } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface AIProviderConfig {
  id: number
  provider_name: string
  provider_type: string
  model_name: string
  temperature: number
  is_enabled: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export default function AIConfigManagement() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 获取 AI 配置列表
  const { data: configs, isLoading } = useQuery({
    queryKey: ['ai-configs'],
    queryFn: () => aiConfigApi.list().then(res => res.data)
  })

  // 创建配置
  const createMutation = useMutation({
    mutationFn: (data: any) => aiConfigApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      setIsDialogOpen(false)
      toast.success('AI 配置创建成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '创建失败')
    }
  })

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => aiConfigApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      setIsDialogOpen(false)
      setEditingConfig(null)
      toast.success('AI 配置更新成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '更新失败')
    }
  })

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: (id: number) => aiConfigApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      setShowDeleteDialog(false)
      toast.success('AI 配置删除成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '删除失败')
    }
  })

  // 设为默认
  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => aiConfigApi.update(id, { is_default: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      toast.success('已设为默认配置')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '操作失败')
    }
  })

  const handleEdit = (config: AIProviderConfig) => {
    setEditingConfig(config)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletingId(id)
    setShowDeleteDialog(true)
  }

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id)
  }

  const handleSubmit = (data: any) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data })
    } else {
      createMutation.mutate(data)
    }
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

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('functionalTest.aiConfig.title')}</h1>
          <p className="text-gray-400 mt-1">{t('functionalTest.aiConfig.description')}</p>
        </div>
        <button
          onClick={() => {
            setEditingConfig(null)
            setIsDialogOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('functionalTest.aiConfig.createConfig')}
        </button>
      </div>

      {/* 配置列表 */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('functionalTest.aiConfig.providerName')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('functionalTest.aiConfig.providerType')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('functionalTest.aiConfig.modelName')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('functionalTest.aiConfig.temperature')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('functionalTest.aiConfig.isEnabled')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('functionalTest.aiConfig.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {configs?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">{t('functionalTest.aiConfig.noConfig')}</p>
                  <p className="text-sm mb-4">{t('functionalTest.aiConfig.createFirst')}</p>
                  <button
                    onClick={() => setIsDialogOpen(true)}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {t('functionalTest.aiConfig.createConfig')}
                  </button>
                </td>
              </tr>
            ) : (
              configs?.map((config: AIProviderConfig) => (
                <tr key={config.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-white">
                        {config.provider_name}
                        {config.is_default && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500 text-white">
                            {t('functionalTest.aiConfig.isDefault')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {t(`functionalTest.aiConfig.providerTypes.${config.provider_type}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {config.model_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {config.temperature}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {config.is_enabled ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                        {t('common.enable')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                        {t('common.disable')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {!config.is_default && (
                        <button
                          onClick={() => handleSetDefault(config.id)}
                          className="text-cyan-400 hover:text-cyan-300"
                          title={t('functionalTest.aiConfig.setDefault')}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-gray-400 hover:text-white"
                        title={t('functionalTest.aiConfig.editConfig')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-red-400 hover:text-red-300"
                        title={t('functionalTest.aiConfig.deleteConfig')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑对话框 */}
      {isDialogOpen && (
        <AIConfigDialog
          config={editingConfig}
          onSubmit={handleSubmit}
          onClose={() => {
            setIsDialogOpen(false)
            setEditingConfig(null)
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          title={t('functionalTest.aiConfig.deleteConfirm')}
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

// 配置对话框组件
function AIConfigDialog({
  config,
  onSubmit,
  onClose
}: {
  config: AIProviderConfig | null
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    provider_name: config?.provider_name || '',
    provider_type: config?.provider_type || 'openai',
    api_key: '',
    model_name: config?.model_name || 'gpt-3.5-turbo',
    temperature: config?.temperature || 0.7,
    is_enabled: config?.is_enabled ?? true,
    is_default: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">
          {config ? t('functionalTest.aiConfig.editConfig') : t('functionalTest.aiConfig.createConfig')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('functionalTest.aiConfig.providerName')}
            </label>
            <input
              type="text"
              required
              value={formData.provider_name}
              onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('functionalTest.aiConfig.providerType')}
            </label>
            <select
              value={formData.provider_type}
              onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="openai">{t('functionalTest.aiConfig.providerTypes.openai')}</option>
              <option value="anthropic">{t('functionalTest.aiConfig.providerTypes.anthropic')}</option>
              <option value="qwen">{t('functionalTest.aiConfig.providerTypes.qwen')}</option>
              <option value="qianfan">{t('functionalTest.aiConfig.providerTypes.qianfan')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              required={!config}
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder={config ? "留空保持不变" : ""}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('functionalTest.aiConfig.modelName')}
            </label>
            <input
              type="text"
              required
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('functionalTest.aiConfig.temperature')} (0-2)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              required
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                className="rounded bg-slate-700 border-slate-600"
              />
              {t('functionalTest.aiConfig.isEnabled')}
            </label>
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
        <p className="text-gray-300 mb-6">{t('functionalTest.aiConfig.deleteConfirmDesc')}</p>
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
