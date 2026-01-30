/**
 * API 测试用例编辑器类型定义
 */

// 步骤类型枚举
export enum StepType {
    REQUEST = 'request',
    DATABASE = 'database',
    WAIT = 'wait',
    LOOP = 'loop',
    SCRIPT = 'script',
    CONCURRENT = 'concurrent',
    CONDITION = 'condition'
}

// HTTP 方法
export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    HEAD = 'HEAD',
    OPTIONS = 'OPTIONS'
}

// 请求步骤配置
export interface RequestStep {
    name: string
    request: {
        url: string
        method: HttpMethod
        headers?: Record<string, string>
        params?: Record<string, any>
        body?: any
        json?: Record<string, any>
        data?: any
        files?: Record<string, string>
    }
    extract?: Record<string, string>
    validate?: Array<{
        type: 'eq' | 'lt' | 'le' | 'gt' | 'ge' | 'ne' | 'contains' | 'regex'
        value: any[]
    }>
}

// 数据库步骤配置
export interface DatabaseStep {
    name: string
    database: {
        type: 'mysql' | 'postgresql' | 'mongodb' | 'redis'
        query: string
        variables?: Record<string, any>
    }
    extract?: Record<string, string>
}

// 等待步骤配置
export interface WaitStep {
    name: string
    wait: {
        seconds: number
    }
}

// 循环步骤配置
export interface LoopStep {
    name: string
    loop: {
        times: number
        steps: any[]
    }
}

// 脚本步骤配置
export interface ScriptStep {
    name: string
    script: {
        language: 'python' | 'javascript'
        code: string
    }
}

// 并发步骤配置
export interface ConcurrentStep {
    name: string
    concurrent: {
        steps: any[]
    }
}

// 条件步骤配置
export interface ConditionStep {
    name: string
    condition: {
        variable: string
        operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains'
        value: any
        steps: any[]
        else_steps?: any[]
    }
}

// 测试步骤（联合类型）
export type TestStep =
    | RequestStep
    | DatabaseStep
    | WaitStep
    | LoopStep
    | ScriptStep
    | ConcurrentStep
    | ConditionStep

// 带有唯一 ID 和类型的步骤项
export interface StepItemData {
    id: string
    type: StepType
    step: TestStep
    expanded?: boolean
}

// 保持向后兼容的别名
export type StepItem = StepItemData

// 测试用例配置
export interface TestCaseConfig {
    name: string
    config?: {
        base_url?: string
        verify?: boolean
        timeout?: number
        variables?: Record<string, any>
        headers?: Record<string, string>
    }
    steps: StepItem[]
}

// 步骤类型显示信息
export interface StepTypeInfo {
    type: StepType
    label: string
    icon: string
    description: string
    color: string
}

// 可用的步骤类型信息
export const STEP_TYPE_INFO: Record<StepType, StepTypeInfo> = {
    [StepType.REQUEST]: {
        type: StepType.REQUEST,
        label: 'HTTP 请求',
        icon: '🌐',
        description: '发送 HTTP/HTTPS 请求',
        color: 'cyan'
    },
    [StepType.DATABASE]: {
        type: StepType.DATABASE,
        label: '数据库操作',
        icon: '🗄️',
        description: '执行数据库查询',
        color: 'purple'
    },
    [StepType.WAIT]: {
        type: StepType.WAIT,
        label: '等待',
        icon: '⏱️',
        description: '延迟执行',
        color: 'amber'
    },
    [StepType.LOOP]: {
        type: StepType.LOOP,
        label: '循环',
        icon: '🔄',
        description: '重复执行步骤',
        color: 'emerald'
    },
    [StepType.SCRIPT]: {
        type: StepType.SCRIPT,
        label: '脚本',
        icon: '📜',
        description: '执行自定义脚本',
        color: 'blue'
    },
    [StepType.CONCURRENT]: {
        type: StepType.CONCURRENT,
        label: '并发',
        icon: '⚡',
        description: '并发执行多个步骤',
        color: 'orange'
    },
    [StepType.CONDITION]: {
        type: StepType.CONDITION,
        label: '条件判断',
        icon: '🔀',
        description: '根据条件执行不同步骤',
        color: 'pink'
    }
}
