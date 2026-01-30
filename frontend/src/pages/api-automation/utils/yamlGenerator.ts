import type {
    TestCaseConfig,
    StepItemData,
    StepType,
    RequestStep,
    DatabaseStep,
    WaitStep,
    LoopStep,
    ScriptStep,
    ConcurrentStep,
    ConditionStep
} from '../TestCaseEditor.types'

/**
 * 将步骤配置转换为 YAML 格式
 */
export function generateYAML(config: TestCaseConfig): string {
    const lines: string[] = []

    // 基本信息
    lines.push(`name: ${config.name}`)

    // 配置
    if (config.config) {
        lines.push('config:')
        if (config.config.base_url) {
            lines.push(`  base_url: ${config.config.base_url}`)
        }
        if (config.config.verify !== undefined) {
            lines.push(`  verify: ${config.config.verify}`)
        }
        if (config.config.timeout) {
            lines.push(`  timeout: ${config.config.timeout}`)
        }
        if (config.config.variables && Object.keys(config.config.variables).length > 0) {
            lines.push('  variables:')
            for (const [key, value] of Object.entries(config.config.variables)) {
                lines.push(`    ${key}: ${formatValue(value)}`)
            }
        }
        if (config.config.headers && Object.keys(config.config.headers).length > 0) {
            lines.push('  headers:')
            for (const [key, value] of Object.entries(config.config.headers)) {
                lines.push(`    ${key}: ${formatValue(value)}`)
            }
        }
    }

    // 步骤
    if (config.steps.length > 0) {
        lines.push('steps:')
        for (const stepItem of config.steps) {
            // 跳过禁用的步骤
            if (stepItem.step.enabled === false) {
                continue
            }
            lines.push(generateStepYAML(stepItem))
        }
    }

    return lines.join('\n')
}

function generateStepYAML(stepItem: StepItemData): string {
    const lines: string[] = []
    const step = stepItem.step
    const indent = '  '

    lines.push(`${indent}- name: ${step.name || '未命名步骤'}`)

    switch (stepItem.type) {
        case StepType.REQUEST:
            lines.push(...generateRequestStep(step as RequestStep, indent))
            break
        case StepType.DATABASE:
            lines.push(...generateDatabaseStep(step as DatabaseStep, indent))
            break
        case StepType.WAIT:
            lines.push(...generateWaitStep(step as WaitStep, indent))
            break
        case StepType.LOOP:
            lines.push(...generateLoopStep(step as LoopStep, indent))
            break
        case StepType.SCRIPT:
            lines.push(...generateScriptStep(step as ScriptStep, indent))
            break
        case StepType.CONCURRENT:
            lines.push(...generateConcurrentStep(step as ConcurrentStep, indent))
            break
        case StepType.CONDITION:
            lines.push(...generateConditionStep(step as ConditionStep, indent))
            break
    }

    return lines.join('\n')
}

function generateRequestStep(step: RequestStep, indent: string): string[] {
    const lines: string[] = []
    const innerIndent = indent + '  '

    lines.push(`${innerIndent}request:`)
    lines.push(`${innerIndent}  url: ${step.request.url}`)
    lines.push(`${innerIndent}  method: ${step.request.method}`)

    if (step.request.headers && Object.keys(step.request.headers).length > 0) {
        lines.push(`${innerIndent}  headers:`)
        for (const [key, value] of Object.entries(step.request.headers)) {
            lines.push(`${innerIndent}    ${key}: ${formatValue(value)}`)
        }
    }

    if (step.request.params && Object.keys(step.request.params).length > 0) {
        lines.push(`${innerIndent}  params:`)
        for (const [key, value] of Object.entries(step.request.params)) {
            lines.push(`${innerIndent}    ${key}: ${formatValue(value)}`)
        }
    }

    if (step.request.body) {
        lines.push(`${innerIndent}  body:`)
        if (typeof step.request.body === 'object') {
            lines.push(`${innerIndent}    ${JSON.stringify(step.request.body)}`)
        } else {
            lines.push(`${innerIndent}    ${step.request.body}`)
        }
    }

    if (step.request.json && Object.keys(step.request.json).length > 0) {
        lines.push(`${innerIndent}  json:`)
        lines.push(`${innerIndent}    ${JSON.stringify(step.request.json)}`)
    }

    if (step.extract && Object.keys(step.extract).length > 0) {
        lines.push(`${innerIndent}extract:`)
        for (const [key, value] of Object.entries(step.extract)) {
            lines.push(`${innerIndent}  ${key}: ${value}`)
        }
    }

    if (step.validate && step.validate.length > 0) {
        lines.push(`${innerIndent}validate:`)
        for (const assertion of step.validate) {
            lines.push(`${innerIndent}  - ${assertion.type}: [${assertion.value.join(', ')}]`)
        }
    }

    return lines
}

function generateDatabaseStep(step: DatabaseStep, indent: string): string[] {
    const lines: string[] = []
    const innerIndent = indent + '  '

    lines.push(`${innerIndent}database:`)
    lines.push(`${innerIndent}  type: ${step.database.type}`)
    lines.push(`${innerIndent}  query: |`)
    lines.push(`${innerIndent}    ${step.database.query}`)

    if (step.database.variables && Object.keys(step.database.variables).length > 0) {
        lines.push(`${innerIndent}  variables:`)
        for (const [key, value] of Object.entries(step.database.variables)) {
            lines.push(`${innerIndent}    ${key}: ${formatValue(value)}`)
        }
    }

    if (step.extract && Object.keys(step.extract).length > 0) {
        lines.push(`${innerIndent}extract:`)
        for (const [key, value] of Object.entries(step.extract)) {
            lines.push(`${innerIndent}  ${key}: ${value}`)
        }
    }

    return lines
}

function generateWaitStep(step: WaitStep, indent: string): string[] {
    const lines: string[] = []
    const innerIndent = indent + '  '

    lines.push(`${innerIndent}wait:`)
    lines.push(`${innerIndent}  seconds: ${step.wait.seconds}`)

    return lines
}

function generateLoopStep(step: LoopStep, indent: string): string[] {
    const lines: string[] = []
    const innerIndent = indent + '  '

    lines.push(`${innerIndent}loop:`)
    lines.push(`${innerIndent}  times: ${step.loop.times}`)
    lines.push(`${innerIndent}  steps:`)
    // 子步骤将在后续版本支持
    lines.push(`${innerIndent}    # 子步骤配置将在后续版本支持`)

    return lines
}

function generateScriptStep(step: ScriptStep, indent: string): string[] {
    const lines: string[] = []
    const innerIndent = indent + '  '

    lines.push(`${innerIndent}script:`)
    lines.push(`${innerIndent}  language: ${step.script.language}`)
    lines.push(`${innerIndent}  code: |`)
    lines.push(`${innerIndent}    ${step.script.code}`)

    return lines
}

function generateConcurrentStep(step: ConcurrentStep, indent: string): string[] {
    const lines: string[] = []
    const innerIndent = indent + '  '

    lines.push(`${innerIndent}concurrent:`)
    lines.push(`${innerIndent}  steps:`)
    // 子步骤将在后续版本支持
    lines.push(`${innerIndent}    # 子步骤配置将在后续版本支持`)

    return lines
}

function generateConditionStep(step: ConditionStep, indent: string): string[] {
    const lines: string[] = []
    const innerIndent = indent + '  '

    lines.push(`${innerIndent}condition:`)
    lines.push(`${innerIndent}  variable: ${step.condition.variable}`)
    lines.push(`${innerIndent}  operator: ${step.condition.operator}`)
    lines.push(`${innerIndent}  value: ${formatValue(step.condition.value)}`)
    lines.push(`${innerIndent}  steps:`)
    // 子步骤将在后续版本支持
    lines.push(`${innerIndent}    # 子步骤配置将在后续版本支持`)

    if (step.condition.else_steps && step.condition.else_steps.length > 0) {
        lines.push(`${innerIndent}  else_steps:`)
        lines.push(`${innerIndent}    # 子步骤配置将在后续版本支持`)
    }

    return lines
}

function formatValue(value: any): string {
    if (typeof value === 'string') {
        // 如果值包含空格或特殊字符，使用引号
        if (/[\s'"{}[\]:,]/.test(value)) {
            return `"${value}"`
        }
        return value
    }
    if (typeof value === 'number') {
        return value.toString()
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
    }
    if (value === null) {
        return 'null'
    }
    return JSON.stringify(value)
}

/**
 * 从 YAML 解析步骤配置（简化版，完整解析需要 YAML 解析器）
 */
export function parseYAML(yamlContent: string): TestCaseConfig | null {
    try {
        // 简化版解析，实际应使用 js-yaml 等库
        const lines = yamlContent.split('\n')
        const config: TestCaseConfig = {
            name: '',
            steps: []
        }

        // 简单的解析逻辑
        for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('name:')) {
                config.name = trimmed.replace('name:', '').trim()
            }
        }

        return config
    } catch (error) {
        console.error('Failed to parse YAML:', error)
        return null
    }
}
