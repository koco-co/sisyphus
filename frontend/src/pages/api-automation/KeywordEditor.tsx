import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Sparkles, Plus, Trash2, Loader2, Code, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keywordsApi, projectsApi } from '@/api/client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { MonacoEditor } from '@/components/ui/MonacoEditor'
import { useToast } from '@/components/ui/Toast'

interface KeywordVariable {
    name: string
    description: string
}

// 示例代码模板 - 与 KeywordManagement 保持一致
const codeTemplates: Record<string, string> = {
    request: `def send_request(url: str, method: str = "GET", headers: dict = None, body: dict = None) -> dict:
    """发送HTTP请求"""
    import requests

    response = requests.request(
        method=method,
        url=url,
        headers=headers or {},
        json=body
    )
    return {
        "status_code": response.status_code,
        "body": response.json() if response.text else None,
        "headers": dict(response.headers)
    }`,
    assert: `def assert_equals(actual, expected, message: str = "") -> bool:
    """断言两个值相等"""
    if actual != expected:
        raise AssertionError(f"{message}: 期望 {expected}, 实际 {actual}")
    return True`,
    extract: `# class名称必须与关键字名称一致
class extract_json:
    def __init__(self):
        pass

    def extract_json(self, EXVALUE, INDEX, VARNAME):
        """使用JsonPath表达式从JSON数据中提取指定路径的值

        Args:
            EXVALUE: 要提取的源数据（字典/列表/JSON字符串）
            INDEX: JsonPath表达式路径
            VARNAME: 提取后的变量名称

        Returns:
            提取到的值
        """
        from jsonpath_ng import parse
        import json

        # 处理输入数据
        if isinstance(EXVALUE, str):
            data = json.loads(EXVALUE)
        else:
            data = EXVALUE

        # 执行提取
        expr = parse(INDEX)
        matches = expr.find(data)

        if not matches:
            return None

        # 获取提取的值
        if len(matches) == 1:
            value = matches[0].value
        else:
            value = [m.value for m in matches]

        print(f"{VARNAME} = {value}")
        return value`,
    db: `def query_database(sql: str, params: tuple = None) -> list:
    """执行数据库查询"""
    # 注意: 需要配置数据源连接
    import pymysql

    connection = pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="test"
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchall()
    finally:
        connection.close()`,
    custom: `def custom_keyword(param1: str, param2: int = 0) -> dict:
    """自定义关键字"""
    # 在这里编写你的自定义逻辑
    result = {
        "input": param1,
        "processed": param1.upper(),
        "count": param2
    }
    return result`
}

export default function KeywordEditor() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id } = useParams()
    const isEditing = !!id
    const queryClient = useQueryClient()
    const { success, error: toastError } = useToast()

    // 折叠状态
    const [collapsedSections, setCollapsedSections] = useState<string[]>([])

    const toggleSection = (section: string) => {
        setCollapsedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        )
    }

    const [formData, setFormData] = useState({
        name: '',
        func_name: '',
        category: 'request',
        function_code: '',
        description: '',
        project_id: 1,
        input_params: [] as KeywordVariable[],
        output_params: [] as KeywordVariable[],
        language: 'python'
    })

    // 获取项目列表
    const { data: projectsData } = useQuery({
        queryKey: ['projects-select'],
        queryFn: () => projectsApi.list({ page: 1, size: 100 }),
        select: (data) => data.data?.items ?? []
    })

    // 如果是编辑模式，获取关键字详情
    useQuery({
        queryKey: ['keyword', id],
        queryFn: () => keywordsApi.get(Number(id)),
        enabled: isEditing,
        select: (res) => {
            const data = res.data
            setFormData({
                name: data.name,
                func_name: data.func_name,
                category: data.category,
                function_code: data.function_code,
                description: data.description || '',
                project_id: data.project_id,
                input_params: data.input_params || [],
                output_params: data.output_params || [],
                language: data.language || 'python'
            })
            return data
        }
    })

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (isEditing) {
                return keywordsApi.update(Number(id), data)
            }
            return keywordsApi.create(data)
        },
        onSuccess: () => {
            success(isEditing ? '更新成功' : '创建成功')
            queryClient.invalidateQueries({ queryKey: ['keywords'] })
            navigate('/api/keywords')
        },
        onError: (error: any) => {
            console.error('保存失败:', error)
            toastError(error?.response?.data?.detail || '保存失败，请检查输入')
        }
    })

    const handleSubmit = () => {
        // 表单验证
        if (!formData.name.trim()) {
            toastError('请输入关键字名称')
            return
        }
        if (!formData.func_name.trim()) {
            toastError('请输入方法名')
            return
        }
        if (!formData.function_code.trim()) {
            toastError('请输入函数代码')
            return
        }

        mutation.mutate(formData)
    }

    const generateExampleCode = () => {
        setFormData(prev => ({
            ...prev,
            function_code: codeTemplates[prev.category] || codeTemplates.custom
        }))
    }

    const categoryOptions = [
        { label: '发送请求', value: 'request' },
        { label: '断言', value: 'assert' },
        { label: '提取变量', value: 'extract' },
        { label: '数据库操作', value: 'db' },
        { label: '自定义操作', value: 'custom' },
    ]

    const projectOptions = (projectsData || []).map((p: any) => ({
        label: p.name,
        value: p.id
    }))

    return (
        <div className="min-h-[calc(100vh-64px)] p-6 md:p-8 max-w-[1920px] mx-auto space-y-8">
            {/* Header */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/api/keywords')}
                        className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            {isEditing ? '编辑关键字' : t('keywords.newKeyword')}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/api/keywords')}
                        className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        保存
                    </button>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Form */}
                <motion.div
                    className="lg:col-span-1 space-y-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {/* Basic Info Card */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-3xl backdrop-blur-xl overflow-hidden">
                        <button
                            onClick={() => toggleSection('basic')}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-slate-100 font-semibold">
                                <Code className="w-5 h-5 text-cyan-400" />
                                基本信息
                            </div>
                            {collapsedSections.includes('basic') ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
                        </button>

                        {!collapsedSections.includes('basic') && (
                            <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">关键字名称 *</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                                    placeholder="输入易于理解的名称"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">方法名 *</label>
                                <input
                                    value={formData.func_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, func_name: e.target.value }))}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                                    placeholder="例如：send_get_request"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">操作类型</label>
                                    <CustomSelect
                                        value={formData.category}
                                        onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                                        options={categoryOptions}
                                        placeholder="选择操作类型"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">所属项目</label>
                                    <CustomSelect
                                        value={formData.project_id}
                                        onChange={(val) => setFormData(prev => ({ ...prev, project_id: val }))}
                                        options={projectOptions}
                                        placeholder="选择所属项目"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">描述</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                                    placeholder="描述该关键字的功能和用途..."
                                />
                            </div>
                            </div>
                        )}
                    </div>

                    {/* Variables Card */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-3xl backdrop-blur-xl overflow-hidden">
                        <button
                            onClick={() => toggleSection('variables')}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center justify-between flex-1">
                                <div className="flex items-center gap-2 text-slate-100 font-semibold">
                                    <Code className="w-5 h-5 text-cyan-400" />
                                    变量定义
                                </div>
                                <span className="text-xs text-slate-500">{formData.input_params.length}/10</span>
                            </div>
                            {collapsedSections.includes('variables') ? <ChevronDown className="w-5 h-5 text-slate-400 ml-2" /> : <ChevronUp className="w-5 h-5 text-slate-400 ml-2" />}
                        </button>

                        {!collapsedSections.includes('variables') && (
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={() => {
                                            if (formData.input_params.length < 10) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    input_params: [...prev.input_params, { name: '', description: '' }]
                                                }))
                                            }
                                        }}
                                        disabled={formData.input_params.length >= 10}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-1 hover:bg-cyan-950/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus className="w-3 h-3" />
                                        添加变量
                                    </button>
                                </div>
                        <div className="space-y-3">
                            {formData.input_params.map((v, i) => (
                                <div key={i} className="flex gap-2 items-center group">
                                    <input
                                        value={v.name}
                                        onChange={(e) => {
                                            const newParams = [...formData.input_params]
                                            newParams[i].name = e.target.value
                                            setFormData(prev => ({ ...prev, input_params: newParams }))
                                        }}
                                        placeholder="变量名称"
                                        className="w-1/3 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                                    />
                                    <input
                                        value={v.description}
                                        onChange={(e) => {
                                            const newParams = [...formData.input_params]
                                            newParams[i].description = e.target.value
                                            setFormData(prev => ({ ...prev, input_params: newParams }))
                                        }}
                                        placeholder="描述"
                                        className="flex-1 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                    <button
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            input_params: prev.input_params.filter((_, idx) => idx !== i)
                                        }))}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {formData.input_params.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl text-slate-500 text-sm">
                                    暂无变量参数
                                </div>
                            )}
                        </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Right Column: Code Editor */}
                <motion.div
                    className="lg:col-span-2 flex flex-col"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex-1 bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/50">
                            <div className="w-28">
                                <CustomSelect
                                    value={formData.language}
                                    onChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                                    options={[
                                        { label: 'Python', value: 'python' }
                                    ]}
                                    placeholder="选择语言"
                                    size="sm"
                                />
                            </div>
                            <button
                                onClick={generateExampleCode}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 transition-all border border-violet-500/10 hover:border-violet-500/20"
                            >
                                <Sparkles className="w-3 h-3" />
                                生成示例代码
                            </button>
                        </div>
                        <div className="flex-1">
                            <MonacoEditor
                                value={formData.function_code}
                                onChange={(value) => setFormData(prev => ({ ...prev, function_code: value }))}
                                language={formData.language}
                                height="100%"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
