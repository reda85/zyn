// app/api/upload-pdf/route.js
import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const projectId = formData.get('projectId')

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Seuls les fichiers PDF sont acceptés' },
        { status: 400 }
      )
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'La taille du fichier ne doit pas dépasser 50 MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Load PDF and get page count
    const pdfDoc = await PDFDocument.load(buffer)
    const pageCount = pdfDoc.getPageCount()

    if (pageCount === 0) {
      return NextResponse.json(
        { error: 'Le PDF ne contient aucune page' },
        { status: 400 }
      )
    }

    // Split PDF into individual pages
    const pages = []
    
    for (let i = 0; i < pageCount; i++) {
      // Create a new PDF for each page
      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i])
      newPdf.addPage(copiedPage)
      
      // Convert to bytes
      const pdfBytes = await newPdf.save()
      
      pages.push({
        pageNumber: i + 1,
        data: Buffer.from(pdfBytes).toString('base64'),
        size: pdfBytes.length
      })
    }

    return NextResponse.json({
      success: true,
      message: 'PDF traité avec succès',
      pageCount,
      fileName: file.name,
      fileSize: file.size,
      pages
    })

  } catch (error) {
    console.error('Erreur de traitement du PDF:', error)
    return NextResponse.json(
      { error: 'Échec du traitement du PDF: ' + error.message },
      { status: 500 }
    )
  }
}