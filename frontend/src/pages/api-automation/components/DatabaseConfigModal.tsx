
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Database, Wifi, Save, Check, Eye, EyeOff } from 'lucide-react'
import { projectsApi } from '@/api/client'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'

interface DatabaseConfigModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: number
    projectName: string
    editData?: any // Data source to edit
}

export function DatabaseConfigModal({ isOpen, onClose, projectId, projectName, editData }: DatabaseConfigModalProps) {
    const queryClient = useQueryClient()
    const { success, error } = useToast()
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
    const [isTesting, setIsTesting] = useState(false)
    const [hasTestedSuccess, setHasTestedSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Form State
    const [form, setForm] = useState({
        name: '',
        db_type: 'mysql',
        host: 'localhost',
        port: 3306,
        db_name: '',
        username: '',
        password: '',
        variable_name: ''
    })

    useEffect(() => {
        if (editData) {
            setForm({
                name: editData.name,
                db_type: editData.db_type,
                host: editData.host,
                port: editData.port,
                db_name: editData.db_name || '',
                username: editData.username || '',
                password: '', // Don't fill password
                variable_name: editData.variable_name || ''
            })
            // If editing, assume connected if status is valid? User choice. Strict req says test before save.
            // But if updating only name, do we force test?
            // User req: "需要测试连接成功才能保存" (Need test success to save).
            setHasTestedSuccess(false) // Force re-test on edit
        } else {
            setForm({
                name: '',
                db_type: 'mysql',
                host: 'localhost',
                port: 3306,
                db_name: '',
                username: '',
                password: '',
                variable_name: ''
            })
            setHasTestedSuccess(false)
        }
        setTestResult(null)
    }, [editData, isOpen])

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => projectsApi.createDataSource(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] })
            success('添加成功')
            // 立即刷新查询
            queryClient.refetchQueries({ queryKey: ['datasources', projectId] })
            onClose()
        },
        onError: () => error('添加数据源失败')
    })

    const updateMutation = useMutation({
        mutationFn: (data: any) => projectsApi.updateDataSource(projectId, editData.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] })
            success('编辑成功')
            // 立即刷新查询
            queryClient.refetchQueries({ queryKey: ['datasources', projectId] })
            onClose()
        },
        onError: () => error('更新数据源失败')
    })

    const handleTest = async () => {
        if (!form.host || !form.port) {
            error('请输入主机地址和端口')
            return
        }

        // 提示用户：如果要测试数据库连接，需要提供用户名和密码
        if (!form.username || !form.password) {
            error('请输入用户名和密码以测试数据库连接')
            return
        }

        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await projectsApi.testDataSource(form)
            setTestResult(res.data)
            if (res.data.success) {
                success('连接成功')
                setHasTestedSuccess(true)
            } else {
                error(res.data.message)
                setHasTestedSuccess(false)
            }
        } catch (e) {
            error('测试请求失败')
            setHasTestedSuccess(false)
        } finally {
            setIsTesting(false)
        }
    }

    const handleSubmit = () => {
        if (!form.name || !form.db_type || !form.host || !form.port || !form.username || !form.password || !form.db_name || !form.variable_name) {
            error('请填写所有必填项')
            return
        }

        if (!hasTestedSuccess) {
            error('请先进行连接测试并确保通过')
            return
        }

        if (editData) {
            updateMutation.mutate(form)
        } else {
            createMutation.mutate(form)
        }
    }

    const dbTypes = [
        { value: 'mysql', label: 'MySQL', port: 3306 },
        { value: 'postgresql', label: 'PostgreSQL', port: 5432 },
        { value: 'oracle', label: 'Oracle', port: 1521 }
    ]

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Database className="w-5 h-5 text-cyan-500" />
                                    {editData ? '编辑数据源' : '新增数据源'}
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    所属项目: <span className="text-cyan-400">{projectName}</span>
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs text-slate-400 mb-1.5 block">连接名称 *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => { setForm({ ...form, name: e.target.value }); setHasTestedSuccess(false); }}
                                        placeholder="请输入数据库连接名称"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="text-xs text-slate-400 mb-1.5 block">引用变量 *</label>
                                    <input
                                        type="text"
                                        value={form.variable_name}
                                        onChange={e => { setForm({ ...form, variable_name: e.target.value }); setHasTestedSuccess(false); }}
                                        placeholder="如：DB_PROD（用于环境引用）"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">类型 *</label>
                                    <CustomSelect
                                        value={form.db_type}
                                        onChange={val => {
                                            const type = val
                                            const defaultPort = dbTypes.find(t => t.value === type)?.port || 3306
                                            setForm({ ...form, db_type: type, port: defaultPort });
                                            setHasTestedSuccess(false);
                                        }}
                                        options={dbTypes}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">端口 *</label>
                                    <input
                                        type="text"
                                        value={form.port}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setForm({ ...form, port: val ? parseInt(val) : 0 });
                                            setHasTestedSuccess(false);
                                        }}
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="text-xs text-slate-400 mb-1.5 block">主机地址 *</label>
                                    <input
                                        type="text"
                                        value={form.host}
                                        onChange={e => { setForm({ ...form, host: e.target.value }); setHasTestedSuccess(false); }}
                                        placeholder="请输入主机地址，如 127.0.0.1"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">数据库名称 *</label>
                                    <input
                                        type="text"
                                        value={form.db_name}
                                        onChange={e => { setForm({ ...form, db_name: e.target.value }); setHasTestedSuccess(false); }}
                                        placeholder="请输入数据库名"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1.5 block">用户名 *</label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={e => { setForm({ ...form, username: e.target.value }); setHasTestedSuccess(false); }}
                                        placeholder="请输入用户名"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="text-xs text-slate-400 mb-1.5 block">密码 *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={form.password}
                                            onChange={e => { setForm({ ...form, password: e.target.value }); setHasTestedSuccess(false); }}
                                            placeholder={editData ? "如果不修改密码请留空" : "请输入密码（测试连接必需）"}
                                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Test Result Display */}
                            {testResult && (
                                <div className={`p-3 rounded-lg text-xs ${testResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} flex items-center gap-2`}>
                                    {testResult.success ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 text-red-400" />}
                                    {testResult.message}
                                </div>
                            )}
                        </div>

                        <div className="p-6 pt-0 flex gap-4">
                            <button
                                onClick={handleTest}
                                disabled={isTesting || !form.host || !form.username || !form.password}
                                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                                    ${hasTestedSuccess ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                                {hasTestedSuccess ? '测试通过' : '测试连接'}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending || updateMutation.isPending || !hasTestedSuccess}
                                className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                保存配置
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
