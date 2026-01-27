import React from 'react'
import Editor from '@monaco-editor/react'

interface MonacoEditorProps {
    value: string
    onChange?: (value: string) => void
    language?: string
    theme?: string
    height?: string
}

export function MonacoEditor({
    value,
    onChange,
    language = 'python',
    theme = 'vs-dark',
    height = '100%'
}: MonacoEditorProps) {
    return (
        <div className="h-full w-full rounded-2xl overflow-hidden">
            <Editor
                height={height}
                language={language}
                value={value}
                theme={theme}
                onChange={(value) => onChange?.(value || '')}
                options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineHeight: 24,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    padding: { top: 16, bottom: 16 },
                }}
            />
        </div>
    )
}
