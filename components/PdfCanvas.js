import React, { useState, useRef, use, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import {Anek_Devanagari, Cabin, Jost, Catamaran, Lato, Noto_Sans, Fira_Sans, Domine, Inconsolata, Karla, Maitree, Nanum_Gothic, Aleo, Figtree, Lexend} from 'next/font/google'
import { useAtom } from 'jotai';
import { categoriesAtom, filteredPinsAtom, focusOnPinAtom, pinsAtom, selectedPinAtom, selectedPlanAtom, selectedProjectAtom, statusesAtom } from '@/store/atoms';
import DrawerHeader from './DrawerHeader';
import DrawerFooter from './DrawerFooter';
import DrawerBody from './DrawerBody';
import MapPin from './MapPin';
import { Calendar, CalendarDaysIcon, GrabIcon, MapPinIcon, PointerIcon, ZoomIn, ZoomOut } from 'lucide-react';
import GhostPin from './GhostPin';
import { Stage, Layer, Rect, Image as KonvaImage, Line, Text } from 'react-konva';
import useImage from 'use-image';

import { supabase } from '@/utils/supabase/client';
import { classNames } from '@react-pdf-viewer/core';
import { useSearchParams } from 'next/navigation';
import { create } from 'domain';

const inter = Lexend({subsets: ['latin'], variable: '--font-inter', display: 'swap'});
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PinIcon({ size = 24, color = 'red' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: 'pointer', filter: 'drop-shadow(0 0 1px black)' }}
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}

function getDistance(touches) {
  if (touches.length < 2) return 0;
  const [t1, t2] = touches;
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}


export default function PdfCanvas({ fileUrl, onPinAdd, project, plan, user }) {
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom);
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.25);
  const [renderScale] = useState(3);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [statuses, setStatuses] = useAtom(statusesAtom);
  const [allPins, setAllPins] = useAtom(pinsAtom);
const [pins] = useAtom(filteredPinsAtom); // read-only

  const [showPins, setShowPins] = useState(true);
  const [pinMode, setPinMode] = useState(false);
  const [mousePos, setMousePos] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [ghostPinPos, setGhostPinPos] = useState(null);
  const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });
  const [basePdfSize, setBasePdfSize] = useState({ width: 0, height: 0 });
  const [containerRect, setContainerRect] = useState({ left: 0, top: 0 });
  const [newComment, setNewComment] = useState(null)
  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const [focusOnPinOnce, setFocusOnPinOnce] = useAtom(focusOnPinAtom)
  const [touches, setTouches] = useState([]);
  const [initialDistance, setInitialDistance] = useState(null);
  const [initialScale, setInitialScale] = useState(scale);
  const [photoUploadTrigger, setPhotoUploadTrigger] = useState(0);
  const [draggingPin, setDraggingPin] = useState(null);
  const [pinDragStart, setPinDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const draggingPinRef = useRef(null);

  const handlePinMouseDown = (e, pin) => {
    e.stopPropagation();
    if (pinMode) return;
    
    const pdfElement = pageRef.current;
    if (!pdfElement) return;
    
    const pdfRect = pdfElement.getBoundingClientRect();
    
    draggingPinRef.current = pin.id;
    setIsDragging(false); // Reset dragging state
    
    setPinDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      pinX: pin.x,
      pinY: pin.y,
      pinId: pin.id,
      pdfRect,
      hasMoved: false
    });
  };

  const handlePinMouseMove = useCallback((e) => {
    if (!pinDragStart) return;
    
    const deltaX = Math.abs(e.clientX - pinDragStart.mouseX);
    const deltaY = Math.abs(e.clientY - pinDragStart.mouseY);
    const hasMoved = deltaX > 5 || deltaY > 5;
    
    if (!hasMoved) return;
    
    if (!pinDragStart.hasMoved) {
      setPinDragStart(prev => ({ ...prev, hasMoved: true }));
      setDraggingPin(pinDragStart.pinId);
      setIsDragging(true); // Mark that we're actually dragging
    }
    
    const activePinId = draggingPinRef.current;
    if (!activePinId) return;
    
    const mouseDeltaX = (e.clientX - pinDragStart.mouseX) / scale;
    const mouseDeltaY = (e.clientY - pinDragStart.mouseY) / scale;
    
    const newX = pinDragStart.pinX + (mouseDeltaX / (basePdfSize.width * renderScale));
    const newY = pinDragStart.pinY + (mouseDeltaY / (basePdfSize.height * renderScale));
    
    const clampedX = Math.max(0, Math.min(1, newX));
    const clampedY = Math.max(0, Math.min(1, newY));
    
   setAllPins(prev =>
  prev.map(p =>
    p.id === activePinId ? { ...p, x: clampedX, y: clampedY } : p
  )
);

setSelectedPin(prev =>
  prev?.id === activePinId
    ? { ...prev, x: clampedX, y: clampedY }
    : prev
);

  }, [pinDragStart, scale, basePdfSize, renderScale]);

  const handlePinMouseUp = useCallback(async (e) => {
    const wasDragging = isDragging;
    
    if (pinDragStart && !pinDragStart.hasMoved) {
      setPinDragStart(null);
      setDraggingPin(null);
      setIsDragging(false);
      draggingPinRef.current = null;
      return;
    }
    
    const activePinId = draggingPinRef.current;
    if (!activePinId) return;
    
    const updatedPin = pins.find(p => p.id === activePinId);
    
    if (updatedPin && wasDragging) {
      // Store the new coordinates
      const newX = updatedPin.x;
      const newY = updatedPin.y;
      
      // Update database
      const { error } = await supabase
        .from('pdf_pins')
        .update({ x: newX, y: newY })
        .eq('id', updatedPin.id);
      
      if (error) {
        console.error('Error updating pin position:', error);
        // Optionally: revert the position in state if save failed
      } else {
        console.log('Pin position updated successfully');
        // Ensure the pin state is updated with the saved coordinates
        setAllPins(prev =>
  prev.map(p =>
    p.id === activePinId
      ? { ...p, x: newX, y: newY }
      : p
  )
);

      }
    }
    
    setDraggingPin(null);
    setPinDragStart(null);
    draggingPinRef.current = null;
    
    // Small delay to prevent click event from firing
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  }, [pinDragStart, pins, isDragging]);

  useEffect(() => {
    if (pinDragStart) {
      window.addEventListener('mousemove', handlePinMouseMove);
      window.addEventListener('mouseup', handlePinMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handlePinMouseMove);
        window.removeEventListener('mouseup', handlePinMouseUp);
      };
    }
  }, [pinDragStart, handlePinMouseMove, handlePinMouseUp]);

  const handlePhotoUploaded = () => {
    setPhotoUploadTrigger(prev => prev + 1);
  };

  console.log('User', user)
  console.log('SelectedPin', selectedPin)

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setDragging(true);
      setStartDrag({ x: t.clientX, y: t.clientY });
    } else if (e.touches.length === 2) {
      setTouches([e.touches[0], e.touches[1]]);
      setInitialDistance(getDistance(e.touches));
      setInitialScale(scale);
    }
  }

  function onTouchMove(e) {
    if (dragging && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - startDrag.x;
      const dy = t.clientY - startDrag.y;
      setStartDrag({ x: t.clientX, y: t.clientY });
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    } else if (e.touches.length === 2) {
      const distance = getDistance(e.touches);
      if (initialDistance) {
        const factor = distance / initialDistance;
        zoom(factor * initialScale / scale);
      }
    }

    if (pinMode && e.touches.length === 1) {
      const t = e.touches[0];
      setGhostPinPos({ x: t.clientX, y: t.clientY });
    }
  }

  function onTouchEnd(e) {
    setDragging(false);
    if (e.touches.length < 2) {
      setInitialDistance(null);
    }
  }

  useEffect(() => {
    if (!focusOnPinOnce) return;

    const pin = pins.find(p => p.id === focusOnPinOnce);
    if (!pin) return;

    setSelectedPin(pin);
    focusOnPin(pin);
    setFocusOnPinOnce(null);
  }, [focusOnPinOnce, pins, setSelectedPin, setFocusOnPinOnce]);

  useEffect(() => {
    if (selectedPin && !isDragging) {
      // Find the latest pin data from pins array
      const latestPin = pins.find(p => p.id === selectedPin.id);
      if (latestPin) {
        focusOnPin(latestPin);
      }
    }
  }, [selectedPin?.id, isDragging, pins]);

  useEffect(() => {
    console.log('PdfCanvas pins', pins.length)
  }, [pins])

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRect({ left: rect.left, top: rect.top });
    }
  }, [pdfSize,scale,offset]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  function zoom(factor) {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const pdfX = (centerX - offset.x) / scale;
    const pdfY = (centerY - offset.y) / scale;

    const newScale = Math.max(0.05, Math.min(scale * factor, 5));

    const newOffsetX = centerX - pdfX * newScale;
    const newOffsetY = centerY - pdfY * newScale;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }

  function zoomIn() {
    zoom(2);
  }

  function zoomOut() {
    zoom(0.5);
  }

  const handleWheel = (event) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    zoom(zoomFactor);
  };

  function onMouseDown(e) {
    if (draggingPin) return;
    setDragging(true);
    setStartDrag({ x: e.clientX, y: e.clientY });
  }

  function onMouseUp() {
    setDragging(false);
  }

  function onMouseLeave() {
    setDragging(false);
  }

  function onMouseMove(e) {
    if (!containerRef.current) return;

    if (dragging && !draggingPin) {
      const dx = e.clientX - startDrag.x;
      const dy = e.clientY - startDrag.y;
      setStartDrag({ x: e.clientX, y: e.clientY });
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    }

    if (pinMode) {
      setGhostPinPos({ x: e.clientX, y: e.clientY });
    }
  }

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }

  const handlePinAdd = async (pin,user) => {
    console.log('handlePinAdd', pin)
    const { error,data } = await supabase.from('pdf_pins').insert(pin).select('*,projects(*),plans(*)').single()
    if (data) {
      console.log('handlePinAdd data', data)
      setSelectedPin(data);
      console.log('setPins12')
      setPins( pins => [...pins, data]);
      setPinMode(false);
      console.log('handlePinAdd', pins)
      const { data: eventdata, error: eventerror } = await supabase.from('events').insert({user_id:data.created_by, pin_id:data.id,event:  ' a créé ce pin', category: 'creation'}).select('*').single()
      console.log('eventdata', eventdata)
      if (eventerror) {
        console.log('eventerror', eventerror)
      }
    }
    if (error) {
      console.log('handlePinAdd', error)
    }
  }

  useEffect(()=> {
    console.log('mypins', pins)
  },[pins])

  function closeDrawer() {
    setSelectedPin(null);
  }

  function focusOnPin(pin) {
    if (!pageRef.current || !containerRef.current || !basePdfSize.width) return;

    const pinX = pin.x * basePdfSize.width * renderScale;
    const pinY = pin.y * basePdfSize.height * renderScale;

    const container = containerRef.current.getBoundingClientRect();
    const centerX = container.width / 4;
    const centerY = container.height / 2;

    const newOffset = {
      x: centerX - pinX * scale,
      y: centerY - pinY * scale,
    };

    setOffset(newOffset);
  }

  function handlePdfClick(e) {
    if (!pinMode || dragging || !containerRef.current || !pageRef.current) return;

    const pdfElement = pageRef.current;
    if (!pdfElement) return;
    
    const pdfRect = pdfElement.getBoundingClientRect();
    
    const clickX = e.clientX - pdfRect.left;
    const clickY = e.clientY - pdfRect.top;
    
    const x = clickX / pdfRect.width;
    const y = clickY / pdfRect.height;
    
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    const newPin = {
      category_id: categories.find(c => c.order === 0)?.id ,
      x,
      y,
      status_id: statuses.find(s => s.order === 0)?.id ,
      note: '',
      name: '',
      project_id: project.id,
      pdf_name: plan.name,
      plan_id: plan.id,
      created_by: user?.id || null,
    };

    handlePinAdd(newPin,user);
  }

  return (
    <>
      <div
        className={inter.className}
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        onWheel={handleWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          width: '100%',
          height: '80vh',
          position: 'relative',
          backgroundColor: '#eee',
          userSelect: 'none',
          height: 'calc(100vh - 64px)',
        }}
      >
        {/* Floating Controls Bar */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
          {/* Zoom Controls Group */}
          <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <button
              onClick={zoomOut}
              className="p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5 text-gray-700" />
            </button>
            <div className="px-3 text-sm font-medium text-gray-600 border-r border-gray-200 min-w-[60px] text-center">
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

          {/* Mode Toggle Group */}
          <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setPinMode(false)}
              className={`p-3 transition-all border-r border-gray-200 ${
                !pinMode
                  ? 'bg-pink-50 text-pink-600'
                  : 'hover:bg-gray-50 active:bg-gray-100 text-gray-700'
              }`}
              title="Select Mode"
            >
              <PointerIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPinMode(true)}
              className={`p-3 transition-all ${
                pinMode
                  ? 'bg-pink-50 text-pink-600'
                  : 'hover:bg-gray-50 active:bg-gray-100 text-gray-700'
              }`}
              title="Pin Mode"
            >
              <MapPinIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF + Pins */}
        <div
          onClick={handlePdfClick}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            width: 'fit-content',
            margin: 'auto',
            position: 'relative',
            cursor: pinMode ? 'pointer' : draggingPin ? 'grabbing' : 'default',
            willChange: 'transform',
            transition: dragging || draggingPin ? 'none' : 'transform 0.3s ease',
          }}
        >
          <Document 
            file={fileUrl} 
            onLoadSuccess={onDocumentLoadSuccess} 
            loading={
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement du PDF...</p>
                </div>
              </div>
            }
            options={{
              cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`,
              enableXfa: true,
            }}
          >
            <Page
              pageNumber={pageNumber}
              scale={renderScale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              inputRef={pageRef}
              onRenderSuccess={({ width, height }) => {
                setPdfSize({ width, height });
                
                if (basePdfSize.width === 0) {
                  setBasePdfSize({ 
                    width: width / renderScale, 
                    height: height / renderScale 
                  });
                }
              }}
              onLoadError={(error) => console.error('Page load error:', error)}
              loading={null}
              renderMode="canvas"
            />
          </Document>

          {/* Pins - Use base size for consistent positioning */}
          {basePdfSize.width > 0 && pins.map((pin, idx) => {
            const scaledX = pin.x * basePdfSize.width * renderScale;
            const scaledY = pin.y * basePdfSize.height * renderScale;

            const z =
              selectedPin?.id === pin.id ? 3000 :
              hoveredPinId === pin.id ? 2000 : 10;
            
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: scaledY,
                  left: scaledX,
                  transform: `translate(-50%, -50%) scale(${1 / scale})`,
                  pointerEvents: 'auto',
                  zIndex: z,
                  cursor: pinMode ? 'pointer' : 'move',
                  opacity: draggingPin === pin.id ? 0.7 : 1,
                }}
                onMouseEnter={() => setHoveredPinId(pin.id)}
                onMouseLeave={() => setHoveredPinId((id) => (id === pin.id ? null : id))}
                onMouseDown={(e) => handlePinMouseDown(e, pin)}
                onClick={(e) => {
                  // Don't open drawer if we just finished dragging
                  if (isDragging || pinDragStart?.hasMoved || draggingPin) {
                    e.stopPropagation();
                    return;
                  }
                  e.stopPropagation();
                  // Use the current pin data from pins array, not stale data
                  const currentPin = pins.find(p => p.id === pin.id);
                  setSelectedPin({ ...currentPin, index: idx });
                }}
                title={`Pin #${idx + 1}`}
              >
                <MapPin pin={pin} hovered={hoveredPinId === pin.id} dragging={draggingPin === pin.id}/>
              </div>
            );
          })}
        </div>
      </div>

      {pinMode && ghostPinPos && (
        <div
          style={{
            position: 'fixed',
            top: ghostPinPos.y,
            left: ghostPinPos.x,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            opacity: 0.5,
            zIndex: 9999,
          }}
        >
          <GhostPin />
        </div>
      )}

      {/* Right Drawer */}
      {selectedPin && (
        <div
          className={`${inter.className} fixed top-[64px] right-4 w-[500px] h-[calc(100vh-100px)] bg-white z-[1000] border border-gray-300 rounded-md flex flex-col overflow-hidden`}
        >
          {/* Fixed Header */}
          <div className="px-5 py-4 border-b border-gray-200 shrink-0">
            <DrawerHeader pin={selectedPin} onClose={closeDrawer} onPhotoUploaded={handlePhotoUploaded} />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto ">
            <DrawerBody pin={selectedPin} onClose={closeDrawer} newComment={newComment} photoUploadTrigger={photoUploadTrigger} />
          </div>

          {/* Fixed Footer */}
          <div className="px-5 py-4 border-t border-gray-200 shrink-0">
            <DrawerFooter pin={selectedPin} submit={closeDrawer} onCommentAdded={(comment) => {
              setNewComment(comment)
            }} />
          </div>
        </div>
      )}
    </>
  );
}