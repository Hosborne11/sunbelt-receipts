import { useEffect, useMemo, useState } from 'react'
import { supabase, BUCKET, TABLE } from './supabase'
import { money, shortDate } from './image'

export default function Office() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!ready) return <div className="wrap"><div className="empty">Loading…</div></div>
  return session ? <Queue session={session} /> : <SignIn />
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')

  async function send(e) {
    e.preventDefault()
    if (!email.trim()) return
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + '/office' },
    })
    setState(error ? 'error' : 'sent')
  }

  return (
    <div className="wrap narrow">
      <header><h1><span className="stripe" aria-hidden="true" />Receipts office</h1></header>
      <form onSubmit={send} noValidate>
        <div>
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="submit" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>
      </form>
      {state === 'sent' && <div className="notice">Check your email and tap the link to sign in.</div>}
      {state === 'error' && <div className="notice err">That email doesn’t have office access. Ask an admin to add it in Supabase.</div>}
    </div>
  )
}

function Queue({ session }) {
  const [rows, setRows] = useState([])
  const [urls, setUrls] = useState({})
  const [filter, setFilter] = useState('new')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(500)
    setLoading(false)
    if (error) return setError('Couldn’t load receipts. Refresh the page to try again.')
    setRows(data)
    if (data.length === 0) setError('')
    const paths = data.map((r) => r.file_path)
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60)
      const map = {}
      ;(signed || []).forEach((s) => { if (s.signedUrl) map[s.path] = s.signedUrl })
      setUrls(map)
    }
  }

  useEffect(() => { load() }, [])

  async function toggle(r) {
    const next = r.status === 'entered' ? 'new' : 'entered'
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: next } : x)))
    const { error } = await supabase.from(TABLE)
      .update({ status: next, entered_at: next === 'entered' ? new Date().toISOString() : null })
      .eq('id', r.id)
    if (error) {
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: r.status } : x)))
      setError('Couldn’t update that receipt. Try again.')
    }
  }

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter((r) =>
      (filter === 'all' || (filter === 'new' ? r.status !== 'entered' : r.status === 'entered')) &&
      (!term || [r.vendor, r.job, r.submitted_by, r.category, r.department, r.note].some((v) => v && v.toLowerCase().includes(term)))
    )
  }, [rows, filter, q])

  const total = shown.reduce((s, r) => s + Number(r.amount), 0)

  function exportCsv() {
    const head = ['Date', 'Vendor', 'Amount', 'Job', 'Category', 'Department', 'Submitted by', 'Notes / phase', 'Status', 'Uploaded']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = shown.map((r) => [r.receipt_date, r.vendor, r.amount, r.job, r.category, r.department, r.submitted_by, r.note, r.status, r.created_at].map(esc).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="wrap wide">
      <header>
        <h1><span className="stripe" aria-hidden="true" />Crew receipts</h1>
        <div className="who">{session.user.email}<br /><button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button></div>
      </header>

      <div className="toolbar">
        <div className="tabs">
          {[['new', 'Needs entry'], ['entered', 'Entered'], ['all', 'All']].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        <input className="search" placeholder="Search vendor, job, name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="summary">
        <span>{shown.length} receipt{shown.length === 1 ? '' : 's'}, {money(total)}</span>
        <span>
          <button className="link" onClick={load}>Refresh</button>
          <button className="link" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
        </span>
      </div>
      {error && <div className="notice err" role="alert">{error}</div>}

      <div className="list">
        {loading && <div className="empty">Loading…</div>}
        {!loading && shown.length === 0 && (
          <div className="empty">{filter === 'new' ? 'Nothing waiting. New receipts from the crew show up here.' : 'No receipts match.'}</div>
        )}
        {shown.map((r) => {
          const url = urls[r.file_path]
          return (
            <div className="item" key={r.id}>
              <a className="thumb" href={url || undefined} target="_blank" rel="noopener noreferrer" aria-label={`Open receipt from ${r.vendor}`}>
                {r.file_type === 'application/pdf' ? 'PDF' : url ? <img src={url} alt="" loading="lazy" /> : '…'}
              </a>
              <div className="meta">
                <div className="top"><span className="amt">{money(r.amount)}</span><span className="vendor">{r.vendor}</span></div>
                <div className="sub">{[shortDate(r.receipt_date), r.job, r.category, r.department && r.department !== 'N/A' ? r.department : null, r.submitted_by].filter(Boolean).join(', ')}</div>
                {r.note && <div className="sub">{r.note}</div>}
              </div>
              <button type="button" className={'pill ' + (r.status === 'entered' ? 'done' : 'new')} onClick={() => toggle(r)}>
                {r.status === 'entered' ? 'Entered' : 'Mark entered'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
