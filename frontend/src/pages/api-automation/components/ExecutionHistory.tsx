import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Calendar,
    Eye,
    Trash2,
    Filter
} from 'lucide-react'
import { apiTestCasesApi } from '@/api/client'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface ExecutionHistoryProps {
    testCaseId: number
}

export function ExecutionHistory({ testCaseId }: ExecutionHistoryProps) {
    const navigate = useNavigate()
    const [limit, setLimit] = useState(10)

    // Fetch execution history
    const { data: executions, isLoading } = useQuery({
        queryKey: ['test-case-executions', testCaseId, limit],
        queryFn: () => {
            return apiTestCasesApi.listExecutions(testCaseId, limit).then(res => res.data)
        }
    })

    const executionList = executions || []

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    执行历史
                </h3>
                <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                    <option value={5}>最近 5 次</option>
                    <option value={10}>最近 10 次</option>
                    <option value={20}>最近 20 次</option>
                </select>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-8 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
                </div>
            ) : executionList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-white/10 rounded-xl">
                    暂无执行记录
                </div>
            ) : (
                <div className="space-y-2">
                    {executionList.map((execution: any, index) => (
                        <ExecutionHistoryItem
                            key={execution.id}
                            execution={execution}
                            index={index}
                            onClick={() => navigate(`/api/executions/${execution.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function ExecutionHistoryItem({
    execution,
    index,
    onClick
}: {
    execution: any
    index: number
    onClick: () => void
}) {
    const statusConfig = {
        pending: { icon: <Clock className="w-4 h-4" />, color: 'text-slate-400', bgColor: 'bg-slate-400/10', label: '等待中' },
        running: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-amber-400', bgColor: 'bg-amber-400/10', label: '执行中' },
        passed: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', label: '通过' },
        failed: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-400/10', label: '失败' },
        skipped: { icon: <Clock className="w-4 h-4" />, color: 'text-slate-500', bgColor: 'bg-slate-500/10', label: '跳过' },
        error: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-400/10', label: '错误' }
    }

    const config = statusConfig[execution.status as keyof typeof statusConfig] || statusConfig.pending

    // Calculate stats
    const passedSteps = execution.result_data?.passed_steps || 0
    const failedSteps = execution.result_data?.failed_steps || 0
    const totalSteps = execution.result_data?.total_steps || 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className={cn(
                "bg-slate-800/50 border rounded-xl p-4 cursor-pointer transition-all",
                "hover:bg-slate-800 hover:border-white/10",
                execution.status === 'running' && "border-amber-500/30",
                execution.status === 'passed' && "border-emerald-500/30",
                execution.status === 'failed' && "border-red-500/30"
            )}
        >
            <div className="flex items-center gap-4">
                {/* Status */}
                <div className={cn("p-2 rounded-lg", config.bgColor, config.color)}>
                    {config.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-white">{config.label}</span>
                        {execution.started_at && (
                            <span className="text-xs text-slate-500">
                                {new Date(execution.started_at).toLocaleString('zh-CN')}
                            </span>
                        )}
                    </div>

                    {/* Stats */}
                    {totalSteps > 0 && (
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>总计: {totalSteps}</span>
                            <span className="text-emerald-400">通过: {passedSteps}</span>
                            {failedSteps > 0 && (
                                <span className="text-red-400">失败: {failedSteps}</span>
                            )}
                            {execution.result_data?.total_duration && (
                                <span>耗时: {execution.result_data.total_duration.toFixed(2)}s</span>
                            )}
                        </div>
                    )}

                    {/* Error Message */}
                    {execution.error_message && (
                        <div className="mt-2 text-xs text-red-400 truncate">
                            {execution.error_message}
                        </div>
                    )}
                </div>

                {/* Action */}
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
}
