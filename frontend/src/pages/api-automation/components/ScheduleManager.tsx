import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Calendar,
    Clock,
    Plus,
    Edit2,
    Trash2,
    Play,
    Pause,
    Check,
    X
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Schedule {
    id: string
    name: string
    cron_expression: string
    enabled: boolean
    last_run?: string
    next_run?: string
}

interface ScheduleManagerProps {
    schedules: Schedule[]
    onAdd: (schedule: Omit<Schedule, 'id'>) => void
    onEdit: (id: string, schedule: Partial<Schedule>) => void
    onDelete: (id: string) => void
    onToggle: (id: string) => void
}

export function ScheduleManager({
    schedules,
    onAdd,
    onEdit,
    onDelete,
    onToggle
}: ScheduleManagerProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        cron_expression: '0 0 * * *',  // Daily at midnight
        enabled: true
    })

    // Common cron presets
    const cronPresets = [
        { label: '每小时', expression: '0 * * * *' },
        { label: '每天 00:00', expression: '0 0 * * *' },
        { label: '每天 09:00', expression: '0 9 * * *' },
        { label: '每周一 09:00', expression: '0 9 * * 1' },
        { label: '每月 1 号 00:00', expression: '0 0 1 * *' },
        { label: '每 5 分钟', expression: '*/5 * * * *' },
        { label: '每 30 分钟', expression: '*/30 * * * *' }
    ]

    const handleOpenEdit = (schedule?: Schedule) => {
        if (schedule) {
            setEditingSchedule(schedule)
            setFormData({
                name: schedule.name,
                cron_expression: schedule.cron_expression,
                enabled: schedule.enabled
            })
        } else {
            setEditingSchedule(null)
            setFormData({
                name: '',
                cron_expression: '0 0 * * *',
                enabled: true
            })
        }
        setIsEditing(true)
    }

    const handleCloseEdit = () => {
        setIsEditing(false)
        setEditingSchedule(null)
    }

    const handleSave = () => {
        if (editingSchedule) {
            onEdit(editingSchedule.id, formData)
        } else {
            onAdd({
                ...formData,
                id: `schedule-${Date.now()}`
            })
        }
        handleCloseEdit()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold text-white">定时执行</h3>
                </div>
                <button
                    onClick={() => handleOpenEdit()}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    新建定时任务
                </button>
            </div>

            {/* Schedule List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {schedules.map((schedule) => (
                        <motion.div
                            key={schedule.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className={cn(
                                "bg-slate-800/50 border rounded-xl p-4 transition-all",
                                schedule.enabled
                                    ? "border-white/10"
                                    : "border-white/5 opacity-60"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                {/* Toggle */}
                                <button
                                    onClick={() => onToggle(schedule.id)}
                                    className={cn(
                                        "relative w-12 h-6 rounded-full transition-colors",
                                        schedule.enabled ? "bg-cyan-500" : "bg-slate-700"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                            schedule.enabled ? "left-7" : "left-1"
                                        )}
                                    />
                                </button>

                                {/* Info */}
                                <div className="flex-1">
                                    <div className="font-medium text-white">{schedule.name}</div>
                                    <div className="text-sm text-slate-500 font-mono mt-1">
                                        {schedule.cron_expression}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                        {schedule.last_run && (
                                            <span>上次运行: {new Date(schedule.last_run).toLocaleString('zh-CN')}</span>
                                        )}
                                        {schedule.next_run && (
                                            <span>下次运行: {new Date(schedule.next_run).toLocaleString('zh-CN')}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(schedule)}
                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(schedule.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {schedules.length === 0 && (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-white/10 rounded-xl">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p className="mb-3">暂无定时任务</p>
                        <button
                            onClick={() => handleOpenEdit()}
                            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                        >
                            创建第一个定时任务
                        </button>
                    </div>
                )}
            </div>

            {/* Edit/Add Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={handleCloseEdit}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6"
                        >
                            <h3 className="text-xl font-bold text-white mb-6">
                                {editingSchedule ? '编辑定时任务' : '新建定时任务'}
                            </h3>

                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        任务名称
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. 每日回归测试"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                {/* Cron Expression */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Cron 表达式
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cron_expression}
                                        onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                                        placeholder="0 0 * * *"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                {/* Quick Presets */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        快捷选择
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {cronPresets.map((preset) => (
                                            <button
                                                key={preset.expression}
                                                onClick={() => setFormData({ ...formData, cron_expression: preset.expression })}
                                                className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all text-left"
                                            >
                                                {preset.label}
                                                <div className="text-xs text-slate-600 font-mono mt-1">
                                                    {preset.expression}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Enabled */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-400">启用状态</label>
                                    <button
                                        onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                                        className={cn(
                                            "relative w-12 h-6 rounded-full transition-colors",
                                            formData.enabled ? "bg-cyan-500" : "bg-slate-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                                formData.enabled ? "left-7" : "left-1"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={handleCloseEdit}
                                    className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!formData.name}
                                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                                >
                                    保存
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
