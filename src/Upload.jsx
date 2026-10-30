import { useEffect, useRef, useState } from 'react'
import { supabase, BUCKET, TABLE } from './supabase'
import { prepareFile, money, shortDate, store } from './image'
import { readReceipt } from './ocr'
import { strings, defaultLang, CATEGORIES } from './i18n'

const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }

export default function Upload() {
  const [lang, setLang] = useState(store.get('lang', defaultLang()))
  const t = strings[lang]
  const catLabel = (c) => t.cats[c] || c

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
  const [reading, setReading] = useState('idle') // idle | reading | done | fail
  const [auto, setAuto] = useState({})           // fields filled from the photo
  const touched = useRef({})                      // fields the person typed in
  const prepared = useRef(null)
  const readId = useRef(0)
  const cam = useRef(null)
  const pick = useRef(null)

  useEffect(() => { document.documentElement.lang = lang; document.title = t.title }, [lang])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function switchLang(l) { setLang(l); store.set('lang', l) }

  // Wrap a setter so typing in a field stops the photo from overwriting it
  const edit = (field, setter) => (e) => {
    touched.current[field] = true
    setAuto((a) => ({ ...a, [field]: false }))
    setter(e.target.value)
  }

  function resetForm() {
    touched.current = {}
    setAuto({})
    setAmount(''); setVendor(''); setNote(''); setDate(todayISO()); setCategory('Materials')
  }

  async function choose(f) {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f || null)
    setPreview(f && f.type !== 'application/pdf' ? URL.createObjectURL(f) : '')
    setError('')
    prepared.current = null
    const id = ++readId.current
    if (!f) { setReading('idle'); return }

    try {
      prepared.current = await prepareFile(f)
    } catch {
      setReading('idle'); return
    }
    if (id !== readId.current) return
    autofill(prepared.current, id)
  }

  async function autofill({ blob, type }, id) {
    if (type === 'application/pdf') return // on-phone reading works on photos only
    setReading('reading')
    try {
      const x = await readReceipt(blob)
      if (id !== readId.current) return

      const filled = {}
      const put = (field, value, setter, fmt = (v) => v) => {
        if (value == null || touched.current[field]) return
        setter(fmt(value)); filled[field] = true
      }
      put('amount', x.total, setAmount, (v) => v.toFixed(2))
      put('vendor', x.vendor, setVendor)
      put('date', x.date, setDate)
      put('category', x.category, setCategory)
      setAuto(filled)
      setReading(Object.keys(filled).length ? 'done' : 'fail')
    } catch {
      if (id === readId.current) setReading('fail')
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''))
    if (!file) return setError(t.errPhoto)
    if (!name.trim()) return setError(t.errName)
    if (!(amt > 0)) return setError(t.errTotal)
    if (!vendor.trim()) return setError(t.errVendor)
    if (!navigator.onLine) return setError(t.errOffline)

    setBusy(true); setError('')
    try {
      const { blob, type, ext } = prepared.current || await prepareFile(file)
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
      resetForm(); choose(null)
      setToast(t.uploaded); setTimeout(() => setToast(''), 2600)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const msg = String(err?.message || '')
      setError(/unsupported/.test(msg) ? t.errType : /size|large/i.test(msg) ? t.errSize : t.errUpload)
    } finally { setBusy(false) }
  }

  const jobs = [...new Set(sent.map((s) => s.job).filter(Boolean))]
  const isReading = reading === 'reading'
  const fieldCls = (f) => (isReading && !touched.current[f] ? 'loading' : auto[f] ? 'auto' : '')
  const Tag = ({ f }) => (auto[f] ? <span className="autotag">{t.autoTag}</span> : null)

  return (
    <div className="wrap">
      <header>
        <h1><span className="stripe" aria-hidden="true" />{t.title}</h1>
        <div className="lang" role="group" aria-label="Language / Idioma">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => switchLang('en')}>EN</button>
          <button type="button" aria-pressed={lang === 'es'} onClick={() => switchLang('es')}>ES</button>
        </div>
      </header>

      {!file ? (
        <section className="capture">
          <button className="snap" type="button" onClick={() => cam.current.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.6" /></svg>
            {t.snap}
            <small>{t.snapHint}</small>
          </button>
          <button className="alt" type="button" onClick={() => pick.current.click()}>{t.pick}</button>
        </section>
      ) : (
        <div className="preview">
          {preview ? <img src={preview} alt="" /> : <div className="pdf">{t.pdfAttached}: {file.name}</div>}
          <button type="button" onClick={() => { resetForm(); choose(null) }}>{t.retake}</button>
          {reading !== 'idle' && (
            <div className={'readbar ' + reading} role="status" aria-live="polite">
              {reading === 'reading' ? t.reading : reading === 'done' ? t.readDone : t.readFail}
            </div>
          )}
        </div>
      )}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
      <input ref={pick} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />

      <form onSubmit={submit} noValidate>
        <div className="row">
          <div className={fieldCls('amount')}>
            <label htmlFor="amount">{t.total} <span className="req">*</span><Tag f="amount" /></label>
            <div className="money"><span>$</span><input id="amount" inputMode="decimal" placeholder="0.00" autoComplete="off" value={amount} onChange={edit('amount', setAmount)} /></div>
          </div>
          <div className={fieldCls('date')}>
            <label htmlFor="date">{t.date}<Tag f="date" /></label>
            <input id="date" type="date" lang={lang} value={date} onChange={edit('date', setDate)} />
          </div>
        </div>
        <div className={fieldCls('vendor')}>
          <label htmlFor="vendor">{t.vendor} <span className="req">*</span><Tag f="vendor" /></label>
          <input id="vendor" placeholder={t.vendorPh} autoComplete="off" value={vendor} onChange={edit('vendor', setVendor)} />
        </div>
        <div>
          <label htmlFor="job">{t.job}</label>
          <input id="job" list="jobs" placeholder={t.jobPh} autoComplete="off" value={job} onChange={(e) => setJob(e.target.value)} />
          <datalist id="jobs">{jobs.map((j) => <option key={j} value={j} />)}</datalist>
        </div>
        <div className={fieldCls('category')}>
          <label htmlFor="category">{t.category}<Tag f="category" /></label>
          <select id="category" value={category} onChange={edit('category', setCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="note">{t.note}</label>
          <textarea id="note" placeholder={t.notePh} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div>
          <label htmlFor="name">{t.name} <span className="req">*</span></label>
          <input id="name" placeholder={t.namePh} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="submit" type="submit" disabled={busy}>{busy ? t.uploading : t.upload}</button>
      </form>
      {error && <div className="notice err" role="alert">{error}</div>}

      <h2>{t.sentTitle}</h2>
      <div className="list">
        {sent.length === 0 && <div className="empty">{t.sentEmpty}</div>}
        {sent.map((s) => (
          <div className="item compact" key={s.at}>
            <div className="meta">
              <div className="top"><span className="amt">{money(s.amount)}</span><span className="vendor">{s.vendor}</span></div>
              <div className="sub">{[shortDate(s.date), s.job].filter(Boolean).join(', ')}</div>
            </div>
            <span className="pill done">{t.sent}</span>
          </div>
        ))}
      </div>
      <div className={'toast' + (toast ? ' show' : '')} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
