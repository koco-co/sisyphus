
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { projectsApi } from '@/api/client';
import {
    Database,
    Plus,
    Trash2,
    ArrowLeft,
    Loader2,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Copy,
    Edit2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { DatabaseConfigModal } from './components/DatabaseConfigModal';
import { motion } from 'framer-motion';

interface DataSource {
    id: number;
    name: string;
    db_type: string;
    host: string;
    port: number;
    db_name?: string;
    username?: string;
    variable_name?: string;
    is_enabled: boolean;
    status?: string; // connected, error, unchecked
    last_test_at?: string;
    error_msg?: string;
}

export default function DatabaseConfigList() {
    const { id: projectId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { success, error } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingDs, setEditingDs] = useState<DataSource | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Fetch Project Info (for header)
    const { data: project } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.get(Number(projectId)),
        enabled: !!projectId,
        select: (res) => res.data
    });

    // Fetch DataSources
    const { data: dataSources = [], isLoading, refetch } = useQuery({
        queryKey: ['datasources', projectId],
        queryFn: () => projectsApi.listDataSources(Number(projectId)),
        enabled: !!projectId,
        refetchInterval: 30000, // Auto-refresh every 30s to see status updates
        select: (res) => res.data
    });

    // Toggle Enable Mutation
    const toggleMutation = useMutation({
        mutationFn: (ds: DataSource) =>
            projectsApi.updateDataSource(Number(projectId), ds.id, { is_enabled: !ds.is_enabled } as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] });
        },
        onError: () => error('更新状态失败')
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => projectsApi.deleteDataSource(Number(projectId), id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasources', projectId] });
            setDeleteId(null);
            success('删除成功');
        },
        onError: () => error('删除失败')
    });

    const handleCopyConfig = (ds: DataSource) => {
        const config = {
            host: ds.host,
            port: ds.port,
            init_db: ds.db_name,
            user: ds.username,
            password: '***' // Hide password
        };
        navigator.clipboard.writeText(JSON.stringify(config));
        success('配置信息已复制到剪贴板');
    };

    const getStatusBadge = (ds: DataSource) => {
        if (!ds.is_enabled) return <span className="text-slate-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Disabled</span>;

        switch (ds.status) {
            case 'connected':
                return <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</span>;
            case 'error':
                return <span className="text-red-400 text-xs flex items-center gap-1" title={ds.error_msg}><XCircle className="w-3 h-3" /> Error</span>;
            default:
                return <span className="text-slate-400 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking</span>;
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <Link to={`/project/${projectId}`} className="hover:text-cyan-400 transition-colors">项目管理</Link>
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                    <Link to={`/project/${projectId}`} className="hover:text-cyan-400 transition-colors">{project?.name || 'Loading...'}</Link>
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                    <span className="text-white">数据库配置</span>
                </div>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Database className="w-8 h-8 text-cyan-500" />
                            数据库配置
                        </h1>
                        <p className="text-slate-400">
                            默认每10分钟自动检测一次连接状态
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => refetch()}
                            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                            title="刷新状态"
                        >
                            <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setEditingDs(null); setIsCreateOpen(true); }}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-cyan-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            新增配置
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/50 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">连接名称</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">引用变量</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">配置信息</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">连接状态</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400">启用状态</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-400 text-left">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {dataSources.map((ds: DataSource) => (
                            <tr key={ds.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{ds.name}</div>
                                    <div className="text-xs text-slate-500 uppercase mt-0.5">{ds.db_type}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {ds.variable_name ? (
                                        <code className="bg-slate-800 px-2 py-1 rounded text-cyan-400 text-xs font-mono">
                                            ${`{${ds.variable_name}}`}
                                        </code>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                                    {ds.host}:{ds.port}/{ds.db_name}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 items-start">
                                        {getStatusBadge(ds)}
                                        {ds.last_test_at && (
                                            <span className="text-[10px] text-slate-600">
                                                Last: {new Date(ds.last_test_at + 'Z').toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Switch
                                        checked={ds.is_enabled}
                                        onCheckedChange={() => toggleMutation.mutate(ds)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-left">
                                    <div className="flex justify-start gap-2">
                                        <button
                                            onClick={() => handleCopyConfig(ds)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            title="复制配置"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setEditingDs(ds); setIsCreateOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                            title="编辑"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteId(ds.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                            title="删除"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {dataSources.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={6}>
                                    <EmptyState
                                        title="暂无数据库配置"
                                        description="请点击右上角添加新的数据库配置"
                                        icon={Database}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal - Reusing/Creating Create/Edit Modal */}
            {isCreateOpen && (
                <DatabaseConfigModal
                    isOpen={isCreateOpen}
                    onClose={() => { setIsCreateOpen(false); setEditingDs(null); }}
                    projectId={Number(projectId)}
                    projectName={project?.name || ''}
                    editData={editingDs || undefined} // Pass editing data
                />
            )}

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="删除配置"
                description="确定要删除该数据库配置吗？"
                confirmText="删除"
                isDestructive
            />
        </div>
    );
}
