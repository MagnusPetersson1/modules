import MonacoEditor from '@monaco-editor/react'
import type { ParseError } from '../types/aml'
import type * as Monaco from 'monaco-editor'
import { useRef, useEffect } from 'react'
import styles from './DslPane.module.css'

interface Props {
  dsl: string
  errors: ParseError[]
  onChange: (dsl: string) => void
  selectedElementId?: string | null
}

export function DslPane({ dsl, errors, onChange, selectedElementId }: Props) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const decorationIdsRef = useRef<string[]>([])
  const selectedElementIdRef = useRef(selectedElementId)
  selectedElementIdRef.current = selectedElementId

  // Read from the live Monaco model — always current, no timing dependency on React state.
  function applyHighlight(editor: Monaco.editor.IStandaloneCodeEditor) {
    const elementId = selectedElementIdRef.current

    // Remove previous decorations. Delta with empty stale IDs is a no-op, safe to call.
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [])
    if (!elementId) return

    const textModel = editor.getModel()
    if (!textModel) return

    const lines = textModel.getValue().split('\n')
    // Match both quoted (`id: "foo"`) and unquoted (`id: foo`) forms
    // because the backend formatter omits quotes on simple scalar values.
    const idPattern = new RegExp(`id:\\s*"?${elementId}"?\\s*$`)

    let startLine = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith('- id:') && idPattern.test(lines[i])) {
        startLine = i + 1
        break
      }
    }
    if (startLine === -1) return

    const blockIndent = lines[startLine - 1].search(/\S/)
    let endLine = startLine
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') { endLine = i + 1; continue }
      const indent = line.search(/\S/)
      if (indent <= blockIndent && line.trimStart().startsWith('- ')) break
      if (indent < blockIndent) break
      endLine = i + 1
    }

    editor.revealLineInCenter(startLine)
    decorationIdsRef.current = editor.deltaDecorations([], [{
      range: { startLineNumber: startLine, startColumn: 1, endLineNumber: endLine, endColumn: 1 },
      options: { isWholeLine: true, className: 'aml-highlight', linesDecorationsClassName: 'aml-highlight-gutter' },
    }])
  }

  function handleMount(editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) {
    editorRef.current = editor
    setMarkers(monaco, editor.getModel(), errors)

    // editor.onDidChangeModelContent is editor-level — it fires even when
    // @monaco-editor/react replaces the underlying model via editor.setValue().
    // model.onDidChangeContent (what we used before) dies with the old model.
    editor.onDidChangeModelContent(() => {
      applyHighlight(editor)
    })

    // When the model instance itself is swapped out, old decoration IDs become
    // permanently invalid. Reset and re-apply against the new model.
    editor.onDidChangeModel(() => {
      decorationIdsRef.current = []
      applyHighlight(editor)
    })
  }

  function setMarkers(
    monaco: typeof Monaco,
    model: Monaco.editor.ITextModel | null,
    errs: ParseError[]
  ) {
    if (!model) return
    const markers: Monaco.editor.IMarkerData[] = errs.map(e => ({
      severity: e.severity === 'error' ? monaco.MarkerSeverity.Error
        : e.severity === 'warning' ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Info,
      message: e.message,
      startLineNumber: e.line ?? 1,
      startColumn: e.column ?? 1,
      endLineNumber: e.line ?? 1,
      endColumn: (e.column ?? 1) + 10,
    }))
    monaco.editor.setModelMarkers(model, 'aml', markers)
  }

  // Re-apply when selection changes (content hasn't changed, listener won't fire)
  useEffect(() => {
    const editor = editorRef.current
    if (editor) applyHighlight(editor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId])

  return (
    <div className={styles.pane}>
      <MonacoEditor
        height="100%"
        language="yaml"
        value={dsl}
        theme="vs-light"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
        }}
        onChange={v => onChange(v ?? '')}
        onMount={handleMount}
      />
    </div>
  )
}
