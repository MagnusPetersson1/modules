import { useState, useCallback, useRef, useEffect } from 'react'
import type { WorkspaceModel, ParseError } from './types/aml'
import { dslToAst, astToDsl } from './sync'
import { DslPane } from './components/DslPane'
import { CanvasPane } from './components/CanvasPane'
import { ViewTabs } from './components/ViewTabs'
import { Toolbar } from './components/Toolbar'
import { WorkspaceInfoPanel } from './components/WorkspaceInfoPanel'
import { ExportDialog } from './components/ExportDialog'
import styles from './App.module.css'

const DEFAULT_DSL = `workspace:
  name: "My Architecture"

model:
  elements:
    - id: "user"
      name: "User"
      type: person
      description: "End user"
    - id: "app"
      name: "Web App"
      type: system
      tech: "React"
    - id: "api"
      name: "API"
      type: application
      tech: ".NET Core"
    - id: "db"
      name: "Database"
      type: database
      tech: "PostgreSQL"
  relationships:
    - id: "rel-1"
      from: "user"
      to: "app"
      label: "uses"
      type: uses
    - id: "rel-2"
      from: "app"
      to: "api"
      label: "calls"
      type: uses
    - id: "rel-3"
      from: "api"
      to: "db"
      label: "reads/writes"
      type: accesses

views:
  - id: "context"
    name: "System Context"
    type: c4-context
    include: ["user", "app", "api", "db"]
    layout:
      algorithm: layered
      direction: top-down
`

export default function App() {
  const [dsl, setDsl] = useState(DEFAULT_DSL)
  const [model, setModel] = useState<WorkspaceModel | null>(null)
  const [errors, setErrors] = useState<ParseError[]>([])
  const [activeViewId, setActiveViewId] = useState('context')
  const [layoutTick, setLayoutTick] = useState(0)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Parse the default DSL on first mount so the canvas is populated immediately
  useEffect(() => {
    dslToAst(DEFAULT_DSL).then(({ model: m, errors: e }) => {
      setModel(m)
      setErrors(e)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // DSL edit → debounce → parse → update model
  const handleDslChange = useCallback((newDsl: string) => {
    setDsl(newDsl)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { model: m, errors: e } = await dslToAst(newDsl)
        setModel(m)
        setErrors(e)
        if (m && !m.views.find(v => v.id === activeViewId)) {
          setActiveViewId(m.views[0]?.id ?? '')
        }
      } catch {
        // backend not available — keep previous model
      }
    }, 400)
  }, [activeViewId])

  // Canvas change (drag/connect) → update model → reformat DSL
  const handleModelChange = useCallback(async (newModel: WorkspaceModel) => {
    setModel(newModel)
    try {
      const newDsl = await astToDsl(newModel)
      setDsl(newDsl)
    } catch {
      // backend not available — model updated in memory but DSL not refreshed
    }
  }, [])

  // Open .arch file via browser File API
  const handleOpenFile = useCallback(async () => {
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'Architecture files', accept: { 'text/yaml': ['.arch', '.yaml', '.yml'] } }],
    }).catch(() => [null])
    if (!fileHandle) return
    const file = await fileHandle.getFile()
    const text = await file.text()
    handleDslChange(text)
  }, [handleDslChange])

  // Save .arch file via browser File API
  const handleSaveFile = useCallback(async () => {
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: `${model?.workspace.name ?? 'architecture'}.arch`,
      types: [{ description: 'Architecture files', accept: { 'text/yaml': ['.arch'] } }],
    }).catch(() => null)
    if (!fileHandle) return
    const writable = await fileHandle.createWritable()
    await writable.write(dsl)
    await writable.close()
  }, [dsl, model])

  const handleAutoLayout = useCallback(() => {
    setLayoutTick(t => t + 1)
  }, [])

  return (
    <div className={styles.root}>
      <Toolbar onAutoLayout={handleAutoLayout} onOpenFile={handleOpenFile} onSaveFile={handleSaveFile} onWorkspaceInfo={() => setInfoOpen(true)} onExport={() => setExportOpen(true)} />
      <ViewTabs model={model} activeViewId={activeViewId} onSelect={setActiveViewId} />
      <div className={styles.workspace}>
        <div className={styles.dslPane}>
          <DslPane dsl={dsl} errors={errors} onChange={handleDslChange} selectedElementId={selectedElementId} />
        </div>
        <div className={styles.canvasPane}>
          <CanvasPane
            model={model}
            viewId={activeViewId}
            onModelChange={handleModelChange}
            triggerLayout={layoutTick}
            onSelectionChange={setSelectedElementId}
          />
        </div>
      </div>
      {infoOpen && model && (
        <WorkspaceInfoPanel
          model={model}
          onModelChange={handleModelChange}
          onClose={() => setInfoOpen(false)}
        />
      )}
      {exportOpen && (
        <ExportDialog
          workspaceName={model?.workspace.name ?? 'diagram'}
          model={model}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  )
}

