/**
 * 步骤列表组件
 *
 * 功能：
 * - 展示测试步骤列表
 * - 支持拖拽排序
 * - 删除步骤
 */

import { useCallback } from 'react'
import { StepItem } from './StepItem'
import { Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StepListProps {
  steps: Array<{
    id: string
    type: string
    name: string
    params: Record<string, any>
    validations?: Array<Record<string, any>>
  }>
  onChange: (steps: any[]) => void
}

export function StepList({ steps, onChange }: StepListProps) {
  const handleStepChange = useCallback((index: number, updatedStep: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], ...updatedStep }
    onChange(newSteps)
  }, [steps, onChange])

  const handleStepDelete = useCallback((index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    onChange(newSteps)
  }, [steps, onChange])

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return
    const newSteps = [...steps]
    ;[newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]]
    onChange(newSteps)
  }, [steps, onChange])

  const handleMoveDown = useCallback((index: number) => {
    if (index === steps.length - 1) return
    const newSteps = [...steps]
    ;[newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]
    onChange(newSteps)
  }, [steps, onChange])

  if (steps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>暂无测试步骤</p>
        <p className="text-sm mt-2">点击上方 "+ 添加步骤" 按钮添加第一个步骤</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.id} className="border rounded-lg p-4 space-y-3">
          {/* 步骤头部 */}
          <div className="flex items-center gap-3">
            <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
            <span className="text-sm font-medium text-gray-500">步骤 {index + 1}</span>

            <div className="flex-1" />

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMoveDown(index)}
                disabled={index === steps.length - 1}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStepDelete(index)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>

          {/* 步骤内容 */}
          <StepItem
            step={step}
            onChange={(updated) => handleStepChange(index, updated)}
          />
        </div>
      ))}
    </div>
  )
}
