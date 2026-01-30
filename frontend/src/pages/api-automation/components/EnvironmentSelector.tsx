import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Plus, Edit2, Trash2, Check, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { projectsApi } from '@/api/client'

interface Environment {
    id: number
    name: string
    domain?: string
    variables?: Record<string, string>
    headers?: Record<string, string>
}

interface EnvironmentSelectorProps {
    projectId: number
    selectedEnvironmentId?: number | null
    onSelectEnvironment: (envId: number | null) => void
}

export function EnvironmentSelector({
    projectId,
    selectedEnvironmentId,
    onSelectEnvironment
}: EnvironmentSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Fetch environments
    const { data: environments, isLoading } = useQuery({
        queryKey: ['project-environments', projectId],
        queryFn: () => projectsApi.listEnvironments(projectId).then(res => res.data),
        enabled: !!projectId
    })

    const envList = environments || []
    const selectedEnv = envList.find(env => env.id === selectedEnvironmentId)

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all",
                    isOpen
                        ? "border-cyan-500/50 bg-cyan-500/5 text-white"
                        : "border-white/10 bg-slate-800/50 text-slate-400 hover:text-white hover:border-white/20"
                )}
            >
                <Globe className="w-4 h-4" />
                <span className="font-medium">
                    {selectedEnv ? selectedEnv.name : '默认环境'}
                </span>
                <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                        >
                            {/* Default Option */}
                            <button
                                onClick={() => {
                                    onSelectEnvironment(null)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors",
                                    !selectedEnvironmentId && "bg-cyan-500/10"
                                )}
                            >
                                <Globe className="w-4 h-4 text-slate-500" />
                                <div className="flex-1">
                                    <div className="font-medium text-white">默认环境</div>
                                    <div className="text-xs text-slate-500">使用全局配置</div>
                                </div>
                                {!selectedEnvironmentId && (
                                    <Check className="w-4 h-4 text-cyan-400" />
                                )}
                            </button>

                            {/* Environment List */}
                            {envList.map((env) => (
                                <button
                                    key={env.id}
                                    onClick={() => {
                                        onSelectEnvironment(env.id)
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors border-t border-white/5",
                                        selectedEnvironmentId === env.id && "bg-cyan-500/10"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm">
                                        {env.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{env.name}</div>
                                        {env.domain && (
                                            <div className="text-xs text-slate-500 truncate">{env.domain}</div>
                                        )}
                                    </div>
                                    {selectedEnvironmentId === env.id && (
                                        <Check className="w-4 h-4 text-cyan-400" />
                                    )}
                                </button>
                            ))}

                            {/* Add New Link */}
                            <button
                                onClick={() => {
                                    // Navigate to environment management page
                                    window.location.href = `/api/projects/${projectId}/settings`
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors border-t border-white/5 text-cyan-400"
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                <span className="font-medium">管理环境</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

// Environment Management Component
interface EnvironmentManagerProps {
    projectId: number
    environments: Environment[]
    onAdd: (env: Omit<Environment, 'id'>) => void
    onEdit: (id: number, env: Partial<Environment>) => void
    onDelete: (id: number) => void
}

export function EnvironmentManager({
    projectId,
    environments,
    onAdd,
    onEdit,
    onDelete
}: EnvironmentManagerProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
    const [formData, setFormData] = useState<Omit<Environment, 'id'>>({
        name: '',
        domain: '',
        variables: {},
        headers: {}
    })

    const handleOpenEdit = (env?: Environment) => {
        if (env) {
            setEditingEnv(env)
            setFormData({
                name: env.name,
                domain: env.domain || '',
                variables: env.variables || {},
                headers: env.headers || {}
            })
        } else {
            setEditingEnv(null)
            setFormData({
                name: '',
                domain: '',
                variables: {},
                headers: {}
            })
        }
        setIsEditing(true)
    }

    const handleCloseEdit = () => {
        setIsEditing(false)
        setEditingEnv(null)
        setFormData({
            name: '',
            domain: '',
            variables: {},
            headers: {}
        })
    }

    const handleSave = () => {
        if (editingEnv) {
            onEdit(editingEnv.id, formData)
        } else {
            onAdd(formData)
        }
        handleCloseEdit()
    }

    const handleAddVariable = () => {
        setFormData({
            ...formData,
            variables: {
                ...formData.variables,
                '': ''
            }
        })
    }

    const handleUpdateVariable = (index: number, key: string, value: string) => {
        const vars = formData.variables || {}
        const keys = Object.keys(vars)
        const oldKey = keys[index]

        const newVars = { ...vars }
        delete newVars[oldKey]
        newVars[key] = value

        setFormData({ ...formData, variables: newVars })
    }

    const handleDeleteVariable = (key: string) => {
        const vars = formData.variables || {}
        const newVars = { ...vars }
        delete newVars[key]
        setFormData({ ...formData, variables: newVars })
    }

    const handleAddHeader = () => {
        setFormData({
            ...formData,
            headers: {
                ...formData.headers,
                '': ''
            }
        })
    }

    const handleUpdateHeader = (index: number, key: string, value: string) => {
        const headers = formData.headers || {}
        const keys = Object.keys(headers)
        const oldKey = keys[index]

        const newHeaders = { ...headers }
        delete newHeaders[oldKey]
        newHeaders[key] = value

        setFormData({ ...formData, headers: newHeaders })
    }

    const handleDeleteHeader = (key: string) => {
        const headers = formData.headers || {}
        const newHeaders = { ...headers }
        delete newHeaders[key]
        setFormData({ ...formData, headers: newHeaders })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">环境管理</h3>
                <button
                    onClick={() => handleOpenEdit()}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    新建环境
                </button>
            </div>

            {/* Environment List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {environments.map((env) => (
                    <div
                        key={env.id}
                        className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold">
                                    {env.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-medium text-white">{env.name}</div>
                                    {env.domain && (
                                        <div className="text-xs text-slate-500 truncate">{env.domain}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleOpenEdit(env)}
                                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onDelete(env.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Variables & Headers Count */}
                        <div className="flex gap-4 text-xs text-slate-500">
                            <span>{Object.keys(env.variables || {}).length} 个变量</span>
                            <span>{Object.keys(env.headers || {}).length} 个请求头</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">
                                    {editingEnv ? '编辑环境' : '新建环境'}
                                </h3>
                                <button
                                    onClick={handleCloseEdit}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                <div className="space-y-6">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">
                                            环境名称
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. 开发环境"
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                        />
                                    </div>

                                    {/* Domain */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">
                                            域名（可选）
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.domain}
                                            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                            placeholder="e.g. https://dev-api.example.com"
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                        />
                                    </div>

                                    {/* Variables */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-slate-400">环境变量</label>
                                            <button
                                                onClick={handleAddVariable}
                                                className="text-cyan-400 hover:text-cyan-300 text-sm"
                                            >
                                                <Plus className="w-4 h-4 inline" /> 添加
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {Object.entries(formData.variables || {}).map(([key, value], index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={key}
                                                        onChange={(e) => handleUpdateVariable(index, e.target.value, value as string)}
                                                        placeholder="变量名"
                                                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={value as string}
                                                        onChange={(e) => handleUpdateVariable(index, key, e.target.value)}
                                                        placeholder="变量值"
                                                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                                    />
                                                    <button
                                                        onClick={() => handleDeleteVariable(key)}
                                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Headers */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-slate-400">全局请求头</label>
                                            <button
                                                onClick={handleAddHeader}
                                                className="text-cyan-400 hover:text-cyan-300 text-sm"
                                            >
                                                <Plus className="w-4 h-4 inline" /> 添加
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {Object.entries(formData.headers || {}).map(([key, value], index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={key}
                                                        onChange={(e) => handleUpdateHeader(index, e.target.value, value as string)}
                                                        placeholder="Header Name"
                                                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={value as string}
                                                        onChange={(e) => handleUpdateHeader(index, key, e.target.value)}
                                                        placeholder="Value"
                                                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                                    />
                                                    <button
                                                        onClick={() => handleDeleteHeader(key)}
                                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
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
