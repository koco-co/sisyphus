/**
 * YAML 预览组件
 *
 * 功能：
 * - 实时显示生成的 YAML 内容
 * - 语法高亮
 */

import { useEffect, useState } from 'react'

interface YAMLPreviewProps {
  formData: {
    name: string
    description?: string
    steps: Array<any>
    variables?: Record<string, any>
  }
}

export function YAMLPreview({ formData }: YAMLPreviewProps) {
  const [yaml, setYaml] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      // 简化的 YAML 生成逻辑
      let yaml = `name: "${formData.name}"\n`

      if (formData.description) {
        yaml += `description: "${formData.description}"\n`
      }

      if (formData.variables && Object.keys(formData.variables).length > 0) {
        yaml += `config:\n`
        yaml += `  variables:\n`
        Object.entries(formData.variables).forEach(([key, value]) => {
          yaml += `    ${key}: ${JSON.stringify(value)}\n`
        })
      }

      yaml += `steps:\n`

      formData.steps.forEach((step, index) => {
        yaml += `  - ${step.name}:\n`
        yaml += `      type: ${step.type}\n`

        if (step.type === 'request') {
          yaml += `      url: ${step.params.url || ''}\n`
          yaml += `      method: ${step.params.method || 'GET'}\n`
          if (step.params.body) {
            yaml += `      json: ${JSON.stringify(step.params.body)}\n`
          }
        } else if (step.type === 'database') {
          yaml += `      operation:\n`
          yaml += `        type: ${step.params.operation_type || 'query'}\n`
          yaml += `        sql: ${step.params.sql || ''}\n`
        } else if (step.type === 'wait') {
          yaml += `      wait:\n`
          yaml += `        type: ${step.params.wait_type || 'fixed'}\n`
          if (step.params.wait_type === 'fixed') {
            yaml += `        seconds: ${step.params.seconds || 1}\n`
          }
        } else if (step.type === 'keyword') {
          yaml += `      keyword: ${step.params.keyword_name || ''}\n`
          if (step.params.keyword_params) {
            yaml += `      params: ${JSON.stringify(step.params.keyword_params)}\n`
          }
        }
      })

      setYaml(yaml)
      setError('')
    } catch (err) {
      setError('生成 YAML 失败')
      console.error(err)
    }
  }, [formData])

  return (
    <div className="yaml-preview">
      {error ? (
        <div className="text-red-500 text-sm">{error}</div>
      ) : (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{yaml}</code>
        </pre>
      )}
    </div>
  )
}
