/**
 * 测试用例编辑器 - 主组件
 *
 * 功能：
 * - 编辑测试用例基本信息
 * - 管理测试步骤
 * - 实时预览 YAML
 * - 保存和执行测试
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { StepList } from './StepList'
import { YAMLPreview } from './YAMLPreview'
import { Play, Save } from 'lucide-react'

interface TestCaseEditorProps {
  testCaseId?: number
  projectId: number
  initialData?: {
    name?: string
    description?: string
    steps?: Array<{
      id: string
      type: string
      name: string
      params: Record<string, any>
      validations?: Array<Record<string, any>>
    }>
    variables?: Record<string, any>
  }
  onSave?: (data: any) => Promise<void>
  onExecute?: (result: any) => void
}

export function TestCaseEditor({
  testCaseId,
  projectId,
  initialData,
  onSave,
  onExecute
}: TestCaseEditorProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    steps: initialData?.steps || [],
    variables: initialData?.variables || {}
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(formData)
      console.log('✅ 测试用例已保存')
    } catch (error) {
      console.error('❌ 保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExecute = async () => {
    if (!onExecute || !testCaseId) return

    setIsExecuting(true)
    try {
      // 先保存
      if (onSave) {
        await onSave(formData)
      }

      // TODO: 调用执行 API
      console.log('执行测试用例:', testCaseId)
    } catch (error) {
      console.error('❌ 执行失败:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleStepsChange = useCallback((steps: any[]) => {
    setFormData(prev => ({ ...prev, steps }))
  }, [])

  return (
    <div className="test-case-editor space-y-6">
      {/* 基本信息 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">测试用例编辑器</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              用例名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入测试用例名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="max-w-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">描述</label>
            <Textarea
              placeholder="请输入测试用例描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </Card>

      {/* 测试步骤 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">测试步骤</h3>
          <Button
            onClick={() => {
              const newStep = {
                id: `step_${Date.now()}`,
                type: 'request',
                name: '新步骤',
                params: { url: '', method: 'GET' }
              }
              setFormData({
                ...formData,
                steps: [...formData.steps, newStep]
              })
            }}
          >
            + 添加步骤
          </Button>
        </div>

        <StepList
          steps={formData.steps}
          onChange={handleStepsChange}
        />
      </Card>

      {/* YAML 预览 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">YAML 预览</h3>
        <YAMLPreview formData={formData} />
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isSaving || !formData.name}
        >
          {isSaving ? (
            <>保存中...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存
            </>
          )}
        </Button>

        <Button
          onClick={handleExecute}
          disabled={isExecuting || !testCaseId}
        >
          {isExecuting ? (
            <>执行中...</>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              执行测试
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
