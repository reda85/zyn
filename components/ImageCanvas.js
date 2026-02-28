import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Lexend } from 'next/font/google';
import { useAtom } from 'jotai';
import {
  categoriesAtom, filteredPinsAtom, focusOnPinAtom,
  pinsAtom, selectedPinAtom, selectedPlanAtom, selectedProjectAtom, statusesAtom,
} from '@/store/atoms';
import DrawerHeader from './DrawerHeader';
import DrawerFooter from './DrawerFooter';
import DrawerBody from './DrawerBody';
import MapPin from './MapPin';
import { ZoomIn, ZoomOut, PointerIcon, MapPinIcon } from 'lucide-react';
import GhostPin from './GhostPin';
import { supabase } from '@/utils/supabase/client';

const inter = Lexend({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const RENDER_SCALE = 3;

function getDistance(touches) {
  if (touches.length < 2) return 0;
  const [t1, t2] = touches;
  return Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
}

export default function ImageCanvas({ imageUrl, onPinAdd, project, plan, user }) {
  // ── Atoms ────────────────────────────────────────────────────────────────
  const [, setSelectedPlan]                 = useAtom(selectedPlanAtom);
  const [, setSelectedProject]              = useAtom(selectedProjectAtom);
  const [selectedPin, setSelectedPin]       = useAtom(selectedPinAtom);
  const [categories]                        = useAtom(categoriesAtom);
  const [statuses]                          = useAtom(statusesAtom);
  const [allPins, setAllPins]               = useAtom(pinsAtom);
  const [pins]                              = useAtom(filteredPinsAtom);
  const [focusOnPinOnce, setFocusOnPinOnce] = useAtom(focusOnPinAtom);

  // ── Image state ──────────────────────────────────────────────────────────
  const [baseImageSize, setBaseImageSize]   = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded]       = useState(false);
  const baseImageSizeRef                    = useRef({ width: 0, height: 0 });

  // ── Transform — ref-driven for zero-lag DOM updates ──────────────────────
  const [scale,  setScale]  = useState(0.25);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef   = useRef(0.25);
  const offsetRef  = useRef({ x: 0, y: 0 });

  const imageLayerRef = useRef(null);
  const pinElemRefs   = useRef({});  // { [pin.id]: HTMLElement }

  // Write image + every pin directly to DOM — zero React re-renders
  const applyTransform = useCallback((s, o) => {
    scaleRef.current  = s;
    offsetRef.current = o;

    if (imageLayerRef.current)
      imageLayerRef.current.style.transform = `translate(${o.x}px, ${o.y}px) scale(${s})`;

    const { width, height } = baseImageSizeRef.current;
    if (!width) return;
    const tw = width  * RENDER_SCALE;
    const th = height * RENDER_SCALE;
    for (const el of Object.values(pinElemRefs.current)) {
      if (!el) continue;
      const px = parseFloat(el.dataset.px);
      const py = parseFloat(el.dataset.py);
      el.style.transform = `translate(${px * tw * s + o.x}px, ${py * th * s + o.y}px) translate(-50%, -50%)`;
    }
  }, []);

  // Flush refs → React state. Only for zoom % indicator — not on every frame.
  const commitTransform = useCallback(() => {
    setScale(scaleRef.current);
    setOffset({ ...offsetRef.current });
  }, []);

  // ── Animated zoom (buttons + focusOnPin) ─────────────────────────────────
  const animFrameRef = useRef(null);

  const animateTo = useCallback((targetS, targetO, duration = 300) => {
    cancelAnimationFrame(animFrameRef.current);
    const startS = scaleRef.current;
    const startO = { ...offsetRef.current };
    let startTime = null;

    function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    function step(now) {
      if (!startTime) startTime = now;
      const t = Math.min(1, (now - startTime) / duration);
      const e = easeInOut(t);
      applyTransform(
        startS + (targetS - startS) * e,
        { x: startO.x + (targetO.x - startO.x) * e, y: startO.y + (targetO.y - startO.y) * e }
      );
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        commitTransform();
      }
    }
    animFrameRef.current = requestAnimationFrame(step);
  }, [applyTransform, commitTransform]);

  // ── Misc interaction state ────────────────────────────────────────────────
  const containerRef       = useRef(null);
  const imageRef           = useRef(null);
  const [dragging, setDragging]                 = useState(false);
  const startDragRef       = useRef({ x: 0, y: 0 });
  const [pinMode, setPinMode]                   = useState(false);
  const [hoveredPinId, setHoveredPinId]         = useState(null);
  const [ghostPinPos, setGhostPinPos]           = useState(null);
  const [newComment, setNewComment]             = useState(null);
  const [photoUploadTrigger, setPhotoUploadTrigger] = useState(0);
  const [draggingPin, setDraggingPin]           = useState(null);
  const [pinDragStart, setPinDragStart]         = useState(null);
  const [isDragging, setIsDragging]             = useState(false);
  const draggingPinRef     = useRef(null);
  const initialDistanceRef = useRef(null);
  const initialScaleRef    = useRef(0.25);

  const isGuest = !user || !user.id;

  // ── Wheel zoom — instant, no animation ───────────────────────────────────
  const wheelCommitTimer = useRef(null);
  const handleWheel = (e) => {
    e.preventDefault();
    cancelAnimationFrame(animFrameRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = e.clientY - rect.top;
    const imgX = (cx - offsetRef.current.x) / scaleRef.current;
    const imgY = (cy - offsetRef.current.y) / scaleRef.current;
    const ns   = Math.max(0.025, Math.min(scaleRef.current * (e.deltaY > 0 ? 0.9 : 1.1), 5));
    applyTransform(ns, { x: cx - imgX * ns, y: cy - imgY * ns });
    // Debounce commit so we don't trigger re-renders on every wheel tick
    clearTimeout(wheelCommitTimer.current);
    wheelCommitTimer.current = setTimeout(commitTransform, 100);
  };

  // ── Zoom buttons — smooth animated ───────────────────────────────────────
  function zoomButton(factor) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx   = rect.width  / 2;
    const cy   = rect.height / 2;
    const imgX = (cx - offsetRef.current.x) / scaleRef.current;
    const imgY = (cy - offsetRef.current.y) / scaleRef.current;
    const ns   = Math.max(0.025, Math.min(scaleRef.current * factor, 5));
    animateTo(ns, { x: cx - imgX * ns, y: cy - imgY * ns });
  }
  const zoomIn  = () => zoomButton(2);
  const zoomOut = () => zoomButton(0.5);

  // ── Mouse pan ─────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    if (draggingPin) return;
    cancelAnimationFrame(animFrameRef.current);
    setDragging(true);
    startDragRef.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() {
    if (dragging) commitTransform();
    setDragging(false);
  }
  function onMouseLeave() {
    if (dragging) commitTransform();
    setDragging(false);
  }
  function onMouseMove(e) {
    if (dragging && !draggingPin) {
      const dx = e.clientX - startDragRef.current.x;
      const dy = e.clientY - startDragRef.current.y;
      startDragRef.current = { x: e.clientX, y: e.clientY };
      applyTransform(scaleRef.current, {
        x: offsetRef.current.x + dx,
        y: offsetRef.current.y + dy,
      });
    }
    if (pinMode) setGhostPinPos({ x: e.clientX, y: e.clientY });
  }

  // ── Touch ─────────────────────────────────────────────────────────────────
  function onTouchStart(e) {
    cancelAnimationFrame(animFrameRef.current);
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
      applyTransform(scaleRef.current, {
        x: offsetRef.current.x + dx,
        y: offsetRef.current.y + dy,
      });
    } else if (e.touches.length === 2 && initialDistanceRef.current) {
      const factor = getDistance(e.touches) / initialDistanceRef.current;
      const ns = Math.max(0.025, Math.min(initialScaleRef.current * factor, 5));
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const imgX = (cx - offsetRef.current.x) / initialScaleRef.current;
      const imgY = (cy - offsetRef.current.y) / initialScaleRef.current;
      applyTransform(ns, { x: cx - imgX * ns, y: cy - imgY * ns });
    }
    if (pinMode && e.touches.length === 1)
      setGhostPinPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }
  function onTouchEnd(e) {
    setDragging(false);
    if (e.touches.length < 2) {
      initialDistanceRef.current = null;
      commitTransform();
    }
  }

  // ── Pin drag ──────────────────────────────────────────────────────────────
  const handlePinMouseDown = (e, pin) => {
    e.stopPropagation();
    if (pinMode) return;
    draggingPinRef.current = pin.id;
    setIsDragging(false);
    setPinDragStart({
      mouseX: e.clientX, mouseY: e.clientY,
      pinX: pin.x, pinY: pin.y,
      hasMoved: false,
    });
  };

  const handlePinMouseMove = useCallback((e) => {
    if (!pinDragStart) return;
    if (
      Math.abs(e.clientX - pinDragStart.mouseX) <= 5 &&
      Math.abs(e.clientY - pinDragStart.mouseY) <= 5
    ) return;

    if (!pinDragStart.hasMoved) {
      setPinDragStart(p => ({ ...p, hasMoved: true }));
      setDraggingPin(pinDragStart.pinId);
      setIsDragging(true);
    }

    const id = draggingPinRef.current;
    if (!id) return;

    const { width, height } = baseImageSizeRef.current;
    const newX = Math.max(0, Math.min(1,
      pinDragStart.pinX + (e.clientX - pinDragStart.mouseX) / scaleRef.current / (width * RENDER_SCALE)
    ));
    const newY = Math.max(0, Math.min(1,
      pinDragStart.pinY + (e.clientY - pinDragStart.mouseY) / scaleRef.current / (height * RENDER_SCALE)
    ));

    const el = pinElemRefs.current[id];
    if (el) {
      el.dataset.px = newX;
      el.dataset.py = newY;
      const tw = width  * RENDER_SCALE;
      const th = height * RENDER_SCALE;
      el.style.transform = `translate(${newX * tw * scaleRef.current + offsetRef.current.x}px, ${newY * th * scaleRef.current + offsetRef.current.y}px) translate(-50%, -50%)`;
    }

    setAllPins(prev => prev.map(p => p.id === id ? { ...p, x: newX, y: newY } : p));
    setSelectedPin(prev => prev?.id === id ? { ...prev, x: newX, y: newY } : prev);
  }, [pinDragStart]);

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

  // ── Focus on pin ──────────────────────────────────────────────────────────
  function focusOnPin(pin) {
    if (!containerRef.current || !baseImageSizeRef.current.width) return;
    const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
    const pinX = pin.x * baseImageSizeRef.current.width  * RENDER_SCALE;
    const pinY = pin.y * baseImageSizeRef.current.height * RENDER_SCALE;
    animateTo(scaleRef.current, {
      x: cw / 4 - pinX * scaleRef.current,
      y: ch / 2 - pinY * scaleRef.current,
    });
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

  // ── Image load ────────────────────────────────────────────────────────────
  const handleImageLoad = (e) => {
    const img = e.target;
    if (baseImageSize.width === 0) {
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      baseImageSizeRef.current = size;
      setBaseImageSize(size);
    }
    setImageLoaded(true);
  };

  // ── Add pin ───────────────────────────────────────────────────────────────
  function handleImageClick(e) {
    if (!pinMode || dragging || !imageLayerRef.current) return;
    const rect = imageLayerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    handlePinAdd({ x, y });
  }

  const handlePinAdd = async ({ x, y }) => {
    const newPin = {
      category_id: categories.find(c => c.order === 0)?.id,
      x, y,
      status_id: statuses.find(s => s.order === 0)?.id,
      note: '', name: '',
      project_id: project.id, pdf_name: plan.name,
      plan_id: plan.id, created_by: user?.id || null,
    };
    const { data, error } = await supabase
      .from('pdf_pins').insert(newPin)
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

  // ── Pins ──────────────────────────────────────────────────────────────────
  const totalW = baseImageSize.width  * RENDER_SCALE;
  const totalH = baseImageSize.height * RENDER_SCALE;

  // Re-apply pin positions after list changes (new/removed pins)
  useEffect(() => {
    const { width, height } = baseImageSizeRef.current;
    if (!width) return;
    const tw = width  * RENDER_SCALE;
    const th = height * RENDER_SCALE;
    const s  = scaleRef.current;
    const o  = offsetRef.current;
    for (const el of Object.values(pinElemRefs.current)) {
      if (!el) continue;
      const px = parseFloat(el.dataset.px);
      const py = parseFloat(el.dataset.py);
      el.style.transform = `translate(${px * tw * s + o.x}px, ${py * th * s + o.y}px) translate(-50%, -50%)`;
    }
  }, [pins]);

  const memoizedPins = useMemo(() => {
    if (!baseImageSize.width) return null;
    return pins.map((pin, idx) => {
      const sx = pin.x * totalW * scaleRef.current + offsetRef.current.x;
      const sy = pin.y * totalH * scaleRef.current + offsetRef.current.y;
      const z  = selectedPin?.id === pin.id ? 3000 : hoveredPinId === pin.id ? 2000 : 10;
      return (
        <div
          key={pin.id}
          data-px={pin.x}
          data-py={pin.y}
          ref={el => {
            if (el) pinElemRefs.current[pin.id] = el;
            else    delete pinElemRefs.current[pin.id];
          }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            // Screen-space position — no parent scale, always 1:1 pixels, never blurry
            transform: `translate(${sx}px, ${sy}px) translate(-50%, -50%)`,
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
  }, [pins, baseImageSize, selectedPin?.id, hoveredPinId, pinMode, draggingPin, isDragging, pinDragStart?.hasMoved]);

  const closeDrawer = () => setSelectedPin(null);

  // ── Render ────────────────────────────────────────────────────────────────
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
          height: 'calc(100vh - 64px)',
          position: 'relative',
          backgroundColor: '#eee',
          userSelect: 'none',
        }}
      >
        {/* Controls */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
          <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <button onClick={zoomOut} className="p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200" title="Zoom Out">
              <ZoomOut className="h-5 w-5 text-gray-700" />
            </button>
            <div className="px-3 text-sm font-medium text-gray-600 border-r border-gray-200 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </div>
            <button onClick={zoomIn} className="p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors" title="Zoom In">
              <ZoomIn className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          {!isGuest && (
            <div className="flex items-center bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => setPinMode(false)}
                className={`p-3 transition-all border-r border-gray-200 ${!pinMode ? 'bg-pink-50 text-pink-600' : 'hover:bg-gray-50 active:bg-gray-100 text-gray-700'}`}
                title="Select Mode"
              >
                <PointerIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPinMode(true)}
                className={`p-3 transition-all ${pinMode ? 'bg-pink-50 text-pink-600' : 'hover:bg-gray-50 active:bg-gray-100 text-gray-700'}`}
                title="Pin Mode"
              >
                <MapPinIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Image layer */}
        <div
          ref={imageLayerRef}
          onClick={handleImageClick}
          style={{
            position: 'absolute',
            width: totalW || 'auto',
            height: totalH || 'auto',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            willChange: 'transform',
            cursor: pinMode ? 'crosshair' : draggingPin ? 'grabbing' : 'default',
          }}
        >
          {!imageLoaded && (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
                <p className="text-gray-600">Chargement de l'image...</p>
              </div>
            </div>
          )}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Plan"
            onLoad={handleImageLoad}
            style={{
              display: 'block',
              width: totalW || 'auto',
              height: totalH || 'auto',
              maxWidth: 'none',
              userSelect: 'none',
              pointerEvents: 'none',
              imageRendering: 'crisp-edges',
            }}
          />
        </div>

        {/* Pins layer — screen space, no parent transform, pins always 1:1 pixels */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
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