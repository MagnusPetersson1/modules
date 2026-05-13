import type { WorkspaceModel } from '../types/aml'
import styles from './ViewTabs.module.css'

interface Props {
  model: WorkspaceModel | null
  activeViewId: string
  onSelect: (viewId: string) => void
}

export function ViewTabs({ model, activeViewId, onSelect }: Props) {
  if (!model || model.views.length === 0) return null
  return (
    <div className={styles.tabs}>
      {model.views.map(v => (
        <button
          key={v.id}
          className={`${styles.tab} ${v.id === activeViewId ? styles.active : ''}`}
          onClick={() => onSelect(v.id)}
        >
          {v.name ?? v.id}
        </button>
      ))}
    </div>
  )
}
