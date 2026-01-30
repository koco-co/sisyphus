import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepItemData, StepType, HttpMethod } from '../TestCaseEditor.types'

interface StepConfigPanelProps {
    stepItem: StepItemData | null
    onUpdate: (stepId: string, updates: Partial<StepItemData>) => void
    onClose: () => void
}

export function StepConfigPanel({ stepItem, onUpdate, onClose }: StepConfigPanelProps) {
    const [localStep, setLocalStep] = useState(stepItem)

    useEffect(() => {
        setLocalStep(stepItem)
    }, [stepItem])

    if (!stepItem) return null

    const handleUpdate = (field: string, value: any) => {
        const updated = {
            ...localStep!,
            step: {
                ...localStep!.step,
                [field]: value
            }
        }
        setLocalStep(updated)
        onUpdate(stepItem.id, updated)
    }

    const handleNestedUpdate = (parentField: string, field: string, value: any) => {
        const updated = {
            ...localStep!,
            step: {
                ...localStep!.step,
                [parentField]: {
                    ...localStep!.step[parentField],
                    [field]: value
                }
            }
        }
        setLocalStep(updated)
        onUpdate(stepItem.id, updated)
    }

    return (
        <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-96 bg-slate-900 border-l border-white/5 h-full overflow-y-auto"
        >
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-white">步骤配置</h2>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Config Content */}
            <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        步骤名称
                    </label>
                    <input
                        type="text"
                        value={localStep.step.name || ''}
                        onChange={(e) => handleUpdate('name', e.target.value)}
                        placeholder="输入步骤名称"
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                    />
                </div>

                {/* Type-Specific Config */}
                {localStep.type === StepType.REQUEST && (
                    <RequestStepConfig step={localStep.step} onUpdate={handleNestedUpdate} />
                )}

                {localStep.type === StepType.WAIT && (
                    <WaitStepConfig step={localStep.step} onUpdate={handleNestedUpdate} />
                )}

                {localStep.type === StepType.DATABASE && (
                    <DatabaseStepConfig step={localStep.step} onUpdate={handleNestedUpdate} />
                )}

                {localStep.type === StepType.LOOP && (
                    <LoopStepConfig step={localStep.step} onUpdate={handleNestedUpdate} />
                )}

                {localStep.type === StepType.SCRIPT && (
                    <ScriptStepConfig step={localStep.step} onUpdate={handleNestedUpdate} />
                )}
            </div>
        </motion.div>
    )
}

// Request Step Config
function RequestStepConfig({ step, onUpdate }: { step: any; onUpdate: (p: string, f: string, v: any) => void }) {
    const [showAdvanced, setShowAdvanced] = useState(false)
    const request = step.request || {}

    return (
        <div className="space-y-4">
            {/* URL and Method */}
            <div className="flex gap-2">
                <select
                    value={request.method || 'GET'}
                    onChange={(e) => onUpdate('request', 'method', e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                >
                    {Object.values(HttpMethod).map(method => (
                        <option key={method} value={method}>{method}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={request.url || ''}
                    onChange={(e) => onUpdate('request', 'url', e.target.value)}
                    placeholder="/api/path"
                    className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                />
            </div>

            {/* Headers */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-400">请求头</label>
                    <button
                        onClick={() => {
                            const headers = request.headers || {}
                            onUpdate('request', 'headers', { ...headers, '': '' })
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                        <Plus className="w-4 h-4 inline" /> 添加
                    </button>
                </div>
                <div className="space-y-2">
                    {request.headers && Object.entries(request.headers).map(([key, value], index) => (
                        <div key={index} className="flex gap-2">
                            <input
                                type="text"
                                value={key}
                                onChange={(e) => {
                                    const newHeaders = { ...request.headers }
                                    delete newHeaders[key]
                                    newHeaders[e.target.value] = value
                                    onUpdate('request', 'headers', newHeaders)
                                }}
                                placeholder="Header Name"
                                className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                            />
                            <input
                                type="text"
                                value={value as string}
                                onChange={(e) => {
                                    onUpdate('request', 'headers', { ...request.headers, [key]: e.target.value })
                                }}
                                placeholder="Value"
                                className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                            />
                            <button
                                onClick={() => {
                                    const newHeaders = { ...request.headers }
                                    delete newHeaders[key]
                                    onUpdate('request', 'headers', newHeaders)
                                }}
                                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Advanced Toggle */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                高级选项
            </button>

            {showAdvanced && (
                <div className="space-y-4 pt-2">
                    {/* Body */}
                    <div>
                        <label className="text-sm font-medium text-slate-400 mb-2 block">请求体 (JSON)</label>
                        <textarea
                            value={typeof request.body === 'object' ? JSON.stringify(request.body, null, 2) : request.body || ''}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value)
                                    onUpdate('request', 'body', parsed)
                                } catch {
                                    onUpdate('request', 'body', e.target.value)
                                }
                            }}
                            placeholder='{"key": "value"}'
                            rows={4}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 resize-none"
                        />
                    </div>

                    {/* Assertions */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-400">断言</label>
                            <button
                                onClick={() => {
                                    const validate = step.validate || []
                                    onUpdate('validate', '', [...validate, { type: 'eq', value: ['status_code', 200] }])
                                }}
                                className="text-cyan-400 hover:text-cyan-300 text-sm"
                            >
                                <Plus className="w-4 h-4 inline" /> 添加
                            </button>
                        </div>
                        <div className="space-y-2">
                            {step.validate && step.validate.map((assertion: any, index: number) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <select
                                        value={assertion.type}
                                        onChange={(e) => {
                                            const newValidate = [...step.validate]
                                            newValidate[index] = { ...assertion, type: e.target.value }
                                            onUpdate('validate', '', newValidate)
                                        }}
                                        className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                                    >
                                        <option value="eq">等于</option>
                                        <option value="lt">小于</option>
                                        <option value="le">小于等于</option>
                                        <option value="gt">大于</option>
                                        <option value="ge">大于等于</option>
                                        <option value="contains">包含</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={Array.isArray(assertion.value) ? assertion.value.join(', ') : assertion.value}
                                        onChange={(e) => {
                                            const parts = e.target.value.split(',').map(s => s.trim())
                                            const newValidate = [...step.validate]
                                            newValidate[index] = { ...assertion, value: parts }
                                            onUpdate('validate', '', newValidate)
                                        }}
                                        placeholder="status_code, 200"
                                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                                    />
                                    <button
                                        onClick={() => {
                                            const newValidate = step.validate.filter((_: any, i: number) => i !== index)
                                            onUpdate('validate', '', newValidate)
                                        }}
                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Wait Step Config
function WaitStepConfig({ step, onUpdate }: { step: any; onUpdate: (p: string, f: string, v: any) => void }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">等待时长（秒）</label>
            <input
                type="number"
                value={step.wait?.seconds || 1}
                onChange={(e) => onUpdate('wait', 'seconds', parseInt(e.target.value) || 1)}
                min={0}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
            />
        </div>
    )
}

// Database Step Config
function DatabaseStepConfig({ step, onUpdate }: { step: any; onUpdate: (p: string, f: string, v: any) => void }) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">数据库类型</label>
                <select
                    value={step.database?.type || 'mysql'}
                    onChange={(e) => onUpdate('database', 'type', e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                >
                    <option value="mysql">MySQL</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mongodb">MongoDB</option>
                    <option value="redis">Redis</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">SQL 查询</label>
                <textarea
                    value={step.database?.query || ''}
                    onChange={(e) => onUpdate('database', 'query', e.target.value)}
                    placeholder="SELECT * FROM users WHERE id = 1"
                    rows={4}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 resize-none"
                />
            </div>
        </div>
    )
}

// Loop Step Config
function LoopStepConfig({ step, onUpdate }: { step: any; onUpdate: (p: string, f: string, v: any) => void }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">循环次数</label>
            <input
                type="number"
                value={step.loop?.times || 1}
                onChange={(e) => onUpdate('loop', 'times', parseInt(e.target.value) || 1)}
                min={1}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
            />
            <p className="text-xs text-slate-500 mt-2">循环步骤配置将在后续版本支持</p>
        </div>
    )
}

// Script Step Config
function ScriptStepConfig({ step, onUpdate }: { step: any; onUpdate: (p: string, f: string, v: any) => void }) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">脚本语言</label>
                <select
                    value={step.script?.language || 'python'}
                    onChange={(e) => onUpdate('script', 'language', e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">脚本代码</label>
                <textarea
                    value={step.script?.code || ''}
                    onChange={(e) => onUpdate('script', 'code', e.target.value)}
                    placeholder="# Your Python code here"
                    rows={10}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 resize-none"
                />
            </div>
        </div>
    )
}
