
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Trash2,
    Loader2,
    Edit2,
    Database,
    FolderKanban,
    FileText
} from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { projectsApi } from '@/api/client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/common/EmptyState';
import { Tooltip } from '@/components/ui/tooltip';

interface Project {
    id: number;
    name: string;
    key: string;
    description: string;
    owner?: string;
    created_at?: string;
    updated_at?: string;
}

export default function ProjectManagement() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const size = 10;

    // Delete state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    // Create/Edit state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [createForm, setCreateForm] = useState({ name: '', key: '', description: '' });
    const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({});

    // 验证表单
    const validateForm = (): boolean => {
        const errors: { name?: string; description?: string } = {};

        // 验证项目名称
        const name = createForm.name.trim();
        if (!name) {
            errors.name = '项目名称不能为空';
        } else if (name.length > 50) {
            errors.name = `项目名称不能超过50个字符（当前${name.length}个字符）`;
        }

        // 验证项目描述
        const description = createForm.description.trim();
        if (description && description.length > 200) {
            errors.description = `项目描述不能超过200个字符（当前${description.length}个字符）`;
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // 处理输入变化
    const handleInputChange = (field: 'name' | 'description', value: string) => {
        setCreateForm({ ...createForm, [field]: value });

        // 实时验证并清除错误
        const trimmedValue = value.trim();
        if (field === 'name' && trimmedValue) {
            if (trimmedValue.length > 50) {
                setFormErrors(prev => ({
                    ...prev,
                    name: `项目名称不能超过50个字符（当前${trimmedValue.length}个字符）`
                }));
            } else {
                setFormErrors(prev => ({ ...prev, name: undefined }));
            }
        } else if (field === 'description' && trimmedValue) {
            if (trimmedValue.length > 200) {
                setFormErrors(prev => ({
                    ...prev,
                    description: `项目描述不能超过200个字符（当前${trimmedValue.length}个字符）`
                }));
            } else {
                setFormErrors(prev => ({ ...prev, description: undefined }));
            }
        }
    };

    // Fetch projects
    const { data: projectData, isLoading } = useQuery({
        queryKey: ['projects', page, size, searchQuery],
        queryFn: () => projectsApi.list({ page, size, name: searchQuery || undefined }),
        select: (data) => data.data
    });

    const projects = projectData?.items || [];
    const total = projectData?.total || 0;
    const pages = projectData?.pages || 0;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => projectsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setIsDeleteOpen(false);
            setProjectToDelete(null);
            success('删除成功');
        },
        onError: () => showError('删除失败')
    });

    // Create/Update mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => projectsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            closeCreateModal();
            success('创建成功');
        },
        onError: (err: any) => {
            // 处理后端验证错误
            if (err?.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (typeof detail === 'string') {
                    showError(detail);
                } else if (Array.isArray(detail)) {
                    // Pydantic 验证错误格式
                    const errorMsg = detail.map((e: any) => e.msg).join('; ');
                    showError(errorMsg);
                }
            } else {
                showError('创建失败');
            }
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => projectsApi.update(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            closeCreateModal();
            success('编辑成功');
        },
        onError: (err: any) => {
            // 处理后端验证错误
            if (err?.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (typeof detail === 'string') {
                    showError(detail);
                } else if (Array.isArray(detail)) {
                    const errorMsg = detail.map((e: any) => e.msg).join('; ');
                    showError(errorMsg);
                }
            } else {
                showError('编辑失败');
            }
        }
    });

    const openCreateModal = () => {
        setEditingProject(null);
        setCreateForm({ name: '', key: '', description: '' });
        setFormErrors({});
        setIsCreateOpen(true);
    };

    const openEditModal = (project: Project) => {
        setEditingProject(project);
        setCreateForm({
            name: project.name,
            key: project.key,
            description: project.description || ''
        });
        setFormErrors({});
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        setEditingProject(null);
        setCreateForm({ name: '', key: '', description: '' });
        setFormErrors({});
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <motion.header
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <FolderKanban className="w-8 h-8 text-cyan-500" />
                        {t('nav.projectManagement')}
                    </h1>
                    <p className="text-slate-400">管理您的自动化测试项目</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openCreateModal}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Plus className="w-5 h-5" />
                    新建项目
                </motion.button>
            </motion.header>

            {/* Search Box */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1); // Reset to first page on search
                        }}
                        placeholder="搜索项目名称..."
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 transition-colors"
                    />
                </div>
            </motion.div>

            {/* List View */}
            <motion.div
                className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
                    </div>
                ) : (
                    <table className="w-full text-left table-fixed">
                        <thead className="bg-slate-800/50 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[200px]">项目名称</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400 w-[300px]">项目描述</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">创建人</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">创建时间</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">更新时间</th>
                                <th className="px-6 py-4 text-sm font-medium text-slate-400">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {projects.length > 0 ? (
                                projects.map((project: Project, index: number) => (
                                    <motion.tr
                                        key={project.id}
                                        className="hover:bg-white/5 transition-colors group"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + index * 0.05 }}
                                    >
                                        <td className="px-6 py-4 w-[200px]">
                                            <Tooltip content={project.name} position="top">
                                                <span className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate block w-full">
                                                    {project.name}
                                                </span>
                                            </Tooltip>
                                            <div className="text-xs text-slate-500 mt-1 font-mono">#{project.key}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 w-[300px]">
                                            <Tooltip content={project.description || '-'} position="top">
                                                <span className="truncate block w-full">
                                                    {project.description || '-'}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs text-cyan-500 font-bold">
                                                    {(project.owner || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm">{project.owner || 'Admin'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(project.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(project.updated_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Tooltip content="编辑" position="top">
                                                    <button
                                                        onClick={() => openEditModal(project)}
                                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="数据库配置" position="top">
                                                    <Link
                                                        to={`/api/projects/${project.id}/datasources`}
                                                        className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Database className="w-4 h-4" />
                                                    </Link>
                                                </Tooltip>
                                                <Tooltip content="测试用例" position="top">
                                                    <Link
                                                        to={`/api/projects/${project.id}/test-cases`}
                                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Link>
                                                </Tooltip>
                                                <Tooltip content="删除" position="top">
                                                    <button
                                                        onClick={() => { setProjectToDelete(project); setIsDeleteOpen(true); }}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState
                                            title="暂无项目"
                                            description="创建一个项目开始您的自动化测试之旅"
                                            icon={FolderKanban}
                                            action={
                                                <button
                                                    onClick={openCreateModal}
                                                    className="text-cyan-400 hover:underline text-sm"
                                                >
                                                    立即创建
                                                </button>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-white/5 bg-slate-800/30">
                        <Pagination
                            page={page}
                            size={size}
                            total={total}
                            pages={pages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </motion.div>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={() => projectToDelete && deleteMutation.mutate(projectToDelete.id)}
                title="删除项目"
                description={`请输入项目名称确认删除。此操作无法撤销。`}
                confirmText="删除"
                isDestructive={true}
                verificationText={projectToDelete?.name}
            />

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeCreateModal}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-8"
                        >
                            <h3 className="text-xl font-bold text-white mb-6">
                                {editingProject ? '编辑项目' : '新建项目'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2 font-medium">
                                        项目名称 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="e.g. Sisyphus接口自动化测试"
                                        className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-white focus:outline-none placeholder:text-slate-600 transition-colors ${
                                            formErrors.name
                                                ? 'border-red-500/50 focus:border-red-500/50'
                                                : 'border-white/10 focus:border-cyan-500/50'
                                        }`}
                                    />
                                    {formErrors.name && (
                                        <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {formErrors.name}
                                        </p>
                                    )}
                                    {!formErrors.name && createForm.name && (
                                        <p className="text-slate-500 text-xs mt-1.5">
                                            {createForm.name.trim().length} / 50
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">项目描述</label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder="e.g. 包含电商核心链路的自动化测试用例集合，覆盖登录、购物车、下单等场景..."
                                        rows={3}
                                        className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-white resize-none focus:outline-none placeholder:text-slate-600 transition-colors ${
                                            formErrors.description
                                                ? 'border-red-500/50 focus:border-red-500/50'
                                                : 'border-white/10 focus:border-cyan-500/50'
                                        }`}
                                    />
                                    {formErrors.description && (
                                        <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {formErrors.description}
                                        </p>
                                    )}
                                    {!formErrors.description && createForm.description && (
                                        <p className="text-slate-500 text-xs mt-1.5">
                                            {createForm.description.trim().length} / 200
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 mt-8">
                                <button
                                    onClick={closeCreateModal}
                                    className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => {
                                        // 前端验证
                                        if (!validateForm()) {
                                            return;
                                        }

                                        // Auto-generate key if creating new project
                                        const timestamp = new Date().getTime().toString().slice(-6);
                                        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                                        const autoKey = `PRJ_${timestamp}${randomSuffix}`;

                                        const payload = {
                                            name: createForm.name.trim(),
                                            description: createForm.description.trim(),
                                            key: editingProject ? editingProject.key : autoKey,
                                            owner: 'auto-assigned'
                                        };

                                        if (editingProject) {
                                            updateMutation.mutate({
                                                name: createForm.name.trim(),
                                                description: createForm.description.trim(),
                                                id: editingProject.id
                                            });
                                        } else {
                                            createMutation.mutate(payload);
                                        }
                                    }}
                                    disabled={!createForm.name.trim() || createMutation.isPending || updateMutation.isPending}
                                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingProject ? '保存' : '创建'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
