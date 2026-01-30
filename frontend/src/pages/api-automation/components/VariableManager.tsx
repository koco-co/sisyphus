import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Variable {
    key: string
    value: string
    description?: string
    secret?: boolean
}

interface VariableManagerProps {
    variables: Record<string, string | Variable>
    onChange: (variables: Record<string, string | Variable>) => void
    title?: string
    description?: string
    readOnly?: boolean
}

export function VariableManager({
    variables,
    onChange,
    title = "变量管理",
    description = "管理测试用例中使用的变量",
    readOnly = false
}: VariableManagerProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [editingKey, setEditingKey] = useState<string | null>(null)
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

    // Normalize variables to Variable objects
    const normalizedVars: Record<string, Variable> = {}
    for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'string') {
            normalizedVars[key] = { key, value }
        } else {
            normalizedVars[key] = value
        }
    }

    const handleAdd = () => {
        const newKey = `var_${Object.keys(normalizedVars).length + 1}`
        onChange({
            ...variables,
            [newKey]: { key: newKey, value: '', description: '', secret: false }
        })
        setEditingKey(newKey)
    }

    const handleUpdate = (oldKey: string, newKey: string, updates: Partial<Variable>) => {
        const newVars = { ...variables }

        // Remove old key
        delete newVars[oldKey]

        // Add with new key
        newVars[newKey] = {
            ...normalizedVars[oldKey],
            ...updates,
            key: newKey
        }

        onChange(newVars)
    }

    const handleDelete = (key: string) => {
        const newVars = { ...variables }
        delete newVars[key]
        onChange(newVars)
        if (editingKey === key) {
            setEditingKey(null)
        }
    }

    const handleToggleSecret = (key: string) => {
        const variable = normalizedVars[key]
        if (variable) {
            handleUpdate(key, key, { secret: !variable.secret })
        }
    }

    return (
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    </motion.div>
                    <div className="text-left">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        {description && (
                            <p className="text-sm text-slate-500">{description}</p>
                        )}
                    </div>
                </div>
                <span className="text-sm text-slate-500">
                    {Object.keys(variables).length} 个变量
                </span>
            </button>

            {/* Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-3">
                            {Object.keys(variables).length === 0 ? (
                                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-white/10 rounded-xl">
                                    <p className="mb-3">暂无变量</p>
                                    {!readOnly && (
                                        <button
                                            onClick={handleAdd}
                                            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                                        >
                                            + 添加第一个变量
                                        </button>
                                    )}
                                </div>
                            ) : (
                                Object.entries(normalizedVars).map(([key, variable]) => {
                                    const isEditing = editingKey === key
                                    const isSecret = variable.secret
                                    const showValue = showSecrets[key] || !isSecret

                                    return (
                                        <div
                                            key={key}
                                            className={cn(
                                                "bg-slate-900/50 border rounded-xl p-4 transition-all",
                                                isEditing
                                                    ? "border-cyan-500/50"
                                                    : "border-white/5"
                                            )}
                                        >
                                            {isEditing ? (
                                                // Edit Mode
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs text-slate-500 mb-1">变量名</label>
                                                            <input
                                                                type="text"
                                                                value={variable.key}
                                                                onChange={(e) => handleUpdate(key, e.target.value, {})}
                                                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <button
                                                                onClick={() => handleToggleSecret(key)}
                                                                className={cn(
                                                                    "px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                                                                    isSecret
                                                                        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                                                        : "bg-slate-700 text-slate-400 hover:text-white"
                                                                )}
                                                            >
                                                                {isSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                {isSecret ? '敏感' : '普通'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">变量值</label>
                                                        <input
                                                            type={isSecret && !showSecrets[key] ? 'password' : 'text'}
                                                            value={variable.value}
                                                            onChange={(e) => handleUpdate(key, key, { value: e.target.value })}
                                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">描述（可选）</label>
                                                        <input
                                                            type="text"
                                                            value={variable.description || ''}
                                                            onChange={(e) => handleUpdate(key, key, { description: e.target.value })}
                                                            placeholder="描述此变量的用途"
                                                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                                        />
                                                    </div>

                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingKey(null)}
                                                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                                                        >
                                                            完成
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View Mode
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono text-sm font-medium text-cyan-400">
                                                                {variable.key}
                                                            </span>
                                                            {variable.secret && (
                                                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs">
                                                                    敏感
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-sm text-slate-400 font-mono truncate",
                                                                variable.secret && !showSecrets[key] && "blur-sm select-none"
                                                            )}>
                                                                {variable.value}
                                                            </span>
                                                            {variable.secret && (
                                                                <button
                                                                    onClick={() => setShowSecrets({
                                                                        ...showSecrets,
                                                                        [key]: !showSecrets[key]
                                                                    })}
                                                                    className="p-1 text-slate-500 hover:text-white transition-colors"
                                                                >
                                                                    {showSecrets[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {variable.description && (
                                                            <p className="text-xs text-slate-500 mt-1">{variable.description}</p>
                                                        )}
                                                    </div>

                                                    {!readOnly && (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => setEditingKey(key)}
                                                                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(key)}
                                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}

                            {/* Add Button */}
                            {!readOnly && (
                                <button
                                    onClick={handleAdd}
                                    className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    添加变量
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Quick Variable Input Component
interface QuickVariableInputProps {
    variables: Record<string, string>
    onChange: (variables: Record<string, string>) => void
    placeholder?: string
}

export function QuickVariableInput({
    variables,
    onChange,
    placeholder = "输入变量名和值，格式：key=value"
}: QuickVariableInputProps) {
    const [input, setInput] = useState('')

    const handleAdd = () => {
        const match = input.match(/^(\w+)\s*=\s*(.+)$/)
        if (match) {
            const [, key, value] = match
            onChange({ ...variables, [key]: value })
            setInput('')
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAdd()
        }
    }

    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
            />
            <button
                onClick={handleAdd}
                disabled={!input.includes('=')}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
                添加
            </button>
        </div>
    )
}
