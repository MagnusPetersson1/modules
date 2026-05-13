import styles from './Toolbar.module.css'

interface Props {
  onAutoLayout: () => void
  onOpenFile: () => void
  onSaveFile: () => void
  onWorkspaceInfo: () => void
  onExport: () => void
}

export function Toolbar({ onAutoLayout, onOpenFile, onSaveFile, onWorkspaceInfo, onExport }: Props) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.brand}>Visualizer</span>
      <button className={styles.btn} onClick={onOpenFile} title="Open .arch file">Open</button>
      <button className={styles.btn} onClick={onSaveFile} title="Save .arch file">Save</button>
      <span className={styles.divider} />
      <button className={styles.btn} onClick={onAutoLayout} title="Auto-layout with ElkJS">Auto-layout</button>
      <span className={styles.divider} />
      <button className={styles.btn} onClick={onExport} title="Export diagram">Export</button>
      <button className={styles.btn} onClick={onWorkspaceInfo} title="Workspace context &amp; AI suggestions">Info</button>
    </div>
  )
}
