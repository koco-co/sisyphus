import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Copy,
    Download
} from 'lucide-react'
import { apiTestCasesApi } from '@/api/client'
import { cn } from '@/lib/utils'

interface ExecutionStep {
    id: number
    execution_id: number
    step_order: number
    step_name: string
    status: 'passed' | 'failed' | 'skipped' | 'error'
    error_message?: string
    response_data?: Record<string, any>
    response_time?: number
    started_at?: string
    completed_at?: string
}

interface ExecutionDetail {
    id: number
    test_case_id: number
    environment_id?: number
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'error'
    started_at?: string
    completed_at?: string
    result_data?: {
        total_steps: number
        passed_steps: number
        failed_steps: number
        skipped_steps: number
        error_steps: number
        total_duration: number
        avg_response_time: number
    }
    error_message?: string
    steps?: ExecutionStep[]
}

export default function ExecutionResultPage() {
    const { executionId } = useParams<{ executionId: string }>()
    const navigate = useNavigate()
    const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({})

    // Fetch execution detail
    const { data: execution, isLoading } = useQuery({
        queryKey: ['execution-detail', executionId],
        queryFn: () => {
            if (!executionId) throw new Error('Execution ID is required')
            return apiTestCasesApi.getExecution(Number(executionId)).then(res => res.data)
        },
        refetchInterval: (data) => {
            // Poll if still running
            return data?.status === 'running' ? 2000 : false
        }
    })

    // Fetch execution steps
    const { data: steps } = useQuery({
        queryKey: ['execution-steps', executionId],
        queryFn: () => {
            if (!executionId) throw new Error('Execution ID is required')
            return apiTestCasesApi.getExecutionSteps(Number(executionId)).then(res => res.data)
        },
        enabled: !!executionId
    })

    const toggleStep = (stepId: number) => {
        setExpandedSteps(prev => ({
            ...prev,
            [stepId]: !prev[stepId]
        }))
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
            </div>
        )
    }

    const executionData = execution as ExecutionDetail
    const stepsData = steps || []

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <motion.header
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            执行结果详情
                        </h1>
                        <p className="text-slate-400 mt-1">执行 ID: #{executionId}</p>
                    </div>
                </div>

                {executionData?.status === 'running' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-medium">执行中...</span>
                    </div>
                )}
            </motion.header>

            {/* Status Overview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
                <StatusCard
                    title="总步骤"
                    value={executionData?.result_data?.total_steps || 0}
                    icon={<Clock className="w-5 h-5" />}
                    color="text-slate-400"
                    bgColor="bg-slate-500/10"
                />
                <StatusCard
                    title="通过"
                    value={executionData?.result_data?.passed_steps || 0}
                    icon={<CheckCircle className="w-5 h-5" />}
                    color="text-emerald-400"
                    bgColor="bg-emerald-500/10"
                />
                <StatusCard
                    title="失败"
                    value={executionData?.result_data?.failed_steps || 0}
                    icon={<XCircle className="w-5 h-5" />}
                    color="text-red-400"
                    bgColor="bg-red-500/10"
                />
                <StatusCard
                    title="平均响应时间"
                    value={`${executionData?.result_data?.avg_response_time?.toFixed(0) || 0}ms`}
                    icon={<Clock className="w-5 h-5" />}
                    color="text-cyan-400"
                    bgColor="bg-cyan-500/10"
                />
            </motion.div>

            {/* Execution Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900 border border-white/5 rounded-2xl p-6"
            >
                <h2 className="text-lg font-semibold text-white mb-4">执行信息</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-slate-500">状态</span>
                        <div className="mt-1">
                            <StatusBadge status={executionData?.status || 'pending'} />
                        </div>
                    </div>
                    {executionData?.started_at && (
                        <div>
                            <span className="text-slate-500">开始时间</span>
                            <div className="mt-1 text-white">
                                {new Date(executionData.started_at).toLocaleString('zh-CN')}
                            </div>
                        </div>
                    )}
                    {executionData?.completed_at && (
                        <div>
                            <span className="text-slate-500">完成时间</span>
                            <div className="mt-1 text-white">
                                {new Date(executionData.completed_at).toLocaleString('zh-CN')}
                            </div>
                        </div>
                    )}
                    {executionData?.result_data?.total_duration && (
                        <div>
                            <span className="text-slate-500">总耗时</span>
                            <div className="mt-1 text-white">
                                {executionData.result_data.total_duration.toFixed(2)}s
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Error Message */}
            {executionData?.error_message && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-400 mb-2">执行错误</h3>
                            <p className="text-slate-300">{executionData.error_message}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Steps List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h2 className="text-lg font-semibold text-white mb-4">执行步骤</h2>
                <div className="space-y-3">
                    {stepsData.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 border-2 border-dashed border-white/10 rounded-2xl">
                            暂无步骤信息
                        </div>
                    ) : (
                        stepsData.map((step, index) => (
                            <StepResultCard
                                key={step.id}
                                step={step}
                                index={index}
                                expanded={expandedSteps[step.id] || false}
                                onToggle={() => toggleStep(step.id)}
                            />
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// Status Card Component
function StatusCard({
    title,
    value,
    icon,
    color,
    bgColor
}: {
    title: string
    value: string | number
    icon: React.ReactNode
    color: string
    bgColor: string
}) {
    return (
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-xl", bgColor)}>
                    {icon}
                </div>
                <div className="text-right">
                    <div className={cn("text-2xl font-bold", color)}>{value}</div>
                    <div className="text-sm text-slate-500 mt-1">{title}</div>
                </div>
            </div>
        </div>
    )
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const config = {
        pending: { color: 'text-slate-400 bg-slate-400/10', label: '等待中' },
        running: { color: 'text-amber-400 bg-amber-400/10', label: '执行中' },
        passed: { color: 'text-emerald-400 bg-emerald-400/10', label: '通过' },
        failed: { color: 'text-red-400 bg-red-400/10', label: '失败' },
        skipped: { color: 'text-slate-500 bg-slate-500/10', label: '跳过' },
        error: { color: 'text-red-400 bg-red-400/10', label: '错误' }
    }

    const { color, label } = config[status as keyof typeof config] || config.pending

    return (
        <span className={cn("px-3 py-1 rounded-lg text-sm font-medium", color)}>
            {label}
        </span>
    )
}

// Step Result Card Component
function StepResultCard({
    step,
    index,
    expanded,
    onToggle
}: {
    step: ExecutionStep
    index: number
    expanded: boolean
    onToggle: () => void
}) {
    const statusConfig = {
        passed: { icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
        failed: { icon: <XCircle className="w-5 h-5" />, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
        skipped: { icon: <Clock className="w-5 h-5" />, color: 'text-slate-500', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20' },
        error: { icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' }
    }

    const config = statusConfig[step.status] || statusConfig.skipped

    return (
        <div className={cn("border rounded-2xl overflow-hidden", config.borderColor)}>
            <div
                className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={onToggle}
            >
                {/* Step Number */}
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400">
                    {index + 1}
                </div>

                {/* Status Icon */}
                <div className={cn("p-2 rounded-xl", config.bgColor, config.color)}>
                    {config.icon}
                </div>

                {/* Step Name */}
                <div className="flex-1">
                    <div className="font-medium text-white">{step.step_name}</div>
                    {step.response_time && (
                        <div className="text-sm text-slate-500 mt-1">
                            响应时间: {step.response_time}ms
                        </div>
                    )}
                </div>

                {/* Expand Icon */}
                <div className={cn("transition-transform", expanded && "rotate-180")}>
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-6 py-4 border-t border-white/5 bg-slate-900/50">
                    {/* Error Message */}
                    {step.error_message && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-red-400 mb-1">错误信息</div>
                                    <div className="text-sm text-slate-300">{step.error_message}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Response Data */}
                    {step.response_data && Object.keys(step.response_data).length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-slate-400">响应数据</h4>
                                <button
                                    onClick={() => navigator.clipboard.writeText(JSON.stringify(step.response_data, null, 2))}
                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="复制"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <pre className="bg-slate-950 border border-white/5 rounded-xl p-4 overflow-x-auto">
                                <code className="text-sm text-slate-300 font-mono">
                                    {JSON.stringify(step.response_data, null, 2)}
                                </code>
                            </pre>
                        </div>
                    )}

                    {/* Time Info */}
                    {(step.started_at || step.completed_at) && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {step.started_at && (
                                <div>
                                    <span className="text-slate-500">开始时间</span>
                                    <div className="text-white mt-1">
                                        {new Date(step.started_at).toLocaleTimeString('zh-CN')}
                                    </div>
                                </div>
                            )}
                            {step.completed_at && (
                                <div>
                                    <span className="text-slate-500">完成时间</span>
                                    <div className="text-white mt-1">
                                        {new Date(step.completed_at).toLocaleTimeString('zh-CN')}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
