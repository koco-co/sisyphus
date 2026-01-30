import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    Trash2,
    Copy,
    ToggleLeft,
    ToggleRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepItemData, StepType, STEP_TYPE_INFO } from '../TestCaseEditor.types'

interface StepItemProps {
    stepItem: StepItemData
    index: number
    isSelected: boolean
    onSelect: () => void
    onToggleExpand: () => void
    onDelete: () => void
    onDuplicate: () => void
    onToggleEnabled: () => void
}

export function StepItem({
    stepItem,
    index,
    isSelected,
    onSelect,
    onToggleExpand,
    onDelete,
    onDuplicate,
    onToggleEnabled
}: StepItemProps) {
    const stepInfo = STEP_TYPE_INFO[stepItem.type]
    const [isHovered, setIsHovered] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "border rounded-xl overflow-hidden transition-all",
                isSelected
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-white/5 bg-slate-800/50 hover:bg-slate-800"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={onSelect}
            >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300">
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Expand/Collapse */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpand()
                    }}
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    {stepItem.expanded ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>

                {/* Step Number */}
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                    {index + 1}
                </div>

                {/* Step Icon */}
                <span className="text-xl">{stepInfo.icon}</span>

                {/* Step Name */}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                        {stepItem.step.name || stepInfo.label}
                    </div>
                    <div className="text-xs text-slate-500">
                        {stepInfo.label}
                    </div>
                </div>

                {/* Actions */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={onToggleEnabled}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="启用/禁用"
                            >
                                {stepItem.step.enabled !== false ? (
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <ToggleLeft className="w-4 h-4 text-slate-600" />
                                )}
                            </button>
                            <button
                                onClick={onDuplicate}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                title="复制"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                title="删除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {stepItem.expanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-2 border-t border-white/5">
                            {/* Step Description */}
                            <p className="text-sm text-slate-400 mb-3">
                                {stepInfo.description}
                            </p>

                            {/* Step Type Specific Preview */}
                            {stepItem.type === StepType.REQUEST && (
                                <RequestStepPreview step={stepItem.step} />
                            )}
                            {stepItem.type === StepType.WAIT && (
                                <WaitStepPreview step={stepItem.step} />
                            )}
                            {stepItem.type === StepType.DATABASE && (
                                <DatabaseStepPreview step={stepItem.step} />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// Request Step Preview
function RequestStepPreview({ step }: { step: any }) {
    const method = step.request?.method || 'GET'
    const url = step.request?.url || ''

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded",
                    method === 'GET' && "text-emerald-400 bg-emerald-400/10",
                    method === 'POST' && "text-cyan-400 bg-cyan-400/10",
                    method === 'PUT' && "text-amber-400 bg-amber-400/10",
                    method === 'DELETE' && "text-pink-400 bg-pink-400/10",
                    method === 'PATCH' && "text-orange-400 bg-orange-400/10"
                )}>
                    {method}
                </span>
                <span className="text-sm text-slate-300 font-mono truncate">
                    {url || '/api/path'}
                </span>
            </div>
            {step.validate && step.validate.length > 0 && (
                <div className="text-xs text-slate-500">
                    {step.validate.length} 个断言
                </div>
            )}
        </div>
    )
}

// Wait Step Preview
function WaitStepPreview({ step }: { step: any }) {
    const seconds = step.wait?.seconds || 0

    return (
        <div className="text-sm text-slate-400">
            等待 {seconds} 秒
        </div>
    )
}

// Database Step Preview
function DatabaseStepPreview({ step }: { step: any }) {
    const dbType = step.database?.type || 'unknown'
    const query = step.database?.query || ''

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400 uppercase">
                    {dbType}
                </span>
            </div>
            {query && (
                <div className="text-sm text-slate-300 font-mono truncate">
                    {query}
                </div>
            )}
        </div>
    )
}
