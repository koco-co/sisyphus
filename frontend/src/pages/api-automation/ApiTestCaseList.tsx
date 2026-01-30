import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Plus,
    Search,
    Trash2,
    Loader2,
    Edit2,
    Play,
    FileText,
    Tag,
    ToggleLeft,
    ToggleRight,
    Clock
} from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { apiTestCasesApi } from '@/api/client'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ApiTestCase {
    id: number
    project_id: number
    name: string
    description?: string
    tags?: string[]
    enabled: boolean
    created_at: string
    updated_at: string
}

interface ListResponse {
    total: number
    pages: number
    items: ApiTestCase[]
}

export default function ApiTestCaseList() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { projectId } = useParams<{ projectId: string }>()
    const queryClient = useQueryClient()
    const { success, error: showError } = useToast()

    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [tagFilter, setTagFilter] = useState('')
    const [enabledOnly, setEnabledOnly] = useState(false)
    const size = 10

    // Delete state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [caseToDelete, setCaseToDelete] = useState<ApiTestCase | null>(null)

    // Execute state
    const [executingCaseId, setExecutingCaseId] = useState<number | null>(null)

    // Fetch test cases
    const { data: listData, isLoading } = useQuery({
        queryKey: ['api-test-cases', projectId, page, size, searchQuery, tagFilter, enabledOnly],
        queryFn: () => {
            if (!projectId) throw new Error('Project ID is required')
            return apiTestCasesApi.list(Number(projectId), {
                page,
                size,
                search: searchQuery || undefined,
                tags: tagFilter || undefined,
                enabled_only: enabledOnly
            }).then(res => res.data)
        },
        enabled: !!projectId
    })

    const testCases = listData?.items || []
    const total = listData?.total || 0
    const pages = listData?.pages || 0

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiTestCasesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-test-cases'] })
            setIsDeleteOpen(false)
            setCaseToDelete(null)
            success('删除成功')
        },
        onError: () => showError('删除失败')
    })

    // Toggle enabled mutation
    const toggleMutation = useMutation({
        mutationFn: (testCase: ApiTestCase) => {
            return apiTestCasesApi.update(testCase.id, {
                ...testCase,
                enabled: !testCase.enabled
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-test-cases'] })
            success('状态已更新')
        },
        onError: () => showError('更新失败')
    })

    // Execute mutation
    const executeMutation = useMutation({
        mutationFn: (testCaseId: number) => {
            return apiTestCasesApi.execute(testCaseId, {})
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['api-test-cases'] })
            success('测试已提交执行')
            // Navigate to execution result page
            if (data?.data?.id) {
                navigate(`/api/executions/${data.data.id}`)
            }
        },
        onError: () => showError('执行失败')
    })

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Get all unique tags
    const allTags = Array.from(
        new Set(testCases.flatMap(tc => tc.tags || []))
    ).sort()

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <motion.header
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-cyan-500" />
                        API 测试用例
                    </h1>
                    <p className="text-slate-400">管理和执行 API 自动化测试用例</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/api/projects/${projectId}/test-cases/visual/new`)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Plus className="w-5 h-5" />
                    新建测试用例
                </motion.button>
            </motion.header>

            {/* Filters */}
            <motion.div
                className="flex gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setPage(1)
                        }}
                        placeholder="搜索用例名称或描述..."
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                    />
                </div>

                {/* Tag Filter */}
                <select
                    value={tagFilter}
                    onChange={(e) => {
                        setTagFilter(e.target.value)
                        setPage(1)
                    }}
                    className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                    <option value="">所有标签</option>
                    {allTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                    ))}
                </select>

                {/* Enabled Toggle */}
                <button
                    onClick={() => {
                        setEnabledOnly(!enabledOnly)
                        setPage(1)
                    }}
                    className={cn(
                        "px-6 py-3 rounded-2xl font-semibold transition-all flex items-center gap-2",
                        enabledOnly
                            ? "bg-cyan-500 text-white"
                            : "bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                    )}
                >
                    {enabledOnly ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    仅显示启用
                </button>
            </motion.div>

            {/* List View */}
            <motion.div
                className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[200px]">用例名称</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 flex-1">描述</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[150px]">标签</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[100px]">状态</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[180px]">更新时间</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[120px]">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {testCases.length > 0 ? (
                                testCases.map((testCase, index) => (
                                    <motion.tr
                                        key={testCase.id}
                                        className="hover:bg-white/5 transition-colors group"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + index * 0.05 }}
                                    >
                                        <td className="px-6 py-4">
                                            <Tooltip content={testCase.name} position="top">
                                                <span className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate block w-full">
                                                    {testCase.name}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Tooltip content={testCase.description || '-'} position="top">
                                                <span className="text-slate-400 truncate block w-full">
                                                    {testCase.description || '-'}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {testCase.tags && testCase.tags.length > 0 ? (
                                                    testCase.tags.slice(0, 2).map(tag => (
                                                        <span
                                                            key={tag}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs"
                                                        >
                                                            <Tag className="w-3 h-3" />
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-600 text-sm">-</span>
                                                )}
                                                {testCase.tags && testCase.tags.length > 2 && (
                                                    <span className="text-slate-500 text-xs">
                                                        +{testCase.tags.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleMutation.mutate(testCase)}
                                                className={cn(
                                                    "transition-colors",
                                                    testCase.enabled
                                                        ? "text-emerald-400 hover:text-emerald-300"
                                                        : "text-slate-600 hover:text-slate-500"
                                                )}
                                            >
                                                {testCase.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDate(testCase.updated_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Tooltip content="执行" position="top">
                                                    <button
                                                        onClick={() => {
                                                            setExecutingCaseId(testCase.id)
                                                            executeMutation.mutate(testCase.id)
                                                        }}
                                                        disabled={executeMutation.isPending}
                                                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {executeMutation.isPending && executingCaseId === testCase.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Play className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="编辑" position="top">
                                                    <button
                                                        onClick={() => navigate(`/api/test-cases/${testCase.id}`)}
                                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="删除" position="top">
                                                    <button
                                                        onClick={() => {
                                                            setCaseToDelete(testCase)
                                                            setIsDeleteOpen(true)
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState
                                            title="暂无测试用例"
                                            description="创建您的第一个 API 测试用例"
                                            icon={FileText}
                                            action={
                                                <button
                                                    onClick={() => navigate(`/api/projects/${projectId}/test-cases/new`)}
                                                    className="text-cyan-400 hover:underline text-sm"
                                                >
                                                    立即创建
                                                </button>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-white/5 bg-slate-800/30">
                        <Pagination
                            page={page}
                            size={size}
                            total={total}
                            pages={pages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </motion.div>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={() => caseToDelete && deleteMutation.mutate(caseToDelete.id)}
                title="删除测试用例"
                description={`请输入用例名称确认删除。此操作无法撤销。`}
                confirmText="删除"
                isDestructive={true}
                verificationText={caseToDelete?.name}
            />
        </div>
    )
}
