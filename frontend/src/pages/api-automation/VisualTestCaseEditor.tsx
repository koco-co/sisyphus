import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Save,
    Loader2,
    Code,
    Settings,
    FileText,
    Check,
    X,
    Eye,
    Edit3
} from 'lucide-react'
import { apiTestCasesApi } from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { StepItemData, StepType, TestCaseConfig } from './TestCaseEditor.types'
import { StepList } from './components/StepList'
import { StepConfigPanel } from './components/StepConfigPanel'
import { VariableManager, QuickVariableInput } from './components/VariableManager'
import { generateYAML } from './utils/yamlGenerator'

export default function VisualTestCaseEditor() {
    const navigate = useNavigate()
    const { projectId, testCaseId } = useParams<{ projectId: string; testCaseId: string }>()
    const queryClient = useQueryClient()
    const { success, error: showError } = useToast()

    const isEditMode = !!testCaseId && testCaseId !== 'new'

    // Editor state
    const [config, setConfig] = useState<TestCaseConfig>({
        name: '',
        config: {
            base_url: '',
            verify: false,
            timeout: 30,
            variables: {},
            headers: {}
        },
        steps: []
    })

    // Local state for UI controls
    const [showVariables, setShowVariables] = useState(true)

    const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
    const [showConfigPanel, setShowConfigPanel] = useState(false)
    const [viewMode, setViewMode] = useState<'visual' | 'yaml'>('visual')
    const [yamlContent, setYamlContent] = useState('')

    // Fetch existing test case
    const { data: existingCase, isLoading } = useQuery({
        queryKey: ['api-test-case', testCaseId],
        queryFn: () => {
            if (!testCaseId || testCaseId === 'new') throw new Error('Invalid test case ID')
            return apiTestCasesApi.get(Number(testCaseId)).then(res => res.data)
        },
        enabled: isEditMode
    })

    // Load existing data when fetched
    useEffect(() => {
        if (existingCase) {
            setConfig({
                name: existingCase.name || '',
                config: {
                    base_url: '',
                    verify: false,
                    timeout: 30
                },
                steps: []
            })
            setYamlContent(existingCase.yaml_content || '')
        }
    }, [existingCase])

    // Update YAML when config changes
    useEffect(() => {
        if (viewMode === 'visual') {
            const yaml = generateYAML(config)
            setYamlContent(yaml)
        }
    }, [config, viewMode])

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: () => {
            const yaml = viewMode === 'visual' ? generateYAML(config) : yamlContent

            const payload = {
                name: config.name,
                description: '从可视化编辑器创建',
                tags: [],
                enabled: true,
                config_data: config
            }

            if (isEditMode && testCaseId !== 'new') {
                return apiTestCasesApi.update(Number(testCaseId), payload)
            } else {
                if (!projectId) throw new Error('Project ID is required')
                return apiTestCasesApi.create(Number(projectId), payload)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-test-cases'] })
            success(isEditMode ? '更新成功' : '创建成功')
            navigate(`/api/projects/${projectId}/test-cases`)
        },
        onError: (err: any) => {
            if (err?.response?.data?.detail) {
                showError(err.response.data.detail)
            } else {
                showError(isEditMode ? '更新失败' : '创建失败')
            }
        }
    })

    // Step handlers
    const handleAddStep = (type: StepType, index?: number) => {
        const newStep: StepItemData = {
            id: `step-${Date.now()}`,
            type,
            step: {
                name: `${type} 步骤`,
                enabled: true
            },
            expanded: true
        }

        const insertIndex = index ?? config.steps.length
        const newSteps = [...config.steps]
        newSteps.splice(insertIndex, 0, newStep)

        setConfig({ ...config, steps: newSteps })
        setSelectedStepId(newStep.id)
        setShowConfigPanel(true)
    }

    const handleUpdateStep = (stepId: string, updates: Partial<StepItemData>) => {
        const newSteps = config.steps.map(step =>
            step.id === stepId ? { ...step, ...updates } : step
        )
        setConfig({ ...config, steps: newSteps })
    }

    const handleDeleteStep = (stepId: string) => {
        const newSteps = config.steps.filter(step => step.id !== stepId)
        setConfig({ ...config, steps: newSteps })
        if (selectedStepId === stepId) {
            setSelectedStepId(null)
            setShowConfigPanel(false)
        }
    }

    const handleDuplicateStep = (stepId: string) => {
        const stepToDuplicate = config.steps.find(step => step.id === stepId)
        if (!stepToDuplicate) return

        const duplicatedStep: StepItemData = {
            ...stepToDuplicate,
            id: `step-${Date.now()}`,
            step: { ...stepToDuplicate.step }
        }

        const index = config.steps.findIndex(step => step.id === stepId)
        const newSteps = [...config.steps]
        newSteps.splice(index + 1, 0, duplicatedStep)

        setConfig({ ...config, steps: newSteps })
    }

    const handleToggleExpand = (stepId: string) => {
        const newSteps = config.steps.map(step =>
            step.id === stepId ? { ...step, expanded: !step.expanded } : step
        )
        setConfig({ ...config, steps: newSteps })
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
            </div>
        )
    }

    const selectedStep = config.steps.find(step => step.id === selectedStepId)

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <motion.header
                className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-slate-900/95 backdrop-blur-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/api/projects/${projectId}/test-cases`)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FileText className="w-6 h-6 text-cyan-500" />
                            {isEditMode ? '编辑测试用例' : '新建测试用例'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('visual')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                viewMode === 'visual'
                                    ? "bg-cyan-500 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Edit3 className="w-4 h-4" />
                            可视化
                        </button>
                        <button
                            onClick={() => setViewMode('yaml')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                viewMode === 'yaml'
                                    ? "bg-cyan-500 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Code className="w-4 h-4" />
                            YAML
                        </button>
                    </div>

                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center gap-2 transition-all"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        保存
                    </button>
                </div>
            </motion.header>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {viewMode === 'visual' ? (
                    <>
                        {/* Main Editor Area */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left - Test Config and Steps */}
                            <div className={cn(
                                "flex-1 overflow-y-auto p-8 transition-all",
                                showConfigPanel ? "mr-96" : ""
                            )}>
                                {/* Test Case Name */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        测试用例名称
                                    </label>
                                    <input
                                        type="text"
                                        value={config.name}
                                        onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                        placeholder="输入测试用例名称"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                                    />
                                </div>

                                {/* Test Config */}
                                <div className="mb-8 bg-slate-800/50 border border-white/5 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Settings className="w-5 h-5 text-cyan-400" />
                                        <h3 className="text-lg font-semibold text-white">全局配置</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Base URL</label>
                                            <input
                                                type="text"
                                                value={config.config?.base_url || ''}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    config: { ...config.config!, base_url: e.target.value }
                                                })}
                                                placeholder="https://api.example.com"
                                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">超时（秒）</label>
                                            <input
                                                type="number"
                                                value={config.config?.timeout || 30}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    config: { ...config.config!, timeout: parseInt(e.target.value) || 30 }
                                                })}
                                                min={1}
                                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Variables Manager */}
                                <div className="mb-8">
                                    <VariableManager
                                        variables={config.config?.variables || {}}
                                        onChange={(vars) => setConfig({
                                            ...config,
                                            config: { ...config.config!, variables: vars }
                                        })}
                                        title="全局变量"
                                        description="在测试用例中可以引用这些变量，使用 ${variable_name} 语法"
                                    />
                                </div>

                                {/* Steps List */}
                                <StepList
                                    steps={config.steps}
                                    selectedStepId={selectedStepId}
                                    onSelectStep={(stepId) => {
                                        setSelectedStepId(stepId)
                                        setShowConfigPanel(true)
                                    }}
                                    onAddStep={handleAddStep}
                                    onUpdateStep={handleUpdateStep}
                                    onDeleteStep={handleDeleteStep}
                                    onDuplicateStep={handleDuplicateStep}
                                    onToggleExpand={handleToggleExpand}
                                    onReorderSteps={(from, to) => {
                                        const newSteps = [...config.steps]
                                        const [removed] = newSteps.splice(from, 1)
                                        newSteps.splice(to, 0, removed)
                                        setConfig({ ...config, steps: newSteps })
                                    }}
                                />
                            </div>

                            {/* Right - Step Config Panel */}
                            <AnimatePresence>
                                {showConfigPanel && selectedStep && (
                                    <StepConfigPanel
                                        stepItem={selectedStep}
                                        onUpdate={handleUpdateStep}
                                        onClose={() => {
                                            setShowConfigPanel(false)
                                            setSelectedStepId(null)
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    /* YAML Editor View */
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white">YAML 预览</h3>
                                    <span className="text-xs text-slate-500">
                                        当前为只读模式，切换到可视化模式进行编辑
                                    </span>
                                </div>
                                <pre className="bg-slate-800 border border-white/10 rounded-xl p-4 overflow-x-auto">
                                    <code className="text-sm text-slate-300 font-mono">
                                        {yamlContent || '// 暂无配置'}
                                    </code>
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
