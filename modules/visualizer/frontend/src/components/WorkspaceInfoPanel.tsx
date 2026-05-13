import { useState, useCallback } from 'react'
import type { WorkspaceModel, WorkspaceContext } from '../types/aml'
import { suggestForWorkspace, type SuggestResponse } from '../sync'
import styles from './WorkspaceInfoPanel.module.css'

interface Props {
  model: WorkspaceModel
  onModelChange: (model: WorkspaceModel) => void
  onClose: () => void
}

const FIELDS: { key: keyof WorkspaceContext; label: string; placeholder: string; rows?: number }[] = [
  { key: 'domain',      label: 'Domain',      placeholder: 'e.g. E-Commerce, Banking, Healthcare' },
  { key: 'perspective', label: 'Perspective',  placeholder: 'e.g. System Context, Container, Sequence' },
  { key: 'audience',    label: 'Audience',     placeholder: 'e.g. Engineering leads, Product managers' },
  { key: 'scope',       label: 'Scope',        placeholder: 'What is included / excluded from this diagram', rows: 2 },
  { key: 'notes',       label: 'Notes for AI', placeholder: 'Free-form context — used by AI for suggestions', rows: 3 },
]

export function WorkspaceInfoPanel({ model, onModelChange, onClose }: Props) {
  const ctx = model.workspace.context ?? {}
  const [name, setName] = useState(model.workspace.name)
  const [fields, setFields] = useState<WorkspaceContext>({ ...ctx })
  const [suggestions, setSuggestions] = useState<SuggestResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const commit = useCallback(() => {
    const hasContext = Object.values(fields).some(v => v?.trim())
    const newModel: WorkspaceModel = {
      ...model,
      workspace: {
        ...model.workspace,
        name: name.trim() || model.workspace.name,
        context: hasContext ? fields : undefined,
      },
    }
    onModelChange(newModel)
  }, [model, name, fields, onModelChange])

  const setField = (key: keyof WorkspaceContext, value: string) =>
    setFields(prev => ({ ...prev, [key]: value || undefined }))

  const handleSuggest = useCallback(async () => {
    setLoading(true)
    setSuggestions(null)
    try {
      // Commit current edits first so suggest sees latest context
      const hasContext = Object.values(fields).some(v => v?.trim())
      const tempModel: WorkspaceModel = {
        ...model,
        workspace: { ...model.workspace, name, context: hasContext ? fields : undefined },
      }
      const result = await suggestForWorkspace(tempModel)
      setSuggestions(result)
    } catch {
      setSuggestions({ layout: { algorithm: '', direction: '' }, suggestions: ['Could not reach backend'] })
    } finally {
      setLoading(false)
    }
  }, [model, name, fields])

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) { commit(); onClose() } }}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>Workspace</span>
          <button className={styles.closeBtn} onClick={() => { commit(); onClose() }}>✕</button>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commit}
            placeholder="Workspace name"
          />

          <div className={styles.sectionTitle}>Context</div>
          <p className={styles.hint}>
            This context is saved in the YAML and used by AI to suggest layouts, element types, and flag gaps.
          </p>

          {FIELDS.map(({ key, label, placeholder, rows }) => (
            <div key={key}>
              <label className={styles.label}>{label}</label>
              {rows ? (
                <textarea
                  className={styles.textarea}
                  rows={rows}
                  value={fields[key] ?? ''}
                  onChange={e => setField(key, e.target.value)}
                  onBlur={commit}
                  placeholder={placeholder}
                />
              ) : (
                <input
                  className={styles.input}
                  value={fields[key] ?? ''}
                  onChange={e => setField(key, e.target.value)}
                  onBlur={commit}
                  placeholder={placeholder}
                />
              )}
            </div>
          ))}

          <button className={styles.suggestBtn} onClick={handleSuggest} disabled={loading}>
            {loading ? 'Analysing…' : '✦ Get AI Suggestions'}
          </button>

          {suggestions && (
            <div className={styles.suggestions}>
              {suggestions.layout.algorithm && (
                <div className={styles.layoutHint}>
                  Suggested layout: <strong>{suggestions.layout.direction.replace('-', ' ')} {suggestions.layout.algorithm}</strong>
                </div>
              )}
              {suggestions.suggestions.length > 0 && (
                <ul className={styles.suggestionList}>
                  {suggestions.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
              {suggestions.suggestions.length === 0 && !suggestions.layout.algorithm && (
                <p className={styles.noSuggestions}>No suggestions — diagram looks complete for this context.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
