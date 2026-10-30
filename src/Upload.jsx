import { useEffect, useRef, useState } from 'react'
import { supabase, BUCKET, TABLE } from './supabase'
import { prepareFile, money, shortDate, store } from './image'

const CATEGORIES = ['Materials', 'Fuel', 'Tools & supplies', 'Equipment rental', 'Repairs & parts', 'Meals', 'Lodging', 'Other']
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }

export default function Upload() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [name, setName] = useState(store.get('crewName', ''))
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [date, setDate] = useState(todayISO())
  const [job, setJob] = useState(store.get('lastJob', ''))
  const [category, setCategory] = useState('Materials')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [sent, setSent] = useState(store.get('sentReceipts', []))
  const cam = useRef(null)
  const pick = useRef(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function choose(f) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f || null)
    setPreview(f && f.type !== 'application/pdf' ? URL.createObjectURL(f) : '')
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''))
    if (!file) return setError('Add a photo of the receipt first.')
    if (!name.trim()) return setError('Enter your name so the office knows who sent it.')
    if (!(amt > 0)) return setError('Enter the receipt total.')
    if (!vendor.trim()) return setError('Enter where the purchase was made.')
    if (!navigator.onLine) return setError('No signal right now. Keep this screen open and tap Upload receipt once you’re back online.')

    setBusy(true); setError('')
    try {
      const { blob, type, ext } = await prepareFile(file)
      const month = new Date().toISOString().slice(0, 7)
      const path = `${month}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false })
      if (up.error) throw up.error
      const row = {
        submitted_by: name.trim(), amount: Math.round(amt * 100) / 100, vendor: vendor.trim(),
        receipt_date: date || null, job: job.trim() || null, category, note: note.trim() || null,
        file_path: path, file_type: type,
      }
      const ins = await supabase.from(TABLE).insert(row)
      if (ins.error) throw ins.error

      store.set('crewName', name.trim())
      if (job.trim()) store.set('lastJob', job.trim())
      const next = [{ amount: row.amount, vendor: row.vendor, date: row.receipt_date, job: row.job, at: Date.now() }, ...sent].slice(0, 25)
      setSent(next); store.set('sentReceipts', next)
      setAmount(''); setVendor(''); setNote(''); choose(null)
      setToast('Receipt uploaded'); setTimeout(() => setToast(''), 2600)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const msg = String(err?.message || '')
      setError(
        /unsupported/.test(msg) ? 'That file type can’t be uploaded. Use a photo (JPG or PNG) or a PDF.'
        : /size|large/i.test(msg) ? 'That file is over 20 MB. Take a new photo instead.'
        : 'The upload didn’t go through. Check your signal and tap Upload receipt again.'
      )
    } finally { setBusy(false) }
  }

  const jobs = [...new Set(sent.map((s) => s.job).filter(Boolean))]

  return (
    <div className="wrap">
      <header>
        <h1><span className="stripe" aria-hidden="true" />Receipts</h1>
        {name && <div className="who">{name}</div>}
      </header>

      {!file ? (
        <section className="capture">
          <button className="snap" type="button" onClick={() => cam.current.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.6" /></svg>
            Take a photo of the receipt
            <small>Lay it flat, fill the frame</small>
          </button>
          <button className="alt" type="button" onClick={() => pick.current.click()}>Choose from photos or files</button>
        </section>
      ) : (
        <div className="preview">
          {preview ? <img src={preview} alt="Receipt preview" /> : <div className="pdf">PDF attached: {file.name}</div>}
          <button type="button" onClick={() => choose(null)}>Retake</button>
        </div>
      )}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
      <input ref={pick} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />

      <form onSubmit={submit} noValidate>
        <div className="row">
          <div>
            <label htmlFor="amount">Total <span className="req">*</span></label>
            <div className="money"><span>$</span><input id="amount" inputMode="decimal" placeholder="0.00" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="vendor">Where from <span className="req">*</span></label>
          <input id="vendor" placeholder="e.g. Ferguson, Home Depot, QT" autoComplete="off" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <label htmlFor="job">Job</label>
          <input id="job" list="jobs" placeholder="Job name or number" autoComplete="off" value={job} onChange={(e) => setJob(e.target.value)} />
          <datalist id="jobs">{jobs.map((j) => <option key={j} value={j} />)}</datalist>
        </div>
        <div>
          <label htmlFor="category">What was it for</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="note">Note</label>
          <textarea id="note" placeholder="Anything the office should know" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div>
          <label htmlFor="name">Your name <span className="req">*</span></label>
          <input id="name" placeholder="First and last" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="submit" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload receipt'}</button>
      </form>
      {error && <div className="notice err" role="alert">{error}</div>}

      <h2>Sent from this phone</h2>
      <div className="list">
        {sent.length === 0 && <div className="empty">Nothing sent yet. Receipts you upload show up here.</div>}
        {sent.map((s) => (
          <div className="item compact" key={s.at}>
            <div className="meta">
              <div className="top"><span className="amt">{money(s.amount)}</span><span className="vendor">{s.vendor}</span></div>
              <div className="sub">{[shortDate(s.date), s.job].filter(Boolean).join(', ')}</div>
            </div>
            <span className="pill done">Sent</span>
          </div>
        ))}
      </div>
      <div className={'toast' + (toast ? ' show' : '')} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
