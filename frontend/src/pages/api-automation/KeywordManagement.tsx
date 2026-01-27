import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Key, Plus, Search, Code, Eye, Trash2, Loader2, FileCode } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { keywordsApi } from '@/api/client'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/common/EmptyState'

interface KeywordItem {
    id: number
    name: string
    func_name: string
    category: string
    function_code: string
    is_active: boolean
    project_id: number
    description?: string
}

const typeColors: Record<string, string> = {
    'request': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    'assert': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'extract': 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    'db': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'custom': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
}

const typeLabels: Record<string, string> = {
    'request': '发送请求',
    'assert': '断言',
    'extract': '提取变量',
    'db': '数据库操作',
    'custom': '自定义操作',
}

export default function KeywordManagement() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { success, error } = useToast()
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<KeywordItem | null>(null)

    // 获取关键字列表
    const { data: keywordsData, isLoading } = useQuery({
        queryKey: ['keywords'],
        queryFn: async () => {
            const res = await keywordsApi.list()
            return (res.data?.items ?? res.data ?? []) as KeywordItem[]
        }
    })

    // 删除关键字
    const deleteMutation = useMutation({
        mutationFn: (id: number) => keywordsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keywords'] })
            setDeleteTarget(null)
            success('删除成功')
        },
        onError: () => {
            error('删除失败')
        }
    })

    // 切换状态
    const toggleMutation = useMutation({
        mutationFn: (id: number) => keywordsApi.toggle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['keywords'] })
        }
    })

    // 生成文件
    const generateFileMutation = useMutation({
        mutationFn: (id: number) => keywordsApi.generateFile(id),
        onSuccess: (res) => {
            success(res.data.message || '生成成功')
        },
        onError: (err: any) => {
            error(err?.response?.data?.detail || '生成失败')
        }
    })

    const keywords = keywordsData ?? []

    // 前端过滤
    const filteredKeywords = keywords.filter(keyword => {
        const matchesSearch = keyword.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            keyword.func_name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = !typeFilter || keyword.category === typeFilter
        return matchesSearch && matchesType
    })

    const filterOptions = [
        { label: '全部类型', value: '' },
        { label: '发送请求', value: 'request' },
        { label: '断言', value: 'assert' },
        { label: '提取变量', value: 'extract' },
        { label: '数据库操作', value: 'db' },
        { label: '自定义操作', value: 'custom' },
    ]

    return (
        <div className="p-8 space-y-8">
            {/* 页面标题 */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Key className="w-8 h-8 text-cyan-400" />
                        {t('keywords.title')}
                    </h1>
                    <p className="text-slate-400 mt-1">维护核心执行器中定义的关键字代码</p>
                </div>
                <motion.button
                    onClick={() => navigate('/api/keywords/new')}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-2 text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus className="w-4 h-4" />
                    <span>{t('keywords.newKeyword')}</span>
                </motion.button>
            </motion.div>

            {/* 搜索和筛选 */}
            <motion.div
                className="flex gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索关键字..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    />
                </div>
                <div className="w-48">
                    <CustomSelect
                        value={typeFilter}
                        onChange={setTypeFilter}
                        options={filterOptions}
                        placeholder="筛选类型"
                    />
                </div>
            </motion.div>

            {/* 加载状态 */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
            ) : (
                /* 关键字列表 */
                <motion.div
                    className="rounded-2xl glass border border-white/5 overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">{t('common.name')}</th>
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">方法名</th>
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">操作类型</th>
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">{t('common.status')}</th>
                                <th className="text-left text-slate-400 font-medium text-sm px-6 py-4">{t('common.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredKeywords.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            title="暂无关键字数据"
                                            description="点击右上角创建新的关键字"
                                            icon={Code}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredKeywords.map((keyword, i) => (
                                    <motion.tr
                                        key={keyword.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 + i * 0.05 }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 flex items-center justify-center border border-white/5">
                                                    <Code className="w-5 h-5 text-cyan-400" />
                                                </div>
                                                <span className="text-white font-medium group-hover:text-cyan-400 transition-colors">{keyword.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs text-slate-300 bg-white/5 px-2 py-1.5 rounded-lg border border-white/5 font-mono">{keyword.func_name}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${typeColors[keyword.category] || typeColors['custom']}`}>
                                                {typeLabels[keyword.category] || keyword.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleMutation.mutate(keyword.id)}
                                                className="flex items-center gap-2 group/status"
                                            >
                                                {keyword.is_active ? (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover/status:scale-125 transition-transform" />
                                                        <span className="text-emerald-400 text-sm">{t('common.enable')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-slate-500 group-hover/status:scale-125 transition-transform" />
                                                        <span className="text-slate-500 text-sm">{t('common.disable')}</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/api/keywords/${keyword.id}`)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                                    title="查看/编辑"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => generateFileMutation.mutate(keyword.id)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                                                    title="生成代码文件"
                                                >
                                                    <FileCode className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(keyword)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="删除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* 删除确认对话框 */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="删除关键字"
                description={`确定要删除关键字「${deleteTarget?.name}」吗？此操作无法撤销。`}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                onClose={() => setDeleteTarget(null)}
                isDestructive
            />
        </div>
    )
}
