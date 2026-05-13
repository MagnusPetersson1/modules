import { useState, useEffect } from 'react'
import styles from './ShapePalette.module.css'

type PaletteTab = 'standard' | 'aws' | 'azure' | 'gcp'

interface ShapeEntry {
  elementType: string
  label: string
}

interface IconEntry {
  icon: string
  label: string
  elementType: string
}

interface IconGroup {
  name: string
  icons: IconEntry[]
}

// elementType defaults by cloud provider folder name
const AWS_FOLDER_TYPE: Record<string, string> = {
  'Compute':                    'node',
  'Containers':                 'application',
  'Database':                   'system',
  'Storage':                    'system',
  'Networking-Content-Delivery':'system',
  'App-Integration':            'process',
  'Analytics':                  'system',
  'Security-Identity-Compliance':'system',
  'Management-Governance':      'system',
  'Machine-Learning':           'system',
  'Developer-Tools':            'application',
  'Media-Services':             'system',
  'Internet-of-Things':         'system',
  'Migration-Transfer':         'application',
  'Business-Applications':      'system',
  'Cloud-Financial-Management': 'system',
  'Front-End-Web-Mobile':       'application',
  'End-User-Computing':         'system',
  'Games':                      'system',
  'Blockchain':                 'system',
}

const AZURE_FOLDER_TYPE: Record<string, string> = {
  'compute':               'node',
  'containers':            'application',
  'databases':             'system',
  'storage':               'system',
  'networking':            'system',
  'identity':              'system',
  'security':              'system',
  'analytics':             'system',
  'integration':           'process',
  'devops':                'application',
  'app services':          'application',
  'monitor':               'system',
  'ai + machine learning': 'system',
  'iot':                   'system',
  'web':                   'application',
  'mobile':                'application',
  'migration':             'application',
  'migrate':               'application',
  'management + governance':'system',
}

const GCP_FOLDER_TYPE: Record<string, string> = {
  'Compute':              'node',
  'Serverless Computing': 'application',
  'Containers':           'application',
  'Databases':            'system',
  'Storage':              'system',
  'Data Analytics':       'system',
  'Integration Services': 'process',
  'Networking':           'system',
  'AI _ Machine Learning':'system',
  'Security Identity':    'system',
  'DevOps':               'application',
  'Developer Tools':      'application',
  'Observability':        'system',
  'Operations':           'system',
  'Management Tools':     'system',
  'Hybrid & Multicloud':  'system',
  'Media Services':       'system',
  'Migration':            'application',
}

function awsLabel(file: string) {
  return file.replace(/\.svg$/, '').replace(/-/g, ' ')
}

function azureLabel(file: string) {
  // strip "10035-icon-service-" or "00039-icon-service-" prefix
  return file.replace(/\.svg$/, '').replace(/^\d+-icon-service-/, '').replace(/-/g, ' ')
}

function gcpCategoryLabel(folder: string) {
  // "AI _ Machine Learning" → "AI & Machine Learning", spaces kept
  return folder.replace(/_/g, '&').replace(/\s+&\s+/, ' & ')
}

/** Encodes each path segment so URLs with spaces (GCP) work correctly. */
function toIconUrl(...parts: string[]) {
  return '/icons/' + parts.flatMap(p => p.split('/')).map(encodeURIComponent).join('/')
}

function buildGroups(
  provider: string,
  manifest: Record<string, string[]>,
  labelFn: (file: string, folder: string) => string,
  typeLookup: Record<string, string>,
): IconGroup[] {
  return Object.entries(manifest).map(([folder, files]) => ({
    name: provider === 'azure'
      ? folder.charAt(0).toUpperCase() + folder.slice(1)
      : provider === 'gcp'
        ? gcpCategoryLabel(folder)
        : folder.replace(/-/g, ' '),
    icons: files.map(file => ({
      icon: toIconUrl(provider, folder, file),
      label: labelFn(file.split('/').pop()!, folder),
      elementType: typeLookup[folder] ?? 'system',
    })),
  }))
}

const SHAPES: ShapeEntry[] = [
  { elementType: 'person',      label: 'Person'      },
  { elementType: 'system',      label: 'System'      },
  { elementType: 'application', label: 'Application' },
  { elementType: 'component',   label: 'Component'   },
  { elementType: 'database',    label: 'Database'    },
  { elementType: 'process',     label: 'Process'     },
  { elementType: 'decision',    label: 'Decision'    },
  { elementType: 'node',        label: 'Server'      },
  { elementType: 'annotation',  label: 'Note'        },
  { elementType: 'boundary',    label: 'Group'       },
]

function ShapePreview({ type }: { type: string }) {
  switch (type) {
    case 'person':
      return (
        <svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true">
          <circle cx="11" cy="7" r="5.5" fill="#1565C0" />
          <path d="M2 24 Q2 15 11 14 Q20 15 20 24 Z" fill="#1565C0" />
        </svg>
      )
    case 'database':
      return (
        <svg width="24" height="22" viewBox="0 0 24 22" aria-hidden="true">
          <rect x="1" y="5" width="22" height="12" fill="#E8F5E9" stroke="#2E7D32" strokeWidth="1.5" />
          <ellipse cx="12" cy="5"  rx="11" ry="4" fill="#E8F5E9" stroke="#2E7D32" strokeWidth="1.5" />
          <ellipse cx="12" cy="17" rx="11" ry="4" fill="#E8F5E9" stroke="#2E7D32" strokeWidth="1.5" />
        </svg>
      )
    case 'decision':
      return (
        <svg width="24" height="22" viewBox="0 0 24 22" aria-hidden="true">
          <polygon points="12,1 23,11 12,21 1,11" fill="#F3E5F5" stroke="#6A1B9A" strokeWidth="1.5" />
        </svg>
      )
    case 'system':
      return <div className={styles.previewBox} style={{ borderColor: '#1565C0', background: '#E3F2FD', borderRadius: 4 }} />
    case 'application':
      return <div className={styles.previewBox} style={{ borderColor: '#1976D2', background: '#BBDEFB', borderRadius: 3 }} />
    case 'component':
      return <div className={styles.previewBox} style={{ borderColor: '#6A1B9A', background: '#F3E5F5', borderRadius: 3 }} />
    case 'process':
      return <div className={styles.previewBox} style={{ borderColor: '#E65100', background: '#FFF3E0', borderRadius: 7 }} />
    case 'node':
      return <div className={styles.previewBox} style={{ borderColor: '#4E342E', background: '#EFEBE9', borderRadius: 3 }} />
    case 'annotation':
      return <div className={styles.previewBox} style={{ borderColor: '#aaa', background: '#fffef0', borderStyle: 'dashed', borderRadius: 3 }} />
    case 'boundary':
      return <div className={styles.previewBox} style={{ borderColor: '#999', background: 'transparent', borderStyle: 'dashed', borderRadius: 5, borderWidth: 2 }} />
    default:
      return <div className={styles.previewBox} style={{ borderColor: '#888', borderRadius: 3 }} />
  }
}

export function ShapePalette() {
  const [tab, setTab] = useState<PaletteTab>('standard')
  const [manifest, setManifest] = useState<Record<string, Record<string, string[]>>>({})
  const [filterText, setFilterText] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/icons/index.json')
      .then(r => r.json())
      .then(setManifest)
      .catch(() => {/* dev server not running or icons folder missing */})
  }, [])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  function onDragStartShape(event: React.DragEvent, elementType: string) {
    event.dataTransfer.setData('application/aml-node-type', elementType)
    event.dataTransfer.effectAllowed = 'copy'
  }

  function onDragStartIcon(event: React.DragEvent, entry: IconEntry) {
    event.dataTransfer.setData('application/aml-node-type', entry.elementType)
    event.dataTransfer.setData('application/aml-node-icon', entry.icon)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const providerManifest: Record<string, string[]> = tab !== 'standard' ? (manifest[tab] ?? {}) : {}
  const groups: IconGroup[] = tab === 'aws'
    ? buildGroups('aws',   providerManifest, awsLabel,   AWS_FOLDER_TYPE)
    : tab === 'azure'
      ? buildGroups('azure', providerManifest, azureLabel, AZURE_FOLDER_TYPE)
      : tab === 'gcp'
        ? buildGroups('gcp',   providerManifest, (_f, folder) => gcpCategoryLabel(folder), GCP_FOLDER_TYPE)
        : []

  const filter = filterText.trim().toLowerCase()
  const displayGroups: IconGroup[] = filter
    ? [{ name: 'Results', icons: groups.flatMap(g => g.icons).filter(i => i.label.toLowerCase().includes(filter)) }]
    : groups

  return (
    <div className={styles.palette}>
      <div className={styles.tabs}>
        {(['standard', 'aws', 'azure', 'gcp'] as PaletteTab[]).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => { setTab(t); setFilterText('') }}
          >
            {t === 'standard' ? '⬡' : t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'standard' && (
        <>
          <div className={styles.title}>Shapes</div>
          {SHAPES.map(({ elementType, label }) => (
            <div
              key={elementType}
              className={styles.item}
              draggable
              onDragStart={e => onDragStartShape(e, elementType)}
              title={`Drag to add ${label}`}
            >
              <div className={styles.preview}><ShapePreview type={elementType} /></div>
              <span className={styles.label}>{label}</span>
            </div>
          ))}
        </>
      )}

      {tab !== 'standard' && (
        <>
          <div className={styles.cloudHeader}>
            <span className={styles.cloudTitle}>
              {tab === 'aws' ? 'Amazon Web Services' : tab === 'azure' ? 'Microsoft Azure' : 'Google Cloud'}
            </span>
            <input
              className={styles.filterInput}
              type="text"
              placeholder="Filter…"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>
          <div className={styles.iconScroll}>
            {displayGroups.length === 0 && (
              <div className={styles.emptyMsg}>Loading icons…</div>
            )}
            {displayGroups.map(group => {
              const key = `${tab}::${group.name}`
              const isExpanded = !!filter || expandedGroups.has(key)
              return (
                <div key={key}>
                  <button
                    className={styles.groupHeader}
                    onClick={() => toggleGroup(key)}
                    aria-expanded={isExpanded}
                  >
                    <span className={styles.groupChevron}>{isExpanded ? '▾' : '▸'}</span>
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.groupCount}>{group.icons.length}</span>
                  </button>
                  {isExpanded && (
                    <div className={styles.iconGrid}>
                      {group.icons.map(entry => (
                        <div
                          key={entry.icon}
                          className={styles.iconItem}
                          draggable
                          onDragStart={e => onDragStartIcon(e, entry)}
                          title={entry.label}
                        >
                          <img src={entry.icon} width={28} height={28} style={{ objectFit: 'contain' }} alt="" />
                          <span className={styles.iconLabel}>{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
