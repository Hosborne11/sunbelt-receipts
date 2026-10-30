// Free, on-phone receipt reading with Tesseract (no API key, no per-receipt cost).
// The first read downloads the text-recognition engine (a few MB); after that the
// phone keeps it cached.

let workerPromise = null
function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) => createWorker('eng'))
    workerPromise.catch(() => { workerPromise = null })
  }
  return workerPromise
}

export async function readReceipt(blob) {
  const worker = await getWorker()
  const { data } = await worker.recognize(blob)
  return parseReceipt(data.text || '')
}

// ---------- parsing ----------

// Vendors crews commonly use, with the category they usually mean.
const VENDORS = [
  [/home\s*depot/i, 'Home Depot', 'Tools & supplies'],
  [/lowe'?s/i, 'Lowe’s', 'Tools & supplies'],
  [/ferguson/i, 'Ferguson', 'Materials'],
  [/core\s*&?\s*main/i, 'Core & Main', 'Materials'],
  [/hd\s*supply/i, 'HD Supply', 'Materials'],
  [/consolidated\s*pipe/i, 'Consolidated Pipe', 'Materials'],
  [/fastenal/i, 'Fastenal', 'Tools & supplies'],
  [/grainger/i, 'Grainger', 'Tools & supplies'],
  [/harbor\s*freight/i, 'Harbor Freight', 'Tools & supplies'],
  [/tractor\s*supply/i, 'Tractor Supply', 'Tools & supplies'],
  [/walmart|wal-mart/i, 'Walmart', 'Tools & supplies'],
  [/sunbelt\s*rentals/i, 'Sunbelt Rentals', 'Equipment rental'],
  [/united\s*rentals/i, 'United Rentals', 'Equipment rental'],
  [/herc\s*rentals/i, 'Herc Rentals', 'Equipment rental'],
  [/advance\s*auto/i, 'Advance Auto Parts', 'Repairs & parts'],
  [/autozone|auto\s*zone/i, 'AutoZone', 'Repairs & parts'],
  [/o'?reilly/i, 'O’Reilly Auto Parts', 'Repairs & parts'],
  [/napa/i, 'NAPA', 'Repairs & parts'],
  [/quik\s*trip|quiktrip|\bQT\b/i, 'QuikTrip', 'Fuel'],
  [/sheetz/i, 'Sheetz', 'Fuel'],
  [/circle\s*k/i, 'Circle K', 'Fuel'],
  [/speedway/i, 'Speedway', 'Fuel'],
  [/murphy\s*(usa|express)/i, 'Murphy USA', 'Fuel'],
  [/love'?s\s*travel/i, 'Love’s', 'Fuel'],
  [/pilot|flying\s*j/i, 'Pilot Flying J', 'Fuel'],
  [/wawa/i, 'Wawa', 'Fuel'],
  [/exxon|mobil/i, 'Exxon', 'Fuel'],
  [/\bshell\b/i, 'Shell', 'Fuel'],
  [/\bbp\b/i, 'BP', 'Fuel'],
  [/marathon/i, 'Marathon', 'Fuel'],
  [/sunoco/i, 'Sunoco', 'Fuel'],
  [/valero/i, 'Valero', 'Fuel'],
  [/racetrac/i, 'RaceTrac', 'Fuel'],
  [/hampton\s*inn|holiday\s*inn|comfort\s*inn|la\s*quinta|marriott|hilton|best\s*western|motel/i, null, 'Lodging'],
  [/mcdonald|chick-?fil-?a|bojangles|subway|wendy'?s|burger\s*king|taco\s*bell|bojangle|zaxby|cook\s*out|waffle\s*house|chipotle|bbq|grill|diner|restaurant|cafe/i, null, 'Meals'],
]

const FUEL_WORDS = /\b(gallons?|gals?|unleaded|diesel|regular|premium|pump\s*#?\s*\d|price\/gal)\b/i
const MONEY = /\$?\s*(\d{1,3}(?:,\d{3})*|\d+)[.,](\d{2})\b/g

function amountsIn(line) {
  const out = []
  for (const m of line.matchAll(MONEY)) out.push(parseFloat(m[1].replace(/,/g, '') + '.' + m[2]))
  return out
}

function findTotal(lines) {
  const strong = /(grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*sale|total\s*amount|\btotal\b)/i
  const skip = /(sub\s*-?\s*total|tax|savings|discount|items?\s*sold|change|cash\s*back)/i
  // Prefer the last "total"-type line that has an amount (receipts list subtotal before total)
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]
    if (strong.test(l) && !skip.test(l)) {
      const a = amountsIn(l)
      if (a.length) return a[a.length - 1]
      const next = lines[i + 1] && amountsIn(lines[i + 1]) // amount sometimes wraps to next line
      if (next && next.length) return next[0]
    }
  }
  // Fall back to the largest amount that isn't cash tendered or change
  const noise = /(cash|tend|change|paid|visa|master|amex|card|auth|ref|acct)/i
  const all = lines.filter((l) => !noise.test(l)).flatMap(amountsIn).filter((n) => n > 0 && n < 100000)
  return all.length ? Math.max(...all) : null
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

function validDate(y, m, d) {
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, m - 1, d)
  const now = new Date()
  const ageDays = (now - dt) / 86400000
  if (ageDays < -1 || ageDays > 400) return null // not in the future, not over a year old
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function findDate(text) {
  let m
  const numeric = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g
  while ((m = numeric.exec(text))) { const r = validDate(+m[3], +m[1], +m[2]); if (r) return r }
  const iso = /\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g
  while ((m = iso.exec(text))) { const r = validDate(+m[1], +m[2], +m[3]); if (r) return r }
  const words = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})\b/gi
  while ((m = words.exec(text))) { const r = validDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]); if (r) return r }
  return null
}

export function parseReceipt(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let vendor = null, category = null
  for (const [re, name, cat] of VENDORS) {
    if (re.test(text)) { vendor = name; category = cat; break }
  }
  if (!category && FUEL_WORDS.test(text)) category = 'Fuel'
  const total = findTotal(lines)
  return {
    vendor,
    total: total && total > 0 ? Math.round(total * 100) / 100 : null,
    date: findDate(text),
    category,
  }
}
