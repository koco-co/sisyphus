import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Save,
    Loader2,
    Code,
    Settings,
    Tag as TagIcon,
    FileText,
    Check,
    X
} from 'lucide-react'
import { apiTestCasesApi } from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface ApiTestCase {
    id?: number
    project_id: number
    name: string
    description?: string
    tags?: string[]
    enabled?: boolean
    yaml_content?: string
    config_data?: Record<string, any>
    created_at?: string
    updated_at?: string
}

interface ValidationResult {
    valid: boolean
    errors?: string[]
}

export default function ApiTestCaseEditor() {
    const navigate = useNavigate()
    const { projectId, testCaseId } = useParams<{ projectId: string; testCaseId: string }>()
    const queryClient = useQueryClient()
    const { success, error: showError } = useToast()

    const isEditMode = !!testCaseId && testCaseId !== 'new'

    // Form state
    const [formData, setFormData] = useState<Partial<ApiTestCase>>({
        name: '',
        description: '',
        tags: [],
        enabled: true,
        yaml_content: `# API 测试用例配置
name: 测试用例名称
config:
  base_url: https://api.example.com
  verify: false
  timeout: 30

steps:
  - name: 发送 GET 请求
    request:
      url: /api/users
      method: GET
      headers:
        Accept: application/json
    validate:
      - eq: [status_code, 200]
`
    })

    const [tagInput, setTagInput] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isValidating, setIsValidating] = useState(false)
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

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
            setFormData({
                name: existingCase.name || '',
                description: existingCase.description || '',
                tags: existingCase.tags || [],
                enabled: existingCase.enabled ?? true,
                yaml_content: existingCase.yaml_content || ''
            })
        }
    }, [existingCase])

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: (data: ApiTestCase) => {
            const payload = {
                name: data.name,
                description: data.description,
                tags: data.tags,
                enabled: data.enabled ?? true,
                config_data: data.config_data || {}
            }

            if (isEditMode && data.id) {
                return apiTestCasesApi.update(data.id, payload)
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

    // Validate YAML
    const validateMutation = useMutation({
        mutationFn: (yamlContent: string) => {
            return apiTestCasesApi.validateYaml(yamlContent).then(res => res.data)
        },
        onSuccess: (result) => {
            setValidationResult(result)
            setIsValidating(false)
            if (result.valid) {
                success('YAML 格式验证通过')
            }
        },
        onError: () => {
            setValidationResult({ valid: false, errors: ['YAML 格式验证失败'] })
            setIsValidating(false)
        }
    })

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.name?.trim()) {
            newErrors.name = '用例名称不能为空'
        } else if (formData.name.length > 100) {
            newErrors.name = '用例名称不能超过100个字符'
        }

        if (formData.description && formData.description.length > 500) {
            newErrors.description = '描述不能超过500个字符'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Handle save
    const handleSave = () => {
        if (!validateForm()) return

        saveMutation.mutate({
            ...formData,
            id: isEditMode ? Number(testCaseId) : undefined,
            project_id: Number(projectId),
            config_data: {} // Will be parsed from YAML by backend
        } as ApiTestCase)
    }

    // Handle validate YAML
    const handleValidateYaml = () => {
        if (!formData.yaml_content) {
            showError('请输入 YAML 内容')
            return
        }
        setIsValidating(true)
        validateMutation.mutate(formData.yaml_content)
    }

    // Add tag
    const handleAddTag = () => {
        const tag = tagInput.trim()
        if (tag && !formData.tags?.includes(tag)) {
            setFormData({
                ...formData,
                tags: [...(formData.tags || []), tag]
            })
            setTagInput('')
        }
    }

    // Remove tag
    const handleRemoveTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags?.filter(t => t !== tag)
        })
    }

    // Handle tag input key press
    const handleTagKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddTag()
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <motion.header
                className="flex items-center justify-between mb-8"
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
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <FileText className="w-8 h-8 text-cyan-500" />
                            {isEditMode ? '编辑测试用例' : '新建测试用例'}
                        </h1>
                        <p className="text-slate-400 mt-1">
                            配置 API 自动化测试用例的 YAML 配置
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleValidateYaml}
                        disabled={isValidating || !formData.yaml_content}
                        className="px-6 py-3 border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isValidating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Code className="w-4 h-4" />
                        )}
                        验证 YAML
                    </button>
                    <button
                        onClick={handleSave}
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

            {/* Validation Result */}
            {validationResult && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "mb-6 p-4 rounded-xl border flex items-center gap-3",
                        validationResult.valid
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}
                >
                    {validationResult.valid ? (
                        <Check className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <X className="w-5 h-5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                        {validationResult.valid ? (
                            <p className="font-medium">YAML 格式验证通过</p>
                        ) : (
                            <div>
                                <p className="font-medium mb-1">YAML 格式验证失败</p>
                                {validationResult.errors && validationResult.errors.length > 0 && (
                                    <ul className="text-sm space-y-1">
                                        {validationResult.errors.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Basic Info */}
                <motion.div
                    className="lg:col-span-1 space-y-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {/* Basic Info */}
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-lg font-semibold text-white">基本信息</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2 font-medium">
                                    用例名称 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="输入测试用例名称"
                                    className={cn(
                                        "w-full bg-slate-800 border rounded-xl px-4 py-3 text-white focus:outline-none placeholder:text-slate-600 transition-colors",
                                        errors.name
                                            ? "border-red-500/50 focus:border-red-500/50"
                                            : "border-white/10 focus:border-cyan-500/50"
                                    )}
                                />
                                {errors.name && (
                                    <p className="text-red-400 text-xs mt-1.5">{errors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2 font-medium">
                                    描述
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="输入测试用例描述"
                                    rows={3}
                                    className={cn(
                                        "w-full bg-slate-800 border rounded-xl px-4 py-3 text-white resize-none focus:outline-none placeholder:text-slate-600 transition-colors",
                                        errors.description
                                            ? "border-red-500/50 focus:border-red-500/50"
                                            : "border-white/10 focus:border-cyan-500/50"
                                    )}
                                />
                                {errors.description && (
                                    <p className="text-red-400 text-xs mt-1.5">{errors.description}</p>
                                )}
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <TagIcon className="w-4 h-4" />
                                        标签
                                    </div>
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={handleTagKeyPress}
                                        placeholder="输入标签名"
                                        className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors text-sm"
                                    />
                                    <button
                                        onClick={handleAddTag}
                                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-medium transition-colors"
                                    >
                                        添加
                                    </button>
                                </div>
                                {formData.tags && formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-sm border border-purple-500/20"
                                            >
                                                <TagIcon className="w-3 h-3" />
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Enabled Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-slate-400 text-sm font-medium">启用状态</label>
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
                    </div>

                    {/* Help Info */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-3">配置说明</h3>
                        <ul className="space-y-2 text-xs text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 mt-0.5">•</span>
                                <span>使用 YAML 格式配置测试步骤</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 mt-0.5">•</span>
                                <span>支持 HTTP 请求、数据库操作等</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 mt-0.5">•</span>
                                <span>可配置断言和变量提取</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-cyan-400 mt-0.5">•</span>
                                <span>点击"验证 YAML"检查格式</span>
                            </li>
                        </ul>
                    </div>
                </motion.div>

                {/* Right Column - YAML Editor */}
                <motion.div
                    className="lg:col-span-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Code className="w-5 h-5 text-cyan-400" />
                                <h2 className="text-lg font-semibold text-white">YAML 配置</h2>
                            </div>
                            <span className="text-xs text-slate-500">支持 API Engine YAML 格式</span>
                        </div>

                        <textarea
                            value={formData.yaml_content || ''}
                            onChange={(e) => setFormData({ ...formData, yaml_content: e.target.value })}
                            className="w-full h-[600px] bg-slate-800 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                            placeholder="输入测试用例 YAML 配置..."
                            spellCheck={false}
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
