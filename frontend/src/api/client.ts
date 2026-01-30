import axios from 'axios'
import config from '@/config'

// API 基础配置
const api = axios.create({
    baseURL: config.apiBaseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: config.requestTimeout
})

// 请求拦截器 - 自动添加 Authorization header
api.interceptors.request.use((axiosConfig) => {
    const token = localStorage.getItem(config.storageKeys.token)
    if (token) {
        axiosConfig.headers.Authorization = `Bearer ${token}`
    }
    return axiosConfig
})

// 响应拦截器 - 处理 401 错误
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Check if auth is disabled
            if (import.meta.env.VITE_AUTH_DISABLED === 'true') {
                return Promise.reject(error)
            }
            // 排除登录/注册请求的 401 错误，不自动跳转
            const url = error.config?.url || ''
            if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
                localStorage.removeItem(config.storageKeys.token)
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

// 文件 API
export const filesApi = {
    upload: (file: File) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    }
}

// 项目相关 API
export const projectsApi = {
    list: (params?: { page?: number; size?: number; name?: string }) => api.get('/projects/', { params }),
    get: (id: number) => api.get(`/projects/${id}`),
    create: (data: { name: string; key: string; owner: string; description?: string }) =>
        api.post('/projects/', data),
    update: (id: number, data: any) => api.put(`/projects/${id}`, data),
    delete: (id: number) => api.delete(`/projects/${id}`),

    // 环境配置 API
    listEnvironments: (projectId: number) => api.get(`/projects/${projectId}/environments`),
    createEnvironment: (projectId: number, data: { name: string; domain?: string; variables?: Record<string, string>; headers?: Record<string, string> }) =>
        api.post(`/projects/${projectId}/environments`, data),
    getEnvironment: (projectId: number, envId: number) => api.get(`/projects/${projectId}/environments/${envId}`),
    updateEnvironment: (projectId: number, envId: number, data: { name?: string; domain?: string; variables?: Record<string, string>; headers?: Record<string, string> }) =>
        api.put(`/projects/${projectId}/environments/${envId}`, data),
    deleteEnvironment: (projectId: number, envId: number) => api.delete(`/projects/${projectId}/environments/${envId}`),
    copyEnvironment: (projectId: number, envId: number) => api.post(`/projects/${projectId}/environments/${envId}/copy`),

    // 数据源 API
    listDataSources: (projectId: number) => api.get(`/projects/${projectId}/datasources`),
    createDataSource: (projectId: number, data: { name: string; db_type: string; host: string; port: number; db_name?: string; username?: string; password?: string }) =>
        api.post(`/projects/${projectId}/datasources`, data),
    updateDataSource: (projectId: number, dsId: number, data: { name?: string; db_type?: string; host?: string; port?: number; db_name?: string; username?: string; password?: string }) =>
        api.put(`/projects/${projectId}/datasources/${dsId}`, data),
    deleteDataSource: (projectId: number, dsId: number) => api.delete(`/projects/${projectId}/datasources/${dsId}`),
    testDataSource: (data: { db_type: string; host: string; port: number; db_name?: string; username?: string; password?: string }) =>
        api.post('/projects/datasources/test', data),
}

// 接口相关 API
export const interfacesApi = {
    list: (params?: { page?: number; size?: number; folder_id?: number }) => api.get('/interfaces/', { params }),
    get: (id: number) => api.get(`/interfaces/${id}`),
    create: (data: { project_id: number; name: string; url: string; method: string; status?: string }) =>
        api.post('/interfaces/', data),
    update: (id: number, data: any) => api.put(`/interfaces/${id}`, data),
    delete: (id: number) => api.delete(`/interfaces/${id}`),
    sendRequest: (data: { url: string; method: string; headers?: Record<string, string>; params?: Record<string, any>; body?: any; files?: Record<string, string> }) =>
        api.post('/interfaces/debug/send', data),
    listFolders: (params?: { project_id?: number }) => api.get('/interfaces/folders', { params }),
    createFolder: (data: { project_id: number; name: string; parent_id?: number }) => api.post('/interfaces/folders', data),
    deleteFolder: (id: number) => api.delete(`/interfaces/folders/${id}`),
    importSwagger: (formData: FormData) => api.post('/interfaces/import/swagger', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
}

// 场景相关 API
export const scenariosApi = {
    list: () => api.get('/scenarios/'),
    get: (id: number) => api.get(`/scenarios/${id}`),
    create: (data: { project_id: number; name: string; graph_data: Record<string, any> }) =>
        api.post('/scenarios/', data),
    update: (id: number, data: { project_id: number; name: string; graph_data: Record<string, any> }) =>
        api.put(`/scenarios/${id}`, data),
    run: (graph_data: { nodes: any[]; edges: any[] }) =>
        api.post('/scenarios/run', { graph_data }),
}

// Dashboard 统计 API
export const dashboardApi = {
    getStats: () => api.get('/dashboard/stats'),
    getTrend: () => api.get('/dashboard/trend'),
    getActivities: () => api.get('/dashboard/activities'),
}

// 测试报告 API
export const reportsApi = {
    list: (params?: { page?: number; size?: number; scenario_id?: number }) =>
        api.get('/reports/', { params }),
    get: (id: number) => api.get(`/reports/${id}`),
    getDetails: (id: number) => api.get(`/reports/${id}/details`),
    delete: (id: number) => api.delete(`/reports/${id}`),
}

// 测试计划 API
export const plansApi = {
    list: (params?: { page?: number; size?: number }) =>
        api.get('/plans/', { params }),
    create: (data: { name: string; scenario_id: number; cron_expression: string; status?: string }) =>
        api.post('/plans/', data),
    get: (id: number) => api.get(`/plans/${id}`),
    update: (id: number, data: any) => api.put(`/plans/${id}`, data),
    delete: (id: number) => api.delete(`/plans/${id}`),
    pause: (id: number) => api.post(`/plans/${id}/pause`),
    resume: (id: number) => api.post(`/plans/${id}/resume`),
    trigger: (id: number) => api.post(`/plans/${id}/trigger`),
}

// 关键字 API
export const keywordsApi = {
    list: (params?: { page?: number; size?: number; project_id?: number }) =>
        api.get('/keywords/', { params }),
    create: (data: any) => api.post('/keywords/', data),
    get: (id: number) => api.get(`/keywords/${id}`),
    update: (id: number, data: any) => api.put(`/keywords/${id}`, data),
    delete: (id: number) => api.delete(`/keywords/${id}`),
    toggle: (id: number) => api.put(`/keywords/${id}/toggle`),
    generateFile: (id: number) => api.post(`/keywords/${id}/generate-file`),
}

// API 测试用例 API
export const apiTestCasesApi = {
    // 测试用例 CRUD
    list: (projectId: number, params?: { page?: number; size?: number; search?: string; tags?: string; enabled_only?: boolean }) =>
        api.get(`/projects/${projectId}/api-test-cases`, { params }),
    create: (projectId: number, data: any) => api.post(`/projects/${projectId}/api-test-cases`, data),
    get: (id: number) => api.get(`/api-test-cases/${id}`),
    update: (id: number, data: any) => api.put(`/api-test-cases/${id}`, data),
    delete: (id: number) => api.delete(`/api-test-cases/${id}`),

    // 测试执行
    execute: (id: number, data?: { environment_id?: number; verbose?: boolean }) =>
        api.post(`/api-test-cases/${id}/execute`, data || {}),

    // 执行历史
    listExecutions: (id: number, limit?: number) =>
        api.get(`/api-test-cases/${id}/executions`, { params: { limit } }),

    getExecution: (executionId: number) =>
        api.get(`/api-test-executions/${executionId}`),

    getExecutionSteps: (executionId: number) =>
        api.get(`/api-test-executions/${executionId}/steps`),

    // 其他功能
    validateYaml: (yamlContent: string) =>
        api.post('/api-test-cases/validate', { yaml_content: yamlContent }),

    importFromYaml: (projectId: number, yamlContent: string, override?: boolean) =>
        api.post(`/projects/${projectId}/api-test-cases/import-yaml`, { yaml_content: yamlContent, override }),
}

// 功能测试模块 API

// AI 配置管理 API
export const aiConfigApi = {
    list: () => api.get('/ai/configs/'),
    getDefault: () => api.get('/ai/configs/default'),
    get: (id: number) => api.get(`/ai/configs/${id}`),
    create: (data: { provider_name: string; provider_type: string; api_key: string; model_name: string; temperature?: number; is_default?: boolean }) =>
        api.post('/ai/configs/', data),
    update: (id: number, data: { provider_name?: string; api_key?: string; model_name?: string; temperature?: number; is_enabled?: boolean; is_default?: boolean }) =>
        api.put(`/ai/configs/${id}`, data),
    delete: (id: number) => api.delete(`/ai/configs/${id}`),
    getPresets: () => api.get('/ai/configs/presets'),
}

// 需求澄清 API
export const aiClarificationApi = {
    startClarification: (data: { requirement_id: string; initial_input: string }) =>
        api.post('/ai/clarify', data, {
            responseType: 'text' // SSE 流式响应
        }),
    sendMessage: (data: { requirement_id: string; user_input: string }) =>
        api.post('/ai/clarify', data, {
            responseType: 'text' // SSE 流式响应
        }),
    getConversation: (requirementId: string) =>
        api.get(`/ai/clarify/${requirementId}`),
    completeClarification: (requirementId: string) =>
        api.post(`/ai/clarify/${requirementId}/complete`),
}

// 测试点生成和管理 API
export const testPointsApi = {
    generate: (data: { requirement_id: number; categories?: string[]; use_knowledge?: boolean; min_coverage?: string }) =>
        api.post('/test-points/generate', data),
    listByRequirement: (requirementId: number) =>
        api.get(`/test-points/requirement/${requirementId}`),
    get: (id: number) => api.get(`/test-points/${id}`),
    delete: (id: number) => api.delete(`/test-points/${id}`),
}

// 测试用例生成和管理 API（功能测试）
export const functionalTestCasesApi = {
    generate: (data: { requirement_id: number; test_point_ids: number[]; module_name: string; page_name: string; case_type: string; include_knowledge?: boolean }) =>
        api.post('/test-cases/generate/generate', data),
    listByRequirement: (requirementId: number) =>
        api.get(`/test-cases/generate/requirement/${requirementId}`),
    get: (caseId: string) => api.get(`/test-cases/generate/${caseId}`),
    delete: (caseId: string) => api.delete(`/test-cases/generate/${caseId}`),
    approve: (caseId: string) => api.put(`/test-cases/generate/${caseId}/approve`),
}

// 需求管理 API
export const requirementsApi = {
    list: (params?: { page?: number; size?: number; status?: string }) =>
        api.get('/functional/requirements', { params }),
    get: (id: number) => api.get(`/functional/requirements/${id}`),
    create: (data: { title: string; description: string; priority?: string; module_name?: string }) =>
        api.post('/functional/requirements', data),
    update: (id: number, data: { title?: string; description?: string; priority?: string; status?: string }) =>
        api.put(`/functional/requirements/${id}`, data),
    delete: (id: number) => api.delete(`/functional/requirements/${id}`),
}

export default api
