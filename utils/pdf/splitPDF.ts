import { PDFDocument } from 'pdf-lib'

export async function splitPdfIntoPages(file: File) {
  const bytes = await file.arrayBuffer()
  const pdf = await PDFDocument.load(bytes)
  const pageCount = pdf.getPageCount()

  const pages: { pageNumber: number; blob: Blob }[] = []

  for (let i = 0; i < pageCount; i++) {
    const newPdf = await PDFDocument.create()
    const [page] = await newPdf.copyPages(pdf, [i])
    newPdf.addPage(page)

    const pdfBytes = await newPdf.save()
    pages.push({
      pageNumber: i + 1,
      blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    })
  }

  return pages
}
