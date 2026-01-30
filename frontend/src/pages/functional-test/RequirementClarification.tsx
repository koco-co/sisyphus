import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import axios from 'axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface ConversationState {
  requirement_document: string
  identified_issues: string[]
  risk_points: string[]
  needs_clarification: boolean
  is_complete: boolean
  question_count: number
}

export default function RequirementClarification() {
  const { t } = useTranslation()
  const toast = useToast()
  const { requirementId } = useParams<{ requirementId: string }>()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationState, setConversationState] = useState<ConversationState | null>(null)
  const [currentResponse, setCurrentResponse] = useState('')

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  // 发送消息（SSE 流式响应）
  const sendMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return

    const userMessage = input.trim()
    setInput('')

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }])
    setIsStreaming(true)
    setCurrentResponse('')

    try {
      const token = localStorage.getItem('sisyphus-token')
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

      const response = await fetch(`${baseUrl}/ai/clarify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requirement_id: requirementId,
          user_input: userMessage
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let assistantMessage = ''

      // 读取 SSE 流
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              // 流结束
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date().toISOString()
              }])
              setCurrentResponse('')
              setIsStreaming(false)
              break
            }

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'content') {
                assistantMessage += parsed.content
                setCurrentResponse(assistantMessage)
              } else if (parsed.type === 'state') {
                setConversationState(parsed.state)
              } else if (parsed.type === 'error') {
                toast.error(parsed.error || '生成失败')
                setIsStreaming(false)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', data)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || '发送消息失败')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，发生了错误。请稍后再试。',
        timestamp: new Date().toISOString()
      }])
      setIsStreaming(false)
    }
  }

  // 完成澄清
  const completeClarification = async () => {
    try {
      await axios.post(`/ai/clarify/${requirementId}/complete`)
      toast.success(t('functionalTest.clarification.clarificationComplete'))
      navigate(`/functional-test/requirements/${requirementId}`)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '操作失败')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* 头部信息 */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('functionalTest.clarification.title')}</h1>
            <p className="text-gray-400 mt-1">{t('functionalTest.clarification.description')}</p>
          </div>
          {conversationState?.is_complete && (
            <button
              onClick={completeClarification}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('functionalTest.clarification.completeClarification')}
            </button>
          )}
        </div>

        {/* 对话状态统计 */}
        {conversationState && (
          <div className="mt-4 flex gap-6 text-sm">
            {conversationState.identified_issues.length > 0 && (
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {t('functionalTest.clarification.issuesIdentified').replace(
                    '{0}',
                    conversationState.identified_issues.length.toString()
                  )}
                </span>
              </div>
            )}
            {conversationState.risk_points.length > 0 && (
              <div className="flex items-center gap-2 text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {t('functionalTest.clarification.risksIdentified').replace(
                    '{0}',
                    conversationState.risk_points.length.toString()
                  )}
                </span>
              </div>
            )}
            <div className="text-gray-400">
              {t('functionalTest.clarification.questionCount').replace(
                '{0}',
                conversationState.question_count.toString()
              )}
            </div>
          </div>
        )}
      </div>

      {/* 对话历史 */}
      <div className="flex-1 bg-slate-800 rounded-lg p-4 overflow-y-auto mb-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">开始需求澄清对话</p>
              <p className="text-sm">请输入您的需求描述，AI 将帮助您澄清细节</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.timestamp && (
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* 流式响应中 */}
            {isStreaming && currentResponse && (
              <div className="flex justify-start">
                <div className="max-w-[70%] rounded-lg p-3 bg-slate-700 text-gray-200">
                  <p className="whitespace-pre-wrap">{currentResponse}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI 正在思考...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 识别的问题和风险 */}
      {conversationState && (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          {conversationState.identified_issues.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t('functionalTest.clarification.identifiedIssues')}
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {conversationState.identified_issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {conversationState.risk_points.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t('functionalTest.clarification.riskPoints')}
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {conversationState.risk_points.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 输入框 */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('functionalTest.clarification.inputPlaceholder')}
            disabled={isStreaming || isLoading}
            rows={3}
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || isLoading}
            className="self-end px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming || isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
