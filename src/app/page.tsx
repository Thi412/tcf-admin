'use client'

import { useState, useRef, useEffect } from 'react'

type TaskType = 'tache2' | 'tache3'

interface IdeaInput { idea: string; example: string }
interface TopicForm {
  question: string; theme: string; difficulty: 'B1' | 'B2'
  pour: IdeaInput[]; contre: IdeaInput[]; sampleOpinion: string
}
interface Topic { id: string; question: string; theme: string; difficulty: string; is_active: boolean }

const emptyIdea = (): IdeaInput => ({ idea: '', example: '' })
const defaultForm = (): TopicForm => ({
  question: '', theme: '', difficulty: 'B2',
  pour: [emptyIdea(), emptyIdea()],
  contre: [emptyIdea(), emptyIdea()],
  sampleOpinion: '',
})

const JSON_TEMPLATE = {
  taskType: "tache3",
  topics: [
    {
      question: "Pensez-vous que le télétravail est bénéfique ?",
      theme: "Travail",
      difficulty: "B2",
      pour: [
        { idea: "Meilleur équilibre vie pro/perso", example: "On peut gérer son temps plus librement." },
        { idea: "Économies sur les transports", example: "Plus besoin de prendre le métro chaque jour." }
      ],
      contre: [
        { idea: "Isolement social", example: "On perd le contact avec ses collègues." }
      ],
      sampleOpinion: "À mon avis, le télétravail est globalement positif."
    }
  ]
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')

  const [tab, setTab] = useState<'add' | 'import' | 'list'>('add')
  const [taskType, setTaskType] = useState<TaskType>('tache3')
  const [form, setForm] = useState<TopicForm>(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Import tab
  const [jsonText, setJsonText] = useState('')
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // List tab
  const [topics, setTopics] = useState<Topic[]>([])
  const [listTask, setListTask] = useState<TaskType>('tache3')
  const [loadingList, setLoadingList] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function authHeader() { return { 'x-admin-password': password } }

  function handleLogin() {
    if (!password.trim()) { setAuthError('Entrez le mot de passe'); return }
    // We'll verify on first API call; optimistically set authed
    setAuthed(true)
    setAuthError('')
  }

  async function loadTopics(task: TaskType) {
    setLoadingList(true)
    try {
      const res = await fetch(`/api/topics?task=${task}`)
      const data = await res.json()
      setTopics(data.topics ?? [])
    } finally { setLoadingList(false) }
  }

  function handleTabSwitch(t: 'add' | 'import' | 'list') {
    setTab(t)
    if (t === 'list') loadTopics(listTask)
  }

  // ── ADD ──
  function updateIdea(side: 'pour' | 'contre', i: number, field: keyof IdeaInput, val: string) {
    const arr = [...form[side]] as IdeaInput[]
    arr[i] = { ...arr[i], [field]: val }
    setForm({ ...form, [side]: arr })
  }
  function addIdea(side: 'pour' | 'contre') {
    setForm({ ...form, [side]: [...(form[side] as IdeaInput[]), emptyIdea()] })
  }
  function removeIdea(side: 'pour' | 'contre', i: number) {
    const arr = (form[side] as IdeaInput[]).filter((_, idx) => idx !== i)
    setForm({ ...form, [side]: arr })
  }

  async function handleAddSubmit() {
    if (!form.question.trim() || !form.theme.trim()) {
      setSubmitMsg({ type: 'err', text: 'Câu hỏi và chủ đề là bắt buộc.' }); return
    }
    setSubmitting(true); setSubmitMsg(null)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          taskType,
          topics: [{
            question: form.question.trim(), theme: form.theme.trim(),
            difficulty: form.difficulty,
            pour: form.pour.filter(i => i.idea.trim()),
            contre: form.contre.filter(i => i.idea.trim()),
            sampleOpinion: form.sampleOpinion.trim(),
          }]
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitMsg({ type: 'ok', text: `✅ Sujet ajouté ! (${data.inserted} inséré)` })
      setForm(defaultForm())
    } catch (e: any) {
      setSubmitMsg({ type: 'err', text: `❌ ${e.message}` })
    } finally { setSubmitting(false) }
  }

  // ── IMPORT ──
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setJsonFile(file)
    const text = await file.text()
    setJsonText(text)
  }

  async function handleImport() {
    if (!jsonText.trim()) { setImportResult({ error: 'Paste JSON hoặc chọn file trước.' }); return }
    let parsed: any
    try { parsed = JSON.parse(jsonText) } catch { setImportResult({ error: 'JSON không hợp lệ.' }); return }
    setImporting(true); setImportResult(null)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()
      setImportResult(data)
    } catch (e: any) {
      setImportResult({ error: e.message })
    } finally { setImporting(false) }
  }

  // ── LIST ──
  async function handleDelete(id: string) {
    if (!confirm('Xóa sujet này? Không thể hoàn tác.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/delete?id=${id}`, { method: 'DELETE', headers: authHeader() })
      setTopics(prev => prev.filter(t => t.id !== id))
    } finally { setDeletingId(null) }
  }

  async function handleToggle(id: string, current: boolean) {
    await fetch('/api/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ id, isActive: !current }),
    })
    setTopics(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t))
  }

  // ── LOGIN SCREEN ──
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>TCF Admin</h1>
            <p style={{ color: '#475569', fontSize: '14px' }}>Accès réservé</p>
          </div>
          <div style={{ background: '#111827', borderRadius: '16px', padding: '24px', border: '1px solid #1f2937' }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Mot de passe"
              style={{ ...iStyle, marginBottom: '12px', fontSize: '16px' }}
            />
            {authError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '10px' }}>{authError}</p>}
            <button onClick={handleLogin} style={{ ...btnPrimary, width: '100%', padding: '12px', fontSize: '15px' }}>
              Entrer →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN APP ──
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0' }}>
      {/* Top bar */}
      <div style={{ background: '#0d1424', borderBottom: '1px solid #1e293b', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚙️</span>
          <span style={{ fontWeight: 800, fontSize: '16px', color: '#f8fafc', letterSpacing: '-0.3px' }}>TCF Admin</span>
          <span style={{ background: '#1e3a5f', color: '#60a5fa', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>BETA</span>
        </div>
        <button onClick={() => setAuthed(false)} style={{ background: 'transparent', border: '1px solid #334155', color: '#64748b', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
          Déconnexion
        </button>
      </div>

      {/* Task type switcher */}
      <div style={{ background: '#0d1424', borderBottom: '1px solid #1e293b', padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', maxWidth: '720px', margin: '0 auto' }}>
          {(['tache2', 'tache3'] as const).map(t => (
            <button key={t} onClick={() => setTaskType(t)}
              style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1.5px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.15s',
                borderColor: taskType === t ? '#3b82f6' : '#1e293b',
                background: taskType === t ? '#1e3a5f' : '#111827',
                color: taskType === t ? '#60a5fa' : '#475569',
              }}>
              {t === 'tache2' ? '🎤 Tâche 2' : '🗣️ Tâche 3'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0a0f1e' }}>
        {([['add', '➕ Ajouter'], ['import', '📦 Import JSON'], ['list', '📋 Liste']] as const).map(([t, label]) => (
          <button key={t} onClick={() => handleTabSwitch(t as any)}
            style={{ flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', background: 'transparent',
              color: tab === t ? '#38bdf8' : '#475569',
              borderBottom: tab === t ? '2px solid #38bdf8' : '2px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* ══ ADD TAB ══ */}
        {tab === 'add' && (
          <div>
            <Sec title="❓ Question / Sujet">
              <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
                placeholder="Ex: Pensez-vous que les voitures électriques sont l'avenir du transport ?"
                rows={3} style={taStyle} />
            </Sec>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <Label>🏷 Thème</Label>
                <input value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })}
                  placeholder="Ex: Environnement, Technologie…" style={iStyle} />
              </div>
              <div>
                <Label>📊 Niveau</Label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['B1', 'B2'] as const).map(d => (
                    <button key={d} onClick={() => setForm({ ...form, difficulty: d })}
                      style={{ padding: '10px 16px', borderRadius: '10px', border: '1.5px solid', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                        borderColor: form.difficulty === d ? (d === 'B2' ? '#8b5cf6' : '#38bdf8') : '#1e293b',
                        background: form.difficulty === d ? (d === 'B2' ? '#1e0d3d' : '#0c2a4a') : '#111827',
                        color: form.difficulty === d ? (d === 'B2' ? '#a78bfa' : '#38bdf8') : '#475569',
                      }}>{d}</button>
                  ))}
                </div>
              </div>
            </div>

            <Sec title="✅ Idées POUR">
              {form.pour.map((idea, i) => (
                <IdeaRow key={i} idea={idea} index={i} canRemove={form.pour.length > 1}
                  onChange={(f, v) => updateIdea('pour', i, f, v)} onRemove={() => removeIdea('pour', i)} />
              ))}
              <DashedBtn onClick={() => addIdea('pour')}>+ Ajouter idée POUR</DashedBtn>
            </Sec>

            <Sec title="❌ Idées CONTRE">
              {form.contre.map((idea, i) => (
                <IdeaRow key={i} idea={idea} index={i} canRemove={form.contre.length > 1}
                  onChange={(f, v) => updateIdea('contre', i, f, v)} onRemove={() => removeIdea('contre', i)} />
              ))}
              <DashedBtn onClick={() => addIdea('contre')}>+ Ajouter idée CONTRE</DashedBtn>
            </Sec>

            <Sec title="💬 Opinion modèle (optionnel)">
              <textarea value={form.sampleOpinion} onChange={e => setForm({ ...form, sampleOpinion: e.target.value })}
                placeholder="Ex: À mon avis, les voitures électriques représentent une solution prometteuse…"
                rows={3} style={taStyle} />
            </Sec>

            {submitMsg && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '14px', fontWeight: 500,
                background: submitMsg.type === 'ok' ? '#052e16' : '#450a0a',
                color: submitMsg.type === 'ok' ? '#4ade80' : '#f87171',
              }}>{submitMsg.text}</div>
            )}
            <button onClick={handleAddSubmit} disabled={submitting} style={{ ...btnPrimary, width: '100%', padding: '14px', fontSize: '15px', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? '⏳ Enregistrement…' : '💾 Enregistrer le sujet'}
            </button>
          </div>
        )}

        {/* ══ IMPORT TAB ══ */}
        {tab === 'import' && (
          <div>
            <div style={{ background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: '#60a5fa', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>📋 Format JSON attendu</p>
              <pre style={{ fontSize: '11px', color: '#94a3b8', overflow: 'auto', lineHeight: 1.6, maxHeight: '200px' }}>
                {JSON.stringify(JSON_TEMPLATE, null, 2)}
              </pre>
              <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(JSON_TEMPLATE, null, 2)) }}
                style={{ marginTop: '10px', background: '#1e3a5f', border: 'none', color: '#60a5fa', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                📋 Copier le template
              </button>
            </div>

            <Sec title="📂 Upload fichier JSON">
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed #1e3a5f', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
                  background: jsonFile ? '#0d1f35' : '#0d1424' }}>
                <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
                <p style={{ color: jsonFile ? '#60a5fa' : '#475569', fontSize: '14px', fontWeight: 600 }}>
                  {jsonFile ? `✓ ${jsonFile.name}` : 'Cliquer pour choisir un fichier .json'}
                </p>
              </div>
            </Sec>

            <Sec title="✏️ Ou coller le JSON directement">
              <textarea value={jsonText} onChange={e => setJsonText(e.target.value)}
                placeholder={'{\n  "taskType": "tache3",\n  "topics": [...]\n}'}
                rows={10} style={{ ...taStyle, fontFamily: 'monospace', fontSize: '12px' }} />
            </Sec>

            {importResult && (
              <div style={{ padding: '14px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px',
                background: importResult.error ? '#450a0a' : '#052e16',
                color: importResult.error ? '#f87171' : '#4ade80', border: `1px solid ${importResult.error ? '#7f1d1d' : '#14532d'}` }}>
                {importResult.error ? `❌ ${importResult.error}` : (
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: '6px' }}>✅ Import terminé — {importResult.inserted} sujet(s) ajouté(s)</p>
                    {importResult.errors?.length > 0 && (
                      <div>
                        <p style={{ color: '#fbbf24', marginBottom: '4px' }}>⚠️ {importResult.errors.length} erreur(s) :</p>
                        {importResult.errors.map((e: string, i: number) => <p key={i} style={{ color: '#fcd34d', fontSize: '12px' }}>• {e}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button onClick={handleImport} disabled={importing || !jsonText.trim()}
              style={{ ...btnPrimary, width: '100%', padding: '14px', fontSize: '15px', opacity: (importing || !jsonText.trim()) ? 0.5 : 1 }}>
              {importing ? '⏳ Import en cours…' : '🚀 Importer les sujets'}
            </button>
          </div>
        )}

        {/* ══ LIST TAB ══ */}
        {tab === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {(['tache2', 'tache3'] as const).map(t => (
                <button key={t} onClick={() => { setListTask(t); loadTopics(t) }}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1.5px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                    borderColor: listTask === t ? '#3b82f6' : '#1e293b',
                    background: listTask === t ? '#1e3a5f' : '#111827',
                    color: listTask === t ? '#60a5fa' : '#475569',
                  }}>
                  {t === 'tache2' ? '🎤 Tâche 2' : '🗣️ Tâche 3'}
                </button>
              ))}
            </div>

            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>⏳ Chargement…</div>
            ) : topics.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
                <p>Aucun sujet trouvé</p>
              </div>
            ) : (
              <div>
                <p style={{ color: '#475569', fontSize: '13px', marginBottom: '12px' }}>{topics.length} sujets au total</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topics.map(topic => (
                    <div key={topic.id} style={{ background: '#111827', borderRadius: '14px', padding: '14px 16px', border: `1px solid ${topic.is_active ? '#1e3a5f' : '#1f2937'}`, opacity: topic.is_active ? 1 : 0.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#f1f5f9', lineHeight: 1.4, flex: 1 }}>{topic.question}</p>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', flexShrink: 0,
                          background: topic.difficulty === 'B2' ? '#1e0d3d' : '#0c2a4a',
                          color: topic.difficulty === 'B2' ? '#a78bfa' : '#38bdf8',
                        }}>{topic.difficulty}</span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#475569' }}>🏷 {topic.theme}</p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleToggle(topic.id, topic.is_active)}
                          style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid #1e293b', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                            background: topic.is_active ? '#0c2a1a' : '#1f2937',
                            color: topic.is_active ? '#4ade80' : '#64748b',
                          }}>
                          {topic.is_active ? '✅ Actif' : '⏸ Inactif'}
                        </button>
                        <button onClick={() => handleDelete(topic.id)} disabled={deletingId === topic.id}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #450a0a', cursor: 'pointer', fontSize: '12px', background: '#1a0505', color: '#f87171', fontWeight: 600 }}>
                          {deletingId === topic.id ? '…' : '🗑'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      {children}
    </div>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</p>
}
function IdeaRow({ idea, index, onChange, onRemove, canRemove }: {
  idea: IdeaInput; index: number; canRemove: boolean
  onChange: (f: keyof IdeaInput, v: string) => void; onRemove: () => void
}) {
  return (
    <div style={{ background: '#0d1424', borderRadius: '12px', padding: '12px', marginBottom: '8px', border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>#{index + 1}</span>
        {canRemove && <button onClick={onRemove} style={{ background: '#450a0a', border: 'none', borderRadius: '6px', color: '#f87171', padding: '1px 8px', cursor: 'pointer', fontSize: '12px' }}>✕</button>}
      </div>
      <input value={idea.idea} onChange={e => onChange('idea', e.target.value)} placeholder="Idée principale…" style={{ ...iStyle, marginBottom: '6px' }} />
      <input value={idea.example} onChange={e => onChange('example', e.target.value)} placeholder="Exemple ou phrase modèle (optionnel)…" style={{ ...iStyle, color: '#64748b', fontSize: '13px' }} />
    </div>
  )
}
function DashedBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px dashed #1e293b', background: 'transparent', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
      {children}
    </button>
  )
}

const iStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #1e293b', background: '#0d1424', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
const taStyle: React.CSSProperties = { ...iStyle, resize: 'vertical', lineHeight: 1.6 }
const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }
