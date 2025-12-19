import React, { useState, useRef, use, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import {Anek_Devanagari, Cabin, Jost, Catamaran, Lato, Noto_Sans, Fira_Sans, Domine, Inconsolata, Karla, Maitree, Nanum_Gothic, Aleo, Figtree, Lexend} from 'next/font/google'
import { useAtom } from 'jotai';
import { categoriesAtom, pinsAtom, selectedPinAtom, selectedPlanAtom, selectedProjectAtom, statusesAtom } from '@/store/atoms';
import DrawerHeader from './DrawerHeader';
import DrawerFooter from './DrawerFooter';
import DrawerBody from './DrawerBody';
import MapPin from './MapPin';
import { Calendar, CalendarDaysIcon, GrabIcon, MapPinIcon, PointerIcon, ZoomIn, ZoomOut } from 'lucide-react';
import GhostPin from './GhostPin';

import { supabase } from '@/utils/supabase/client';
import { classNames } from '@react-pdf-viewer/core';

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

export default function PdfCanvas({ fileUrl, onPinAdd, project, plan, user }) {
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom);
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.25);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [statuses, setStatuses] = useAtom(statusesAtom);
  const [pins, setPins] = useAtom(pinsAtom);
  const [showPins, setShowPins] = useState(true);
  const [pinMode, setPinMode] = useState(false);
  const [mousePos, setMousePos] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [ghostPinPos, setGhostPinPos] = useState(null); // { x: number, y: number }
const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 });
const [containerRect, setContainerRect] = useState({ left: 0, top: 0 });
const [newComment, setNewComment] = useState(null)
const containerRef = useRef(null);
const pageRef = useRef(null); // NEW

console.log('User', user)
console.log('SelectedPin', selectedPin)

useEffect(() => {
 if (selectedPin) {
  focusOnPin(selectedPin);
}
}, [selectedPin]);



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

  // Center of the container
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Convert center point to PDF coordinate space
  const pdfX = (centerX - offset.x) / scale;
  const pdfY = (centerY - offset.y) / scale;

  // Calculate new scale
  const newScale = Math.max(0.125, Math.min(scale * factor, 5));

  // Recalculate offset to keep center stable
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
    // event.deltaY indicates the vertical scroll amount
    // A positive value means scrolling down, a negative value means scrolling up
    if (event.deltaY > 0) {
      zoomOut();
    } else if (event.deltaY < 0) {
      zoomIn();
    }
  };

  function onMouseDown(e) {
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

  if (dragging) {
    const dx = e.clientX - startDrag.x;
    const dy = e.clientY - startDrag.y;
    setStartDrag({ x: e.clientX, y: e.clientY });
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }

  if (pinMode) {
    setGhostPinPos({ x: e.clientX, y: e.clientY }); // absolute position on screen
  }
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const handlePinAdd = async (pin,user) => {
  //if (!selectedPin) return;
console.log('handlePinAdd', pin)
  const { error,data } = await supabase.from('pdf_pins').insert(pin).select('*,projects(*),plans(*)').single()
  if (data) {
    console.log('handlePinAdd data', data)
    setSelectedPin(data);
    setPins( pins => [...pins, data]);
    setPinMode(false);
    console.log('handlePinAdd', pins)
    const { data: eventdata, error: eventerror } = await supabase.from('events').insert({user_id:data.assigned_to, pin_id:data.id,event:  ' a cree ce pin', category: 'creation'}).select('*').single()
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
  if (!pageRef.current || !containerRef.current || !pdfSize) return;

  const pinX = pin.x * pdfSize.width;
  const pinY = pin.y * pdfSize.height;

  // Calculate viewport center
  const container = containerRef.current.getBoundingClientRect();
  const centerX = container.width / 4;
  const centerY = container.height / 2;

  // New offset so the pin appears centered
  const newOffset = {
    x: centerX - pinX * scale,
    y: centerY - pinY * scale,
  };

  setOffset(newOffset);
}


function handlePdfClick(e) {
  if (!pinMode || dragging || !containerRef.current || !pageRef.current) return;

  // Get the actual PDF page element bounds
  const pdfElement = pageRef.current;
  if (!pdfElement) return;
  
  const pdfRect = pdfElement.getBoundingClientRect();
  
  // Calculate click position relative to PDF element
  const clickX = e.clientX - pdfRect.left;
  const clickY = e.clientY - pdfRect.top;
  
  // Convert to normalized coordinates (0-1)
  const x = clickX / pdfRect.width;
  const y = clickY / pdfRect.height;
  
  // Ensure click is within PDF bounds
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
    created_by: user?.id,
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
        {/* Floating Controls Bar - IMPROVED */}
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
   // border: '2px solid red',
  // transform: `translate(${offset.x}px, ${offset.y}px)`,
    transformOrigin: 'top left',
    width: 'fit-content',
    margin: 'auto',
    position: 'relative',
    cursor: pinMode ? 'pointer' : dragging ? 'grabbing' : 'default',
    transition: 'transform 0.3s ease',
     
   
  }}
>
  <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading="Loading PDF...">
   <Page
  pageNumber={pageNumber}
  scale={4}
  renderTextLayer={false}
  renderAnnotationLayer={false}
  inputRef={pageRef}
  onRenderSuccess={({ width, height }) => {
    setPdfSize({ width, height });
  }}
/>
  </Document>


          {/* Pins */}
          {pins.map((pin, idx) => {
  // Calculate position relative to the PDF's actual rendered size
  const scaledX = pin.x * pdfSize.width;
  const scaledY = pin.y * pdfSize.height;

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
        zIndex: 10,
        transition: 'transform 0.3s ease',
         zIndex: z
        
      }}
      onMouseEnter={() => setHoveredPinId(pin.id)}
              onMouseLeave={() => setHoveredPinId((id) => (id === pin.id ? null : id))}
      onClick={() => { setSelectedPin({ ...pin, index: idx })}}
      title={`Pin #${idx + 1}`}
    >
      <MapPin pin={pin} hovered={hoveredPinId === pin.id}/>

      {/*isOverDue && (
        <div
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            backgroundColor: "red",
            color: "white",
            borderRadius: "50%",
            padding: "3px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
          }}
        >
          <CalendarDaysIcon size={12} />
        </div>
      )*/}
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
  className={`${inter.className} fixed  top-[64px] right-4 w-[500px] h-[calc(100vh-100px)] bg-white z-[1000] border border-gray-300 rounded-md flex flex-col overflow-hidden`}
>
  {/* Fixed Header */}
  <div className="px-5 py-4 border-b border-gray-200 shrink-0">
    <DrawerHeader pin={selectedPin} onClose={closeDrawer} />
  </div>

  {/* Scrollable Content */}
  <div className="flex-1 overflow-y-auto ">
    <DrawerBody pin={selectedPin} onClose={closeDrawer} newComment={newComment} />
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