import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Play,
    Pause,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    ChevronRight
} from 'lucide-react'
import { apiTestCasesApi } from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface BatchExecutionProps {
    testCaseIds: number[]
    onComplete?: () => void
}

export function BatchExecution({ testCaseIds, onComplete }: BatchExecutionProps) {
    const { success, error: showError } = useToast()
    const [results, setResults] = useState<Record<number, 'running' | 'passed' | 'failed' | 'error'>>({})
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isExecuting, setIsExecuting] = useState(false)

    const executeAll = async () => {
        setIsExecuting(true)
        setCurrentIndex(0)

        for (let i = 0; i < testCaseIds.length; i++) {
            const testCaseId = testCaseIds[i]
            setCurrentIndex(i)
            setResults(prev => ({ ...prev, [testCaseId]: 'running' }))

            try {
                await apiTestCasesApi.execute(testCaseId, {})
                setResults(prev => ({ ...prev, [testCaseId]: 'passed' }))
            } catch (error) {
                setResults(prev => ({ ...prev, [testCaseId]: 'failed' }))
            }
        }

        setIsExecuting(false)
        setCurrentIndex(0)
        success(`批量执行完成`)
        onComplete?.()
    }

    const passedCount = Object.values(results).filter(r => r === 'passed').length
    const failedCount = Object.values(results).filter(r => r === 'failed').length
    const completedCount = passedCount + failedCount

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">批量执行</h3>
                    <div className="text-sm text-slate-500">
                        进度: {completedCount} / {testCaseIds.length}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(completedCount / testCaseIds.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">通过: {passedCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">失败: {failedCount}</span>
                    </div>
                    {isExecuting && (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                            <span className="text-amber-400">执行中...</span>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="mt-4 flex gap-3">
                    {!isExecuting ? (
                        <button
                            onClick={executeAll}
                            disabled={testCaseIds.length === 0}
                            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center gap-2 transition-all"
                        >
                            <Play className="w-4 h-4" />
                            开始执行
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsExecuting(false)}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center gap-2 transition-all"
                        >
                            <Pause className="w-4 h-4" />
                            停止执行
                        </button>
                    )}
                </div>
            </div>

            {/* Test Case List with Status */}
            <div className="space-y-2">
                {testCaseIds.map((testCaseId, index) => {
                    const status = results[testCaseId]
                    const isCurrent = index === currentIndex && isExecuting

                    return (
                        <motion.div
                            key={testCaseId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                                isCurrent && "border-amber-500/30 bg-amber-500/5",
                                status === 'passed' && "border-emerald-500/30 bg-emerald-500/5",
                                status === 'failed' && "border-red-500/30 bg-red-500/5",
                                !status && "border-white/5 bg-slate-800/50"
                            )}
                        >
                            {/* Status Icon */}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center">
                                {status === 'running' || isCurrent ? (
                                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                ) : status === 'passed' ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                ) : status === 'failed' ? (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                ) : (
                                    <Clock className="w-4 h-4 text-slate-500" />
                                )}
                            </div>

                            {/* Test Case ID */}
                            <div className="flex-1 text-sm text-white">
                                测试用例 #{testCaseId}
                            </div>

                            {/* Arrow */}
                            {isCurrent && (
                                <ChevronRight className="w-4 h-4 text-amber-400 animate-pulse" />
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
