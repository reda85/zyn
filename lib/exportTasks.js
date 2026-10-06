import { photoThumbUrl } from './images'

const taskId = (pin) => `${pin.projects?.project_number}-${pin.pin_number}`
const frDate = (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : '')

function download(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  window.URL.revokeObjectURL(url)
}

/** Export simple : une ligne par tâche. Les bibliothèques sont chargées à la demande. */
export async function exportTasksToExcel(pins) {
  const XLSX = await import('xlsx')
  const data = pins.map((pin) => ({
    Nom: pin.name || 'Pin sans nom',
    ID: taskId(pin),
    'Assigné à': pin.assigned_to?.name || '',
    Catégorie: pin.categories?.name || '',
    Échéance: frDate(pin.due_date),
    Localisation: pin.pdf_name || '',
    Description: pin.note || '',
    'Date de création': frDate(pin.created_at),
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tâches')
  XLSX.writeFile(wb, 'liste-des-taches.xlsx')
}

/** Export avec photos incrustées : une ligne par photo. `pins` doit contenir `pins_photos`. */
export async function exportTasksWithMediaToExcel(pins) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Pins & Médias')
  sheet.columns = [
    { header: 'Nom pin', key: 'name', width: 25 },
    { header: 'ID pin', key: 'id', width: 15 },
    { header: 'Assigné à', key: 'assignee', width: 20 },
    { header: 'Catégorie', key: 'category', width: 20 },
    { header: 'Échéance', key: 'due', width: 15 },
    { header: 'Description', key: 'note', width: 40 },
    { header: 'Plan', key: 'plan', width: 20 },
    { header: 'Média', key: 'media', width: 25 },
  ]

  for (const pin of pins) {
    const medias = pin.pins_photos?.length ? pin.pins_photos : [null]
    for (const media of medias) {
      const row = sheet.addRow({
        name: pin.name || 'Pin sans nom',
        id: taskId(pin),
        assignee: pin.assigned_to?.name || '',
        category: pin.categories?.name || '',
        due: frDate(pin.due_date),
        note: pin.note || '',
        plan: pin.pdf_name || '',
      })
      row.height = 90
      if (!media?.public_url) continue
      try {
        // L'image est incrustée en 120×80 : inutile de télécharger l'original.
        const res = await fetch(photoThumbUrl(media, { width: 480 }))
        const buffer = await (await res.blob()).arrayBuffer()
        const imageId = workbook.addImage({ buffer, extension: 'jpeg' })
        sheet.addImage(imageId, {
          tl: { col: 7, row: row.number - 1 },
          ext: { width: 120, height: 80 },
        })
      } catch (err) {
        console.error('Image fetch failed', err)
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'pins-medias-avec-images.xlsx'
  )
}
