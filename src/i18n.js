// Crew screen text in English and Spanish. Category values are saved in English
// so office reports stay consistent; only the labels change.
export const CATEGORIES = ['Materials', 'Fuel', 'Tools & supplies', 'Equipment rental', 'Repairs & parts', 'Meals', 'Lodging', 'Other']

const en = {
  title: 'Receipts',
  snap: 'Take a photo of the receipt',
  snapHint: 'Lay it flat, fill the frame',
  pick: 'Choose from photos or files',
  retake: 'Retake',
  pdfAttached: 'PDF attached',
  reading: 'Reading the receipt… (the first time takes a little longer)',
  readDone: 'Filled in from the photo. Check it before sending.',
  readFail: 'Couldn’t read everything on this receipt. Fill in the details below.',
  total: 'Total', date: 'Date', vendor: 'Where from', vendorPh: 'e.g. Ferguson, Home Depot, QT',
  job: 'Job', jobPh: 'Job name or number', category: 'What was it for',
  note: 'Note', notePh: 'Anything the office should know',
  name: 'Your name', namePh: 'First and last',
  upload: 'Upload receipt', uploading: 'Uploading…', uploaded: 'Receipt uploaded',
  sentTitle: 'Sent from this phone', sentEmpty: 'Nothing sent yet. Receipts you upload show up here.', sent: 'Sent',
  autoTag: 'from photo',
  errPhoto: 'Add a photo of the receipt first.',
  errName: 'Enter your name so the office knows who sent it.',
  errTotal: 'Enter the receipt total.',
  errVendor: 'Enter where the purchase was made.',
  errOffline: 'No signal right now. Keep this screen open and tap Upload receipt once you’re back online.',
  errType: 'That file type can’t be uploaded. Use a photo (JPG or PNG) or a PDF.',
  errSize: 'That file is over 20 MB. Take a new photo instead.',
  errUpload: 'The upload didn’t go through. Check your signal and tap Upload receipt again.',
  cats: {},
}

const es = {
  title: 'Recibos',
  snap: 'Tomar foto del recibo',
  snapHint: 'Póngalo plano y que llene la pantalla',
  pick: 'Elegir de fotos o archivos',
  retake: 'Tomar otra',
  pdfAttached: 'PDF adjunto',
  reading: 'Leyendo el recibo… (la primera vez tarda un poco más)',
  readDone: 'Datos llenados desde la foto. Revíselos antes de enviar.',
  readFail: 'No se pudo leer todo el recibo. Llene los datos abajo.',
  total: 'Total', date: 'Fecha', vendor: 'Dónde se compró', vendorPh: 'Ej.: Ferguson, Home Depot, QT',
  job: 'Obra', jobPh: 'Nombre o número de la obra', category: 'Para qué fue',
  note: 'Nota', notePh: 'Algo que la oficina deba saber',
  name: 'Su nombre', namePh: 'Nombre y apellido',
  upload: 'Enviar recibo', uploading: 'Enviando…', uploaded: 'Recibo enviado',
  sentTitle: 'Enviados desde este teléfono', sentEmpty: 'Todavía no ha enviado nada. Los recibos que envíe aparecen aquí.', sent: 'Enviado',
  autoTag: 'de la foto',
  errPhoto: 'Primero agregue una foto del recibo.',
  errName: 'Escriba su nombre para que la oficina sepa quién lo envió.',
  errTotal: 'Escriba el total del recibo.',
  errVendor: 'Escriba dónde se hizo la compra.',
  errOffline: 'No hay señal. Deje esta pantalla abierta y toque Enviar recibo cuando vuelva la señal.',
  errType: 'Ese tipo de archivo no se puede enviar. Use una foto (JPG o PNG) o un PDF.',
  errSize: 'El archivo pesa más de 20 MB. Tome otra foto.',
  errUpload: 'No se pudo enviar. Revise la señal y toque Enviar recibo otra vez.',
  cats: {
    'Materials': 'Materiales', 'Fuel': 'Combustible', 'Tools & supplies': 'Herramientas y suministros',
    'Equipment rental': 'Renta de equipo', 'Repairs & parts': 'Reparaciones y repuestos',
    'Meals': 'Comidas', 'Lodging': 'Hospedaje', 'Other': 'Otro',
  },
}

export const strings = { en, es }
export const defaultLang = () => (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en'
