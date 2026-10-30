// Shrinks phone photos (often 4-12 MB) to ~300-600 KB so uploads work on a weak signal.
export async function prepareFile(file) {
  if (file.type === 'application/pdf') return { blob: file, type: 'application/pdf', ext: 'pdf' }
  try {
    const bmp = await createImageBitmap(file)
    const max = 1800
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * s)
    c.height = Math.round(bmp.height * s)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82))
    if (blob) return { blob, type: 'image/jpeg', ext: 'jpg' }
  } catch (e) { /* fall through and send the original */ }
  const extByType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }
  if (extByType[file.type]) return { blob: file, type: file.type, ext: extByType[file.type] }
  throw new Error('unsupported')
}

export const money = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const shortDate = (s) => {
  if (!s) return ''
  const [, m, d] = s.split('-')
  return `${+m}/${+d}`
}

export const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v) } catch { return fallback } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } },
}
