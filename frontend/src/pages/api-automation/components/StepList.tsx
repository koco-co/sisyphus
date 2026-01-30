import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepItemData, StepType, STEP_TYPE_INFO } from '../TestCaseEditor.types'
import { StepItem } from './StepItem'

interface StepListProps {
    steps: StepItemData[]
    selectedStepId: string | null
    onSelectStep: (stepId: string) => void
    onAddStep: (type: StepType, index?: number) => void
    onUpdateStep: (stepId: string, updates: Partial<StepItemData>) => void
    onDeleteStep: (stepId: string) => void
    onDuplicateStep: (stepId: string) => void
    onToggleExpand: (stepId: string) => void
    onReorderSteps: (fromIndex: number, toIndex: number) => void
}

export function StepList({
    steps,
    selectedStepId,
    onSelectStep,
    onAddStep,
    onUpdateStep,
    onDeleteStep,
    onDuplicateStep,
    onToggleExpand,
    onReorderSteps
}: StepListProps) {
    const [showAddMenu, setShowAddMenu] = useState(false)
    const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null)

    const handleAddStep = (type: StepType) => {
        onAddStep(type, addMenuIndex ?? steps.length)
        setShowAddMenu(false)
        setAddMenuIndex(null)
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">测试步骤</h3>
                <span className="text-sm text-slate-500">{steps.length} 个步骤</span>
            </div>

            {/* Steps List */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {steps.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-12 px-6 border-2 border-dashed border-white/10 rounded-xl"
                        >
                            <p className="text-slate-500 mb-4">暂无测试步骤</p>
                            <button
                                onClick={() => {
                                    setAddMenuIndex(0)
                                    setShowAddMenu(true)
                                }}
                                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                            >
                                + 添加第一个步骤
                            </button>
                        </motion.div>
                    ) : (
                        steps.map((step, index) => (
                            <div key={step.id} className="relative group">
                                {/* Add Button Between Steps */}
                                {index > 0 && (
                                    <button
                                        onClick={() => {
                                            setAddMenuIndex(index)
                                            setShowAddMenu(true)
                                        }}
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="在此处添加步骤"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                )}

                                <StepItem
                                    stepItem={step}
                                    index={index}
                                    isSelected={selectedStepId === step.id}
                                    onSelect={() => onSelectStep(step.id)}
                                    onToggleExpand={() => onToggleExpand(step.id)}
                                    onDelete={() => onDeleteStep(step.id)}
                                    onDuplicate={() => onDuplicateStep(step.id)}
                                    onToggleEnabled={() => {
                                        const currentEnabled = step.step.enabled !== false
                                        onUpdateStep(step.id, {
                                            step: {
                                                ...step.step,
                                                enabled: !currentEnabled
                                            }
                                        })
                                    }}
                                />
                            </div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Add Step Button at Bottom */}
            {steps.length > 0 && (
                <button
                    onClick={() => {
                        setAddMenuIndex(steps.length)
                        setShowAddMenu(true)
                    }}
                    className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    添加步骤
                </button>
            )}

            {/* Add Step Menu Modal */}
            <AnimatePresence>
                {showAddMenu && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            setShowAddMenu(false)
                            setAddMenuIndex(null)
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-4">选择步骤类型</h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.values(STEP_TYPE_INFO).map((stepInfo) => (
                                    <button
                                        key={stepInfo.type}
                                        onClick={() => handleAddStep(stepInfo.type)}
                                        className={cn(
                                            "p-4 rounded-xl border-2 transition-all hover:scale-105",
                                            "border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5"
                                        )}
                                    >
                                        <div className="text-3xl mb-2">{stepInfo.icon}</div>
                                        <div className="text-sm font-medium text-white">
                                            {stepInfo.label}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {stepInfo.description}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => {
                                        setShowAddMenu(false)
                                        setAddMenuIndex(null)
                                    }}
                                    className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
