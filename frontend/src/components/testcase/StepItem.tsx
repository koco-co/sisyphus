/**
 * 步骤项组件
 *
 * 功能：
 * - 显示步骤基本信息
 * - 编辑步骤参数
 */

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StepItemProps {
  step: {
    id: string
    type: string
    name: string
    params: Record<string, any>
    validations?: Array<Record<string, any>>
  }
  onChange: (step: any) => void
}

export function StepItem({ step, onChange }: StepItemProps) {
  const updateStep = (updates: Partial<typeof step>) => {
    onChange({ ...step, ...updates })
  }

  const updateParam = (key: string, value: any) => {
    onChange({
      ...step,
      params: { ...step.params, [key]: value }
    })
  }

  return (
    <div className="space-y-3">
      {/* 步骤类型和名称 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">步骤类型</label>
          <Select
            value={step.type}
            onValueChange={(value) => updateStep({ type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="request">HTTP 请求</SelectItem>
              <SelectItem value="database">数据库操作</SelectItem>
              <SelectItem value="wait">等待</SelectItem>
              <SelectItem value="keyword">关键字</SelectItem>
              <SelectItem value="condition">条件判断</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">步骤名称</label>
          <Input
            value={step.name}
            onChange={(e) => updateStep({ name: e.target.value })}
            placeholder="请输入步骤名称"
          />
        </div>
      </div>

      {/* 步骤参数 */}
      <div className="bg-gray-50 p-3 rounded-lg space-y-3">
        {step.type === 'request' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <Input
                value={step.params.url || ''}
                onChange={(e) => updateParam('url', e.target.value)}
                placeholder="/api/users"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">请求方法</label>
              <Select
                value={step.params.method || 'GET'}
                onValueChange={(value) => updateParam('method', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step.type === 'database' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">SQL 语句</label>
              <Input
                value={step.params.sql || ''}
                onChange={(e) => updateParam('sql', e.target.value)}
                placeholder="SELECT * FROM users"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">操作类型</label>
              <Select
                value={step.params.operation_type || 'query'}
                onValueChange={(value) => updateParam('operation_type', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="query">查询</SelectItem>
                  <SelectItem value="execute">执行</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step.type === 'wait' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">等待类型</label>
              <Select
                value={step.params.wait_type || 'fixed'}
                onValueChange={(value) => updateParam('wait_type', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">固定延迟</SelectItem>
                  <SelectItem value="condition">条件等待</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {step.params.wait_type === 'fixed' && (
              <div>
                <label className="block text-sm font-medium mb-1">延迟时间（秒）</label>
                <Input
                  type="number"
                  value={step.params.seconds || 1}
                  onChange={(e) => updateParam('seconds', parseInt(e.target.value))}
                  min={0}
                  step={0.1}
                />
              </div>
            )}
          </>
        )}

        {step.type === 'keyword' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">关键字名称</label>
              <Input
                value={step.params.keyword_name || ''}
                onChange={(e) => updateParam('keyword_name', e.target.value)}
                placeholder="custom_keyword"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">关键字参数（JSON）</label>
              <Input
                value={JSON.stringify(step.params.keyword_params || {})}
                onChange={(e) => {
                  try {
                    updateParam('keyword_params', JSON.parse(e.target.value))
                  } catch (err) {
                    // 忽略 JSON 解析错误
                  }
                }}
                placeholder='{"key": "value"}'
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
