import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import { Lexend } from 'next/font/google';
import { useAtom } from 'jotai';
import {
  categoriesAtom, filteredPinsAtom, focusOnPinAtom,
  pinsAtom, selectedPinAtom, selectedPlanAtom, selectedProjectAtom, statusesAtom
} from '@/store/atoms';
import DrawerHeader from './DrawerHeader';
import DrawerFooter from './DrawerFooter';
import DrawerBody from './DrawerBody';
import MapPin from './MapPin';
import { MapPinIcon, PointerIcon, ZoomIn, ZoomOut } from 'lucide-react';
import GhostPin from './GhostPin';
import { supabase } from '@/utils/supabase/client';

const inter = Lexend({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE_SIZE          = 512;  // px per tile in PDF native coords
const TILE_RENDER_SCALE  = 2;    // render each tile at 2× for retina sharpness
const MAX_TILES_IN_MEMORY = 24;  // LRU evict beyond this count

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDistance(touches) {
  const [t1, t2] = touches;
  return Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
}

// ─── TileCanvas ───────────────────────────────────────────────────────────────
// Blits a rendered offscreen canvas into a visible canvas.
// React.memo = never re-renders unless the canvas object itself changes.
const TileCanvas = React.memo(({ canvas, left, top, width, height }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !canvas) return;
    ref.current.width  = canvas.width;
    ref.current.height = canvas.height;
    ref.current.getContext('2d').drawImage(canvas, 0, 0);
  }, [canvas]);
  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        left, top, width, height,
        display: 'block',
      }}
    />
  );
});

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PdfCanvas({ fileUrl, onPinAdd, project, plan, user }) {
  // ── Atoms ──────────────────────────────────────────────────────────────────
  const [selectedPin, setSelectedPin]       = useAtom(selectedPinAtom);
  const [categories]                         = useAtom(categoriesAtom);
  const [statuses]                           = useAtom(statusesAtom);
  const [allPins, setAllPins]               = useAtom(pinsAtom);
  const [pins]                               = useAtom(filteredPinsAtom);
  const [focusOnPinOnce, setFocusOnPinOnce] = useAtom(focusOnPinAtom);

  // ── PDF state ──────────────────────────────────────────────────────────────
  const [pageNumber]                            = useState(1);
  const pdfPageRef                              = useRef(null);   // pdf.js PDFPageProxy
  const [pdfNativeSize, setPdfNativeSize]       = useState({ w: 0, h: 0 }); // at scale=1
  const [pdfReady, setPdfReady]                 = useState(false);

  // ── Tile state ─────────────────────────────────────────────────────────────
  const tileCacheRef  = useRef(new Map());     // key → { canvas, lastUsed, tileX, tileY, tileW, tileH }
  const pendingRef    = useRef(new Set());     // keys currently rendering
  const [tiles, setTiles] = useState([]);      // visible tiles for render

  // ── Transform (DOM-direct, like RN useSharedValue) ─────────────────────────
  const [scale,  setScale]  = useState(0.25);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef   = useRef(0.25);
  const offsetRef  = useRef({ x: 0, y: 0 });
  const pdfLayerRef  = useRef(null);
  const pinsLayerRef = useRef(null);

  const applyTransform = useCallback((s, o) => {
    scaleRef.current  = s;
    offsetRef.current = o;
    const t = `translate(${o.x}px, ${o.y}px) scale(${s})`;
    if (pdfLayerRef.current)  pdfLayerRef.current.style.transform  = t;
    if (pinsLayerRef.current) pinsLayerRef.current.style.transform = t;
  }, []);

  // Commit syncs refs → React state (triggers UI re-render for % indicator etc.)
  const commitTransform = useCallback(() => {
    setScale(scaleRef.current);
    setOffset({ ...offsetRef.current });
  }, []);

  // ── Misc interaction state ─────────────────────────────────────────────────
  const containerRef   = useRef(null);
  const [dragging, setDragging]             = useState(false);
  const startDragRef   = useRef({ x: 0, y: 0 });
  const [pinMode, setPinMode]               = useState(false);
  const [ghostPinPos, setGhostPinPos]       = useState(null);
  const [hoveredPinId, setHoveredPinId]     = useState(null);
  const [newComment, setNewComment]         = useState(null);
  const [photoUploadTrigger, setPhotoUploadTrigger] = useState(0);
  const [draggingPin, setDraggingPin]       = useState(null);
  const [pinDragStart, setPinDragStart]     = useState(null);
  const [isDragging, setIsDragging]         = useState(false);
  const draggingPinRef = useRef(null);
  const initialDistanceRef = useRef(null);
  const initialScaleRef    = useRef(0.25);

  // ── PDF load ───────────────────────────────────────────────────────────────
  // react-pdf's onLoadSuccess gives us the # of pages but not the raw pdf.js doc.
  // We load directly via pdfjs.getDocument to get PDFPageProxy for tile rendering.
  const onDocumentLoadSuccess = useCallback(async () => {
    try {
      const rawDoc = await pdfjs.getDocument({
        url: fileUrl,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
      }).promise;
      const page = await rawDoc.getPage(pageNumber);
      const vp   = page.getViewport({ scale: 1 });
      pdfPageRef.current = page;
      setPdfNativeSize({ w: vp.width, h: vp.height });
      setPdfReady(true);
    } catch (e) {
      console.error('PDF load error', e);
    }
  }, [fileUrl, pageNumber]);

  // ── Tile system ────────────────────────────────────────────────────────────
  const getVisibleTileKeys = useCallback((s, o) => {
    const { w, h } = pdfNativeSize;
    if (!w) return [];
    const cw = containerRef.current?.clientWidth  ?? window.innerWidth;
    const ch = containerRef.current?.clientHeight ?? window.innerHeight;

    const buf   = TILE_SIZE * 0.5;
    const left  = Math.max(0, (-o.x / s) - buf);
    const top   = Math.max(0, (-o.y / s) - buf);
    const right  = Math.min(w, (cw - o.x) / s + buf);
    const bottom = Math.min(h, (ch - o.y) / s + buf);

    const keys = [];
    const c0 = Math.max(0, Math.floor(left  / TILE_SIZE));
    const c1 = Math.ceil (right  / TILE_SIZE);
    const r0 = Math.max(0, Math.floor(top   / TILE_SIZE));
    const r1 = Math.ceil (bottom / TILE_SIZE);

    for (let r = r0; r < r1; r++)
      for (let c = c0; c < c1; c++)
        keys.push(`${c}_${r}`);

    return keys;
  }, [pdfNativeSize]);

  const updateTiles = useCallback(async () => {
    const page = pdfPageRef.current;
    if (!page || !pdfNativeSize.w) return;

    const { w: nw, h: nh } = pdfNativeSize;
    const s   = scaleRef.current;
    const o   = offsetRef.current;
    const now = Date.now();
    const cache = tileCacheRef.current;

    const visibleKeys = getVisibleTileKeys(s, o);

    // Render tiles that are not cached and not already being rendered
    await Promise.allSettled(
      visibleKeys
        .filter(key => !cache.has(key) && !pendingRef.current.has(key))
        .map(async (key) => {
          pendingRef.current.add(key);
          const [col, row] = key.split('_').map(Number);
          const tx = col * TILE_SIZE;
          const ty = row * TILE_SIZE;
          const tw = Math.min(TILE_SIZE, nw - tx);
          const th = Math.min(TILE_SIZE, nh - ty);
          if (tw <= 0 || th <= 0) { pendingRef.current.delete(key); return; }

          try {
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(tw * TILE_RENDER_SCALE);
            canvas.height = Math.round(th * TILE_RENDER_SCALE);
            const ctx = canvas.getContext('2d');
            const vp  = page.getViewport({ scale: TILE_RENDER_SCALE });

            // Clip to tile region
            ctx.save();
            ctx.translate(-tx * TILE_RENDER_SCALE, -ty * TILE_RENDER_SCALE);
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            ctx.restore();

            cache.set(key, { canvas, lastUsed: now, tileX: tx, tileY: ty, tileW: tw, tileH: th });
          } catch {
            // Rendering was cancelled (e.g. page navigated away) — safe to ignore
          } finally {
            pendingRef.current.delete(key);
          }
        })
    );

    // Update lastUsed for visible cached tiles
    visibleKeys.forEach(k => { if (cache.has(k)) cache.get(k).lastUsed = now; });

    // LRU eviction
    if (cache.size > MAX_TILES_IN_MEMORY) {
      [...cache.entries()]
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
        .slice(0, cache.size - MAX_TILES_IN_MEMORY)
        .forEach(([k]) => cache.delete(k));
    }

    // Push visible tiles to state for render
    setTiles(
      visibleKeys
        .filter(k => cache.has(k))
        .map(k => {
          const { canvas, tileX, tileY, tileW, tileH } = cache.get(k);
          return { key: k, canvas, left: tileX, top: tileY, width: tileW, height: tileH };
        })
    );
  }, [pdfNativeSize, getVisibleTileKeys]);

  // Debounce tile updates during gestures; fire immediately on gesture end
  const tileTimerRef = useRef(null);
  const scheduleTileUpdate = useCallback((immediate = false) => {
    clearTimeout(tileTimerRef.current);
    if (immediate) {
      updateTiles();
    } else {
      tileTimerRef.current = setTimeout(updateTiles, 120);
    }
  }, [updateTiles]);

  useEffect(() => {
    if (pdfReady) scheduleTileUpdate(true);
  }, [pdfReady, scheduleTileUpdate]);

  // ── Gesture handlers ───────────────────────────────────────────────────────
  function zoom(factor, cx, cy) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = cx ?? rect.width  / 2;
    const y = cy ?? rect.height / 2;
    const pdfX = (x - offsetRef.current.x) / scaleRef.current;
    const pdfY = (y - offsetRef.current.y) / scaleRef.current;
    const ns   = Math.max(0.05, Math.min(scaleRef.current * factor, 5));
    applyTransform(ns, { x: x - pdfX * ns, y: y - pdfY * ns });
    commitTransform();
    scheduleTileUpdate(true);
  }

  const zoomIn  = () => zoom(2);
  const zoomOut = () => zoom(0.5);

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    zoom(e.deltaY > 0 ? 0.9 : 1.1, e.clientX - rect.left, e.clientY - rect.top);
  };

  function onMouseDown(e) {
    if (draggingPin) return;
    setDragging(true);
    startDragRef.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() {
    if (dragging) { commitTransform(); scheduleTileUpdate(true); }
    setDragging(false);
  }
  function onMouseLeave() {
    if (dragging) { commitTransform(); scheduleTileUpdate(true); }
    setDragging(false);
  }
  function onMouseMove(e) {
    if (dragging && !draggingPin) {
      const dx = e.clientX - startDragRef.current.x;
      const dy = e.clientY - startDragRef.current.y;
      startDragRef.current = { x: e.clientX, y: e.clientY };
      applyTransform(scaleRef.current, { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy });
      scheduleTileUpdate();
    }
    if (pinMode) setGhostPinPos({ x: e.clientX, y: e.clientY });
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      setDragging(true);
      startDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      initialDistanceRef.current = getDistance(e.touches);
      initialScaleRef.current    = scaleRef.current;
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 1 && dragging) {
      const dx = e.touches[0].clientX - startDragRef.current.x;
      const dy = e.touches[0].clientY - startDragRef.current.y;
      startDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      applyTransform(scaleRef.current, { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy });
      scheduleTileUpdate();
    } else if (e.touches.length === 2 && initialDistanceRef.current) {
      const factor = getDistance(e.touches) / initialDistanceRef.current;
      const ns = Math.max(0.05, Math.min(initialScaleRef.current * factor, 5));
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const pdfX = (cx - offsetRef.current.x) / initialScaleRef.current;
      const pdfY = (cy - offsetRef.current.y) / initialScaleRef.current;
      applyTransform(ns, { x: cx - pdfX * ns, y: cy - pdfY * ns });
      scheduleTileUpdate();
    }
    if (pinMode && e.touches.length === 1)
      setGhostPinPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }
  function onTouchEnd(e) {
    setDragging(false);
    if (e.touches.length < 2) {
      initialDistanceRef.current = null;
      commitTransform();
      scheduleTileUpdate(true);
    }
  }

  // ── Pin drag ───────────────────────────────────────────────────────────────
  const handlePinMouseDown = (e, pin) => {
    e.stopPropagation();
    if (pinMode) return;
    draggingPinRef.current = pin.id;
    setIsDragging(false);
    setPinDragStart({ mouseX: e.clientX, mouseY: e.clientY, pinX: pin.x, pinY: pin.y, hasMoved: false });
  };

  const handlePinMouseMove = useCallback((e) => {
    if (!pinDragStart) return;
    if (Math.abs(e.clientX - pinDragStart.mouseX) <= 5 && Math.abs(e.clientY - pinDragStart.mouseY) <= 5) return;
    if (!pinDragStart.hasMoved) {
      setPinDragStart(p => ({ ...p, hasMoved: true }));
      setDraggingPin(pinDragStart.pinId);
      setIsDragging(true);
    }
    const id = draggingPinRef.current;
    if (!id) return;
    const newX = Math.max(0, Math.min(1,
      pinDragStart.pinX + (e.clientX - pinDragStart.mouseX) / scaleRef.current / (pdfNativeSize.w * TILE_RENDER_SCALE)
    ));
    const newY = Math.max(0, Math.min(1,
      pinDragStart.pinY + (e.clientY - pinDragStart.mouseY) / scaleRef.current / (pdfNativeSize.h * TILE_RENDER_SCALE)
    ));
    setAllPins(prev => prev.map(p => p.id === id ? { ...p, x: newX, y: newY } : p));
    setSelectedPin(prev => prev?.id === id ? { ...prev, x: newX, y: newY } : prev);
  }, [pinDragStart, pdfNativeSize]);

  const handlePinMouseUp = useCallback(async () => {
    if (pinDragStart && !pinDragStart.hasMoved) {
      setPinDragStart(null); setDraggingPin(null);
      setIsDragging(false); draggingPinRef.current = null;
      return;
    }
    const id = draggingPinRef.current;
    if (!id) return;
    const pin = pins.find(p => p.id === id);
    if (pin && isDragging)
      await supabase.from('pdf_pins').update({ x: pin.x, y: pin.y }).eq('id', pin.id);
    setDraggingPin(null); setPinDragStart(null);
    draggingPinRef.current = null;
    setTimeout(() => setIsDragging(false), 50);
  }, [pinDragStart, pins, isDragging]);

  useEffect(() => {
    if (!pinDragStart) return;
    window.addEventListener('mousemove', handlePinMouseMove);
    window.addEventListener('mouseup', handlePinMouseUp);
    return () => {
      window.removeEventListener('mousemove', handlePinMouseMove);
      window.removeEventListener('mouseup', handlePinMouseUp);
    };
  }, [pinDragStart, handlePinMouseMove, handlePinMouseUp]);

  // ── Focus on pin ───────────────────────────────────────────────────────────
  function focusOnPin(pin) {
    if (!containerRef.current || !pdfNativeSize.w) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const pinX = pin.x * pdfNativeSize.w * TILE_RENDER_SCALE;
    const pinY = pin.y * pdfNativeSize.h * TILE_RENDER_SCALE;
    applyTransform(scaleRef.current, {
      x: width  / 4 - pinX * scaleRef.current,
      y: height / 2 - pinY * scaleRef.current,
    });
    commitTransform();
    scheduleTileUpdate(true);
  }

  useEffect(() => {
    if (!focusOnPinOnce) return;
    const pin = pins.find(p => p.id === focusOnPinOnce);
    if (!pin) return;
    setSelectedPin(pin); focusOnPin(pin); setFocusOnPinOnce(null);
  }, [focusOnPinOnce, pins]);

  useEffect(() => {
    if (selectedPin && !isDragging) {
      const p = pins.find(p => p.id === selectedPin.id);
      if (p) focusOnPin(p);
    }
  }, [selectedPin?.id, isDragging]);

  // ── Add pin ────────────────────────────────────────────────────────────────
  function handlePdfClick(e) {
    if (!pinMode || dragging) return;
    const rect = pdfLayerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    handlePinAdd({ x, y });
  }

  const handlePinAdd = async ({ x, y }) => {
    const pin = {
      category_id: categories.find(c => c.order === 0)?.id,
      x, y,
      status_id: statuses.find(s => s.order === 0)?.id,
      note: '', name: '',
      project_id: project.id, pdf_name: plan.name,
      plan_id: plan.id, created_by: user?.id || null,
    };
    const { data, error } = await supabase
      .from('pdf_pins').insert(pin)
      .select('*,projects(*),plans(*)').single();
    if (data) {
      setSelectedPin(data);
      setAllPins(prev => [...prev, data]);
      setPinMode(false);
      await supabase.from('events').insert({
        user_id: data.created_by, pin_id: data.id,
        event: ' a créé ce pin', category: 'creation',
      });
    }
    if (error) console.error('handlePinAdd', error);
  };

  // ── Pins (memoized, counter-scaled) ───────────────────────────────────────
  const memoizedPins = useMemo(() => {
    if (!pdfNativeSize.w) return null;
    return pins.map((pin, idx) => {
      const pdfX = pin.x * pdfNativeSize.w * TILE_RENDER_SCALE;
      const pdfY = pin.y * pdfNativeSize.h * TILE_RENDER_SCALE;
      const z = selectedPin?.id === pin.id ? 3000 : hoveredPinId === pin.id ? 2000 : 10;
      return (
        <div
          key={pin.id}
          style={{
            position: 'absolute',
            left: pdfX, top: pdfY,
            transform: `translate(-50%, -50%) scale(${1 / scale})`,
            transformOrigin: 'center center',
            pointerEvents: 'auto',
            zIndex: z,
            cursor: pinMode ? 'crosshair' : 'move',
            opacity: draggingPin === pin.id ? 0.7 : 1,
          }}
          onMouseEnter={() => setHoveredPinId(pin.id)}
          onMouseLeave={() => setHoveredPinId(id => id === pin.id ? null : id)}
          onMouseDown={e => handlePinMouseDown(e, pin)}
          onClick={e => {
            if (isDragging || pinDragStart?.hasMoved || draggingPin) { e.stopPropagation(); return; }
            e.stopPropagation();
            setSelectedPin({ ...pins.find(p => p.id === pin.id), index: idx });
          }}
          title={`Pin #${idx + 1}`}
        >
          <MapPin pin={pin} hovered={hoveredPinId === pin.id} dragging={draggingPin === pin.id} />
        </div>
      );
    });
  }, [pins, pdfNativeSize, selectedPin?.id, hoveredPinId, pinMode, draggingPin, isDragging, pinDragStart?.hasMoved, scale]);

  const closeDrawer = () => setSelectedPin(null);

  const totalW = pdfNativeSize.w * TILE_RENDER_SCALE;
  const totalH = pdfNativeSize.h * TILE_RENDER_SCALE;

  // ─── Render ────────────────────────────────────────────────────────────────
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
          position: 'relative',
          backgroundColor: '#eee',
          userSelect: 'none',
          height: 'calc(100vh - 64px)',
        }}
      >
        {/* Controls */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
          <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <button onClick={zoomOut} className="p-3 hover:bg-gray-50 transition-colors border-r border-gray-200">
              <ZoomOut className="h-5 w-5 text-gray-700" />
            </button>
            <div className="px-3 text-sm font-medium text-gray-600 border-r border-gray-200 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </div>
            <button onClick={zoomIn} className="p-3 hover:bg-gray-50 transition-colors">
              <ZoomIn className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setPinMode(false)}
              className={`p-3 transition-all border-r border-gray-200 ${!pinMode ? 'bg-pink-50 text-pink-600' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <PointerIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPinMode(true)}
              className={`p-3 transition-all ${pinMode ? 'bg-pink-50 text-pink-600' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <MapPinIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Memory debug badge */}
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded font-mono">
            {tileCacheRef.current.size}/{MAX_TILES_IN_MEMORY} tiles
          </div>
        </div>

        {/* Hidden react-pdf Document — only needed to trigger pdf.js worker init */}
        <div style={{ display: 'none' }}>
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} options={{
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`,
          }}>
            <Page pageNumber={pageNumber} scale={0.01} renderTextLayer={false} renderAnnotationLayer={false} loading={null} />
          </Document>
        </div>

        {/* PDF tiled layer */}
        <div
          ref={pdfLayerRef}
          onClick={handlePdfClick}
          style={{
            position: 'absolute',
            width: totalW || '100%',
            height: totalH || '100%',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            willChange: 'transform',
            backgroundColor: 'white',
            cursor: pinMode ? 'crosshair' : draggingPin ? 'grabbing' : 'default',
          }}
        >
          {!pdfReady && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
                <p className="text-gray-600">Chargement du PDF...</p>
              </div>
            </div>
          )}

          {tiles.map(({ key, canvas, left, top, width, height }) => (
            <TileCanvas
              key={key}
              canvas={canvas}
              left={left * TILE_RENDER_SCALE}
              top={top  * TILE_RENDER_SCALE}
              width={width}
              height={height}
            />
          ))}
        </div>

        {/* Pins layer — same transform, pins counter-scaled to stay sharp */}
        <div
          ref={pinsLayerRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: totalW || '100%',
            height: totalH || '100%',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            willChange: 'transform',
            pointerEvents: 'none',
          }}
        >
          {memoizedPins}
        </div>
      </div>

      {/* Ghost pin cursor */}
      {pinMode && ghostPinPos && (
        <div style={{
          position: 'fixed', top: ghostPinPos.y, left: ghostPinPos.x,
          transform: 'translate(-50%, -100%)', pointerEvents: 'none', opacity: 0.5, zIndex: 9999,
        }}>
          <GhostPin />
        </div>
      )}

      {/* Right drawer */}
      {selectedPin && (
        <div className={`${inter.className} fixed top-[64px] right-4 w-[500px] h-[calc(100vh-100px)] bg-white z-[1000] border border-gray-300 rounded-md flex flex-col overflow-hidden`}>
          <div className="px-5 py-4 border-b border-gray-200 shrink-0">
            <DrawerHeader pin={selectedPin} onClose={closeDrawer} onPhotoUploaded={() => setPhotoUploadTrigger(p => p + 1)} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <DrawerBody pin={selectedPin} onClose={closeDrawer} newComment={newComment} photoUploadTrigger={photoUploadTrigger} />
          </div>
          <div className="px-5 py-4 border-t border-gray-200 shrink-0">
            <DrawerFooter pin={selectedPin} submit={closeDrawer} onCommentAdded={setNewComment} />
          </div>
        </div>
      )}
    </>
  );
}