import React from 'react'
import { createRoot } from 'react-dom/client'
import Upload from './Upload.jsx'
import Office from './Office.jsx'
import './styles.css'

const isOffice = window.location.pathname.startsWith('/office')
createRoot(document.getElementById('root')).render(isOffice ? <Office /> : <Upload />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
