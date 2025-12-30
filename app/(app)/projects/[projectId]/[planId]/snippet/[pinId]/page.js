'use client'

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { X, Check, Scissors, ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react';
import { Lexend } from 'next/font/google';
import Image from 'next/image';

const inter = Lexend({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function SnippetPage({ params }) {
  const { projectId, planId, pinId } = params;
  const router = useRouter();

  const [plan, setPlan] = useState(null);
  const [pin, setPin] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  
  // États pour le snippet
  const [snippetImage, setSnippetImage] = useState(null);
  const [annotation, setAnnotation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });
  
  // États pour l'annotation graphique
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('text'); // 'text', 'arrow', 'pen'
  const [annotations, setAnnotations] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [color, setColor] = useState('#ec4899');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  
  const annotationCanvasRef = useRef(null);
  
  const containerRef = useRef(null);
  const pageRef = useRef(null);

  // Dimensions du rectangle fixe (en pourcentage du viewport)
  const RECT_WIDTH = 400;
  const RECT_HEIGHT = 300;

  // Charger le plan et le pin
  useEffect(() => {
    const fetchData = async () => {
      const { data: planData } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      const { data: pinData } = await supabase
        .from('pdf_pins')
        .select('*')
        .eq('id', pinId)
        .single();

      setPlan(planData);
      setPin(pinData);
    };

    fetchData();
  }, [planId, pinId]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const zoom = (factor) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Center of the viewport
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Convert center point to PDF coordinate space
    const pdfX = (centerX - offset.x) / scale;
    const pdfY = (centerY - offset.y) / scale;

    // Calculate new scale
    const newScale = Math.max(0.25, Math.min(scale * factor, 5));

    // Recalculate offset to keep center stable
    const newOffsetX = centerX - pdfX * newScale;
    const newOffsetY = centerY - pdfY * newScale;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const zoomIn = () => {
    zoom(1.5);
  };

  const zoomOut = () => {
    zoom(1 / 1.5);
  };

  const handleWheel = (event) => {
    event.preventDefault();
    if (event.deltaY > 0) {
      zoom(1 / 1.5);
    } else if (event.deltaY < 0) {
      zoom(1.5);
    }
  };

  const onMouseDown = (e) => {
    if (snippetImage) return;
    setDragging(true);
    setStartDrag({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  const onMouseMove = (e) => {
    if (!dragging || snippetImage) return;
    const dx = e.clientX - startDrag.x;
    const dy = e.clientY - startDrag.y;
    setStartDrag({ x: e.clientX, y: e.clientY });
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };

  const createSnippet = () => {
    if (!pageRef.current || !containerRef.current) return;

    const pdfCanvas = pageRef.current.querySelector('canvas');
    if (!pdfCanvas) return;

    // Position du conteneur et du PDF
    const containerRect = containerRef.current.getBoundingClientRect();
    const pdfRect = pageRef.current.getBoundingClientRect();

    // Centre du viewport
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Position du rectangle de sélection dans le viewport
    const rectLeft = centerX - RECT_WIDTH / 2;
    const rectTop = centerY - RECT_HEIGHT / 2;

    // Convertir en coordonnées du PDF canvas
    const pdfX = rectLeft - pdfRect.left;
    const pdfY = rectTop - pdfRect.top;

    // Vérifier que le rectangle est dans les limites du PDF
    if (pdfX < 0 || pdfY < 0 || 
        pdfX + RECT_WIDTH > pdfRect.width || 
        pdfY + RECT_HEIGHT > pdfRect.height) {
      alert('Le rectangle de sélection doit être entièrement sur le PDF');
      return;
    }

    // Créer le canvas pour le snippet
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    tempCanvas.width = RECT_WIDTH;
    tempCanvas.height = RECT_HEIGHT;

    ctx.drawImage(
      pdfCanvas,
      pdfX,
      pdfY,
      RECT_WIDTH,
      RECT_HEIGHT,
      0,
      0,
      RECT_WIDTH,
      RECT_HEIGHT
    );

    const snippetDataUrl = tempCanvas.toDataURL('image/png');
    setSnippetImage(snippetDataUrl);
  };

  const handleReset = () => {
    setSnippetImage(null);
    setAnnotation('');
    setAnnotations([]);
    setDrawMode('text');
  };

  const handleAnnotationCanvasMouseDown = (e) => {
    if (!annotationCanvasRef.current) return;
    
    const rect = annotationCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === 'text') {
      setShowTextInput(true);
      setTextPosition({ x, y });
      setTextInput('');
    } else if (drawMode === 'arrow' || drawMode === 'pen') {
      setIsDrawing(true);
      setCurrentDrawing({ type: drawMode, startX: x, startY: y, points: [{ x, y }] });
    }
  };

  const handleAnnotationCanvasMouseMove = (e) => {
    if (!isDrawing || !annotationCanvasRef.current) return;
    
    const rect = annotationCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === 'pen') {
      setCurrentDrawing(prev => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }));
    } else if (drawMode === 'arrow') {
      setCurrentDrawing(prev => ({
        ...prev,
        endX: x,
        endY: y
      }));
    }
  };

  const handleAnnotationCanvasMouseUp = () => {
    if (isDrawing && currentDrawing) {
      setAnnotations([...annotations, { ...currentDrawing, color }]);
      setCurrentDrawing(null);
    }
    setIsDrawing(false);
  };

  const addTextAnnotation = () => {
    if (textInput.trim()) {
      setAnnotations([...annotations, {
        type: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        color
      }]);
    }
    setShowTextInput(false);
    setTextInput('');
  };

  const renderAnnotations = (ctx, width, height) => {
    annotations.forEach(ann => {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (ann.type === 'text') {
        ctx.font = '16px Arial';
        ctx.fillText(ann.text, ann.x, ann.y);
      } else if (ann.type === 'pen') {
        ctx.beginPath();
        ann.points.forEach((point, idx) => {
          if (idx === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (ann.type === 'arrow') {
        // Draw arrow line
        ctx.beginPath();
        ctx.moveTo(ann.startX, ann.startY);
        ctx.lineTo(ann.endX, ann.endY);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(ann.endY - ann.startY, ann.endX - ann.startX);
        const headLength = 15;
        
        ctx.beginPath();
        ctx.moveTo(ann.endX, ann.endY);
        ctx.lineTo(
          ann.endX - headLength * Math.cos(angle - Math.PI / 6),
          ann.endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(ann.endX, ann.endY);
        ctx.lineTo(
          ann.endX - headLength * Math.cos(angle + Math.PI / 6),
          ann.endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    });

    // Render current drawing
    if (currentDrawing) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      if (currentDrawing.type === 'pen') {
        ctx.beginPath();
        currentDrawing.points.forEach((point, idx) => {
          if (idx === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (currentDrawing.type === 'arrow' && currentDrawing.endX) {
        ctx.beginPath();
        ctx.moveTo(currentDrawing.startX, currentDrawing.startY);
        ctx.lineTo(currentDrawing.endX, currentDrawing.endY);
        ctx.stroke();

        const angle = Math.atan2(currentDrawing.endY - currentDrawing.startY, currentDrawing.endX - currentDrawing.startX);
        const headLength = 15;
        
        ctx.beginPath();
        ctx.moveTo(currentDrawing.endX, currentDrawing.endY);
        ctx.lineTo(
          currentDrawing.endX - headLength * Math.cos(angle - Math.PI / 6),
          currentDrawing.endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(currentDrawing.endX, currentDrawing.endY);
        ctx.lineTo(
          currentDrawing.endX - headLength * Math.cos(angle + Math.PI / 6),
          currentDrawing.endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    if (snippetImage && annotationCanvasRef.current) {
      const canvas = annotationCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        renderAnnotations(ctx, img.width, img.height);
      };
      
      img.src = snippetImage;
    }
  }, [snippetImage, annotations, currentDrawing]);

  const finalizeAnnotatedImage = () => {
    if (!annotationCanvasRef.current) return snippetImage;
    return annotationCanvasRef.current.toDataURL('image/png');
  };

  const handleSave = async () => {
    if (!snippetImage || !pin) return;
    
    setIsSaving(true);

    try {
      // Get the final annotated image
      const finalImage = finalizeAnnotatedImage();
      const blob = await fetch(finalImage).then(r => r.blob());
      
      const fileName = `snippet_${pin.id}_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pinphotos')
        .upload(fileName, blob, {
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      const { data: photoData, error: photoError } = await supabase
        .from('pins_photos')
        .insert({
          pin_id: pin.id,
          public_url: uploadData.path,
          project_id: projectId,
          description: annotation || 'Snippet du plan'
          
        })
        .select()
        .single();

      if (photoError) throw photoError;

      router.push(`/projects/${projectId}/${planId}`);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du snippet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!plan || !pin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
              <Image src="/logo_blanc.png" alt="Logo" width={52} height={52} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Chargement...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} h-screen flex flex-col bg-gray-50`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="hover:bg-gray-100 rounded-full p-2 text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-pink-100 rounded-full p-2">
                <Scissors className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {snippetImage ? 'Annoter le snippet' : 'Créer un snippet'}
                </h1>
                <p className="text-sm text-gray-500">
                  {snippetImage ? 'Ajoutez une annotation à votre snippet' : 'Ajustez la vue et créez le snippet'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            {snippetImage && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-pink-500 text-white hover:bg-pink-600 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Ajouter au pin
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!snippetImage ? (
          // Vue de sélection PDF avec rectangle fixe
          <div 
            ref={containerRef}
            className="relative w-full h-full overflow-hidden bg-gray-100"
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseUp}
            onWheel={handleWheel}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            {/* Floating Controls */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
              <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <button
                  onClick={zoomOut}
                  className="p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-5 w-5 text-gray-700" />
                </button>
                <div className="px-4 text-sm font-medium text-gray-700 border-r border-gray-200">
                  {Math.round(scale * 100)}%
                </div>
                <button
                  onClick={zoomIn}
                  className="p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              <div className="flex items-center bg-white rounded-lg shadow-lg px-4 py-2.5 border border-gray-200">
                <button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                  className="px-2 py-1 text-sm hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="px-3 text-sm font-medium text-gray-900">
                  Page {pageNumber} / {numPages || '?'}
                </span>
                <button
                  onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                  disabled={pageNumber >= numPages}
                  className="px-2 py-1 text-sm hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>

            {/* Create Snippet Button */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
              <button
                onClick={createSnippet}
                className="px-6 py-3 bg-pink-500 text-white hover:bg-pink-600 rounded-lg shadow-lg flex items-center gap-2 transition-colors font-medium"
              >
                <Scissors size={20} />
                Créer le snippet
              </button>
            </div>

            {/* PDF avec pan/zoom */}
            <div
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'top left',
                width: 'fit-content',
                margin: 'auto',
                position: 'relative',
                transition: dragging ? 'none' : 'transform 0.2s ease',
              }}
            >
              <div ref={pageRef}>
                <Document
                  file={supabase.storage.from('project-plans').getPublicUrl(plan.file_url).data.publicUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                >
                  <Page 
                    pageNumber={pageNumber} 
                    scale={4}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={({ width, height }) => {
                      setPdfSize({ width, height });
                    }}
                  />
                </Document>
              </div>
            </div>

            {/* Rectangle de sélection fixe au centre */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: RECT_WIDTH,
                height: RECT_HEIGHT,
                border: '3px solid #ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
                zIndex: 10,
              }}
            >
              {/* Coins du rectangle pour meilleure visibilité */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-pink-500"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-pink-500"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-pink-500"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-pink-500"></div>
            </div>

            {/* Instructions */}
            <div className="absolute top-6 right-6 bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Instructions</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Glissez pour déplacer le PDF</li>
                <li>• Utilisez les boutons ou la molette pour zoomer</li>
                <li>• Ajustez la vue pour capturer la zone souhaitée</li>
                <li>• Cliquez sur "Créer le snippet"</li>
              </ul>
            </div>
          </div>
        ) : (
          // Vue d'annotation
          <div className="max-w-6xl mx-auto p-6 space-y-6 overflow-auto h-full">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Annoter le snippet</h3>
                
                {/* Annotation Tools */}
                <div className="flex items-center gap-2">
                  {/* Draw Mode Selector */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                    <button
                      onClick={() => setDrawMode('text')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        drawMode === 'text' 
                          ? 'bg-white text-gray-900 shadow' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Texte
                    </button>
                    <button
                      onClick={() => setDrawMode('arrow')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        drawMode === 'arrow' 
                          ? 'bg-white text-gray-900 shadow' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Flèche
                    </button>
                    <button
                      onClick={() => setDrawMode('pen')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        drawMode === 'pen' 
                          ? 'bg-white text-gray-900 shadow' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Dessin
                    </button>
                  </div>

                  {/* Color Picker */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                    <span className="text-sm text-gray-600">Couleur:</span>
                    {['#ec4899', '#ef4444', '#3b82f6', '#10b981', '#000000'].map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          color === c ? 'border-gray-900 scale-110' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  {/* Undo Button */}
                  <button
                    onClick={() => setAnnotations(annotations.slice(0, -1))}
                    disabled={annotations.length === 0}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 rounded-lg"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {/* Canvas Container */}
              <div className="border rounded-lg bg-gray-50 flex justify-center p-4 relative">
                <div className="relative">
                  <canvas
                    ref={annotationCanvasRef}
                    onMouseDown={handleAnnotationCanvasMouseDown}
                    onMouseMove={handleAnnotationCanvasMouseMove}
                    onMouseUp={handleAnnotationCanvasMouseUp}
                    onMouseLeave={handleAnnotationCanvasMouseUp}
                    className="max-w-full max-h-[500px] object-contain cursor-crosshair"
                    style={{ display: 'block' }}
                  />
                  
                  {/* Text Input Overlay */}
                  {showTextInput && (
                    <div
                      className="absolute bg-white border-2 border-pink-500 rounded shadow-lg p-2"
                      style={{
                        left: textPosition.x,
                        top: textPosition.y,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addTextAnnotation();
                          if (e.key === 'Escape') setShowTextInput(false);
                        }}
                        placeholder="Saisir le texte..."
                        className="px-2 py-1 text-sm border-none outline-none min-w-[150px]"
                        autoFocus
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={addTextAnnotation}
                          className="px-2 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setShowTextInput(false)}
                          className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {drawMode === 'text' && 'Cliquez pour ajouter du texte'}
                {drawMode === 'arrow' && 'Cliquez et glissez pour dessiner une flèche'}
                {drawMode === 'pen' && 'Cliquez et glissez pour dessiner'}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Description (optionnelle)
              </label>
              <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                placeholder="Ajoutez une description textuelle de ce snippet..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium"
              >
                Refaire la sélection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}