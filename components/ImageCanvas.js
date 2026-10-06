import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import clsx from 'clsx';
import { useAtom } from 'jotai';
import { focusOnPinAtom } from '@/store/atoms';
import PinDrawer from './PinDrawer';
import MapPin from './MapPin';
import { ZoomIn, ZoomOut, PointerIcon, MapPinIcon } from 'lucide-react';
import GhostPin from './GhostPin';
import { supabase } from '@/utils/supabase/client';
import { useProjectData } from '@/providers/ProjectProvider';
import { usePinsCache, useSelectedPin } from '@/hooks/usePins';
import { insertPin } from '@/lib/data/pins';

const RENDER_SCALE = 3;
const SUPABASE_STORAGE = `https://zvebdabtofcusfdaacrq.supabase.co/storage/v1/object/public/project-plans`;

let OpenSeadragon = null;

function getDistance(touches) {
  if (touches.length < 2) return 0;
  const [t1, t2] = touches;
  return Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
}

export default function ImageCanvas({ imageUrl, pins = [], project, plan, user, organizationId }) {
  // ── Données partagées ─────────────────────────────────────────────────────
  // `pins` : pins du plan déjà filtrés, fournis par la page.
  const { categories, statuses }            = useProjectData();
  const [selectedPin, setSelectedPin]       = useSelectedPin();
  const { patchPin, addPin }                = usePinsCache();
  const [focusOnPinOnce, setFocusOnPinOnce] = useAtom(focusOnPinAtom);

  const useOSD = Boolean(plan?.tiles_path);

  // ── State ─────────────────────────────────────────────────────────────────
  const [baseImageSize, setBaseImageSize]   = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded]       = useState(false);
  const [scale,  setScale]                  = useState(1);
  const [offset, setOffset]                 = useState({ x: 0, y: 0 });
  const [pinMode, setPinMode]               = useState(false);
  const [dragging, setDragging]             = useState(false);
  const [hoveredPinId, setHoveredPinId]     = useState(null);
  const [ghostPinPos, setGhostPinPos]       = useState(null);
  const [draggingPin, setDraggingPin]       = useState(null);
  const [pinDragStart, setPinDragStart]     = useState(null);
  const [isDragging, setIsDragging]         = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const baseImageSizeRef   = useRef({ width: 0, height: 0 });
  const scaleRef           = useRef(1);
  const offsetRef          = useRef({ x: 0, y: 0 });
  const imageLayerRef      = useRef(null);
  const pinElemRefs        = useRef({});
  const osdPinElemRefs     = useRef({});
  const osdViewerRef       = useRef(null);
  const osdNativeSize      = useRef({ width: 1, height: 1 });
  const containerRef       = useRef(null);
  const imageRef           = useRef(null);
  const startDragRef       = useRef({ x: 0, y: 0 });
  const pinModeRef         = useRef(false);
  const isDraggingRef      = useRef(false);
  const draggingPinRef     = useRef(null);
  const initialDistanceRef = useRef(null);
  const initialScaleRef    = useRef(1);
  const animFrameRef       = useRef(null);
  const wheelCommitTimer   = useRef(null);
  const pinsRef            = useRef(pins);

  const isGuest = !user || !user.id;

  useEffect(() => { pinModeRef.current  = pinMode;   }, [pinMode]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { pinsRef.current = pins; }, [pins]);

  // ── OSD coordinate helpers ────────────────────────────────────────────────
  const pinToViewport = useCallback((px, py) => {
    const { width, height } = osdNativeSize.current;
    return new OpenSeadragon.Point(px, py * (height / width));
  }, []);

  const viewportToPin = useCallback((vx, vy) => {
    const { width, height } = osdNativeSize.current;
    return { x: vx, y: vy / (height / width) };
  }, []);

  const syncOsdPinPositions = useCallback(() => {
    const v = osdViewerRef.current;
    if (!v || !OpenSeadragon) return;
    for (const pin of pinsRef.current) {
      const el = osdPinElemRefs.current[pin.id];
      if (!el) continue;
      const vp = pinToViewport(pin.x, pin.y);
      const px = v.viewport.viewportToViewerElementCoordinates(vp);
      el.style.transform = `translate(${px.x}px, ${px.y}px) translate(-50%, -50%)`;
    }
  }, [pinToViewport]);

  // ── OSD init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!useOSD || !plan?.tiles_path) return;

    const basePath = `${SUPABASE_STORAGE}/${plan.tiles_path}_files`;
    let destroyed  = false;

    import('openseadragon')
      .then(({ default: OSD }) => {
        if (destroyed) return;
        OpenSeadragon = OSD;

        return fetch(`${basePath}/vips-properties.xml`)
          .then(r => {
            if (!r.ok) throw new Error(`vips-properties.xml ${r.status}`);
            return r.text();
          })
          .then(xml => {
            if (destroyed) return;
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            const get = (name) => parseInt(
              [...doc.querySelectorAll('property')]
                .find(p => p.querySelector('name')?.textContent === name)
                ?.querySelector('value')?.textContent
            );
            const width    = get('width');
            const height   = get('height');
            const maxLevel = Math.ceil(Math.log2(Math.max(width, height)));
            console.log('[OSD] init', { width, height, maxLevel });

            osdNativeSize.current = { width, height };
            baseImageSizeRef.current = { width: width / RENDER_SCALE, height: height / RENDER_SCALE };
            setBaseImageSize({ width: width / RENDER_SCALE, height: height / RENDER_SCALE });

            const viewer = OSD({
              id: `osd-viewer-${plan.id}`,
              prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
              showNavigationControl: false,
              showZoomControl:       false,
              showHomeControl:       false,
              showFullPageControl:   false,
              gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false, scrollToZoom: true, dragToPan: true },
              gestureSettingsTouch: { clickToZoom: false, pinchToZoom: true, dragToPan: true },
              tileSources: {
                width, height,
                tileSize: 512, tileOverlap: 0,
                minLevel: 0, maxLevel,
                getTileUrl(level, x, y) { return `${basePath}/${level}/${x}_${y}.jpeg`; },
              },
            });

            osdViewerRef.current = viewer;

            viewer.addHandler('open', () => {
              setImageLoaded(true);
              setScale(viewer.viewport.getZoom(true));
              syncOsdPinPositions();
            });

            viewer.addHandler('zoom',             ({ zoom }) => setScale(zoom));
            viewer.addHandler('viewport-change',  () => syncOsdPinPositions());

            viewer.addHandler('canvas-click', (e) => {
              if (!pinModeRef.current || !e.quick) return;
              const vp  = viewer.viewport.pointFromPixel(e.position);
              const pin = viewportToPin(vp.x, vp.y);
              handlePinAdd({ x: pin.x, y: pin.y });
            });
          });
      })
      .catch(e => console.error('[OSD] init error', e));

    return () => {
      destroyed = true;
      osdViewerRef.current?.destroy();
      osdViewerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.tiles_path]);

  useEffect(() => {
    if (useOSD) syncOsdPinPositions();
  }, [pins, useOSD, syncOsdPinPositions]);

  // ── Plain-image transform ─────────────────────────────────────────────────
  const applyTransform = useCallback((s, o) => {
    scaleRef.current  = s;
    offsetRef.current = o;
    if (imageLayerRef.current)
      imageLayerRef.current.style.transform = `translate(${o.x}px, ${o.y}px) scale(${s})`;
    const { width, height } = baseImageSizeRef.current;
    if (!width) return;
    const tw = width * RENDER_SCALE, th = height * RENDER_SCALE;
    for (const el of Object.values(pinElemRefs.current)) {
      if (!el) continue;
      const px = parseFloat(el.dataset.px), py = parseFloat(el.dataset.py);
      el.style.transform = `translate(${px * tw * s + o.x}px, ${py * th * s + o.y}px) translate(-50%,-50%)`;
    }
  }, []);

  const commitTransform = useCallback(() => {
    setScale(scaleRef.current);
    setOffset({ ...offsetRef.current });
  }, []);

  const animateTo = useCallback((targetS, targetO, duration = 300) => {
    cancelAnimationFrame(animFrameRef.current);
    const startS = scaleRef.current, startO = { ...offsetRef.current };
    let startTime = null;
    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
    function step(now) {
      if (!startTime) startTime = now;
      const t = Math.min(1, (now - startTime) / duration);
      const e = ease(t);
      applyTransform(startS + (targetS - startS) * e, {
        x: startO.x + (targetO.x - startO.x) * e,
        y: startO.y + (targetO.y - startO.y) * e,
      });
      if (t < 1) animFrameRef.current = requestAnimationFrame(step);
      else commitTransform();
    }
    animFrameRef.current = requestAnimationFrame(step);
  }, [applyTransform, commitTransform]);

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  function zoomButton(factor) {
    if (useOSD) {
      const v = osdViewerRef.current;
      if (!v) return;
      v.viewport.zoomBy(factor);
      v.viewport.applyConstraints();
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const imgX = (cx - offsetRef.current.x) / scaleRef.current;
    const imgY = (cy - offsetRef.current.y) / scaleRef.current;
    const ns = Math.max(0.025, Math.min(scaleRef.current * factor, 5));
    animateTo(ns, { x: cx - imgX * ns, y: cy - imgY * ns });
  }
  const zoomIn  = () => zoomButton(2);
  const zoomOut = () => zoomButton(0.5);

  // ── Wheel (plain-image only) ──────────────────────────────────────────────
  const handleWheel = (e) => {
    if (useOSD) return;
    e.preventDefault();
    cancelAnimationFrame(animFrameRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const imgX = (cx - offsetRef.current.x) / scaleRef.current;
    const imgY = (cy - offsetRef.current.y) / scaleRef.current;
    const ns = Math.max(0.025, Math.min(scaleRef.current * (e.deltaY > 0 ? 0.9 : 1.1), 5));
    applyTransform(ns, { x: cx - imgX * ns, y: cy - imgY * ns });
    clearTimeout(wheelCommitTimer.current);
    wheelCommitTimer.current = setTimeout(commitTransform, 100);
  };

  // ── Mouse pan (plain-image only) ──────────────────────────────────────────
  function onMouseDown(e) {
    if (useOSD || draggingPin) return;
    cancelAnimationFrame(animFrameRef.current);
    setDragging(true);
    startDragRef.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp()    { if (!useOSD && dragging) commitTransform(); setDragging(false); }
  function onMouseLeave() { if (!useOSD && dragging) commitTransform(); setDragging(false); }
  function onMouseMove(e) {
    if (!useOSD && dragging && !draggingPin) {
      const dx = e.clientX - startDragRef.current.x;
      const dy = e.clientY - startDragRef.current.y;
      startDragRef.current = { x: e.clientX, y: e.clientY };
      applyTransform(scaleRef.current, { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy });
    }
    if (pinMode) setGhostPinPos({ x: e.clientX, y: e.clientY });
  }

  // ── Touch (plain-image only) ──────────────────────────────────────────────
  function onTouchStart(e) {
    if (useOSD) return;
    cancelAnimationFrame(animFrameRef.current);
    if (e.touches.length === 1) { setDragging(true); startDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    else if (e.touches.length === 2) { initialDistanceRef.current = getDistance(e.touches); initialScaleRef.current = scaleRef.current; }
  }
  function onTouchMove(e) {
    if (useOSD) return;
    if (e.touches.length === 1 && dragging) {
      const dx = e.touches[0].clientX - startDragRef.current.x;
      const dy = e.touches[0].clientY - startDragRef.current.y;
      startDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      applyTransform(scaleRef.current, { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy });
    } else if (e.touches.length === 2 && initialDistanceRef.current) {
      const factor = getDistance(e.touches) / initialDistanceRef.current;
      const ns = Math.max(0.025, Math.min(initialScaleRef.current * factor, 5));
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const imgX = (cx - offsetRef.current.x) / initialScaleRef.current;
      const imgY = (cy - offsetRef.current.y) / initialScaleRef.current;
      applyTransform(ns, { x: cx - imgX * ns, y: cy - imgY * ns });
    }
    if (pinMode && e.touches.length === 1) setGhostPinPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }
  function onTouchEnd(e) {
    if (useOSD) return;
    setDragging(false);
    if (e.touches.length < 2) { initialDistanceRef.current = null; commitTransform(); }
  }

  // ── Pin drag ──────────────────────────────────────────────────────────────
  const handlePinMouseDown = (e, pin) => {
    e.stopPropagation();
    if (pinMode) return;
    draggingPinRef.current = pin.id;
    setIsDragging(false);
    isDraggingRef.current = false;
    setPinDragStart({ mouseX: e.clientX, mouseY: e.clientY, pinX: pin.x, pinY: pin.y, hasMoved: false });
  };

  const handlePinMouseMove = useCallback((e) => {
    if (!pinDragStart) return;
    if (Math.abs(e.clientX - pinDragStart.mouseX) <= 5 && Math.abs(e.clientY - pinDragStart.mouseY) <= 5) return;
    if (!pinDragStart.hasMoved) {
      setPinDragStart(p => ({ ...p, hasMoved: true }));
      setDraggingPin(draggingPinRef.current);
      setIsDragging(true);
      isDraggingRef.current = true;
    }
    const id = draggingPinRef.current;
    if (!id) return;

    if (useOSD) {
      const v = osdViewerRef.current;
      if (!v || !OpenSeadragon) return;
      const rect  = v.element.getBoundingClientRect();
      const startVP = v.viewport.viewerElementToViewportCoordinates(
        new OpenSeadragon.Point(pinDragStart.mouseX - rect.left, pinDragStart.mouseY - rect.top)
      );
      const currVP = v.viewport.viewerElementToViewportCoordinates(
        new OpenSeadragon.Point(e.clientX - rect.left, e.clientY - rect.top)
      );
      const startPin = viewportToPin(startVP.x, startVP.y);
      const currPin  = viewportToPin(currVP.x,  currVP.y);
      const newX = Math.max(0, Math.min(1, pinDragStart.pinX + (currPin.x - startPin.x)));
      const newY = Math.max(0, Math.min(1, pinDragStart.pinY + (currPin.y - startPin.y)));
      const dragEl = osdPinElemRefs.current[id];
      if (dragEl) {
        const vp2 = pinToViewport(newX, newY);
        const px2 = v.viewport.viewportToViewerElementCoordinates(vp2);
        dragEl.style.transform = `translate(${px2.x}px, ${px2.y}px) translate(-50%, -50%)`;
      }
      patchPin(id, { x: newX, y: newY });
    } else {
      const { width, height } = baseImageSizeRef.current;
      const newX = Math.max(0, Math.min(1, pinDragStart.pinX + (e.clientX - pinDragStart.mouseX) / scaleRef.current / (width * RENDER_SCALE)));
      const newY = Math.max(0, Math.min(1, pinDragStart.pinY + (e.clientY - pinDragStart.mouseY) / scaleRef.current / (height * RENDER_SCALE)));
      const el = pinElemRefs.current[id];
      if (el) {
        el.dataset.px = newX; el.dataset.py = newY;
        const tw = width * RENDER_SCALE, th = height * RENDER_SCALE;
        el.style.transform = `translate(${newX * tw * scaleRef.current + offsetRef.current.x}px, ${newY * th * scaleRef.current + offsetRef.current.y}px) translate(-50%,-50%)`;
      }
      patchPin(id, { x: newX, y: newY });
    }
  }, [pinDragStart, useOSD, viewportToPin, patchPin]);

  const handlePinMouseUp = useCallback(async () => {
    if (pinDragStart && !pinDragStart.hasMoved) {
      setPinDragStart(null); setDraggingPin(null);
      setIsDragging(false); isDraggingRef.current = false;
      draggingPinRef.current = null;
      return;
    }
    const id = draggingPinRef.current;
    if (!id) return;
    const pin = pinsRef.current.find(p => p.id === id);
    if (pin && isDraggingRef.current)
      await supabase.from('pdf_pins').update({ x: pin.x, y: pin.y }).eq('id', pin.id);
    setDraggingPin(null); setPinDragStart(null);
    draggingPinRef.current = null;
    setTimeout(() => { setIsDragging(false); isDraggingRef.current = false; }, 50);
  }, [pinDragStart]);

  useEffect(() => {
    if (!pinDragStart) return;
    window.addEventListener('mousemove', handlePinMouseMove);
    window.addEventListener('mouseup',   handlePinMouseUp);
    return () => {
      window.removeEventListener('mousemove', handlePinMouseMove);
      window.removeEventListener('mouseup',   handlePinMouseUp);
    };
  }, [pinDragStart, handlePinMouseMove, handlePinMouseUp]);

  // ── Focus on pin ──────────────────────────────────────────────────────────
  function focusOnPin(pin) {
    if (useOSD) {
      const v = osdViewerRef.current;
      if (!v || !OpenSeadragon) return;
      v.viewport.panTo(pinToViewport(pin.x, pin.y), false);
      return;
    }
    if (!containerRef.current || !baseImageSizeRef.current.width) return;
    const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
    const pinX = pin.x * baseImageSizeRef.current.width  * RENDER_SCALE;
    const pinY = pin.y * baseImageSizeRef.current.height * RENDER_SCALE;
    animateTo(scaleRef.current, { x: cw / 4 - pinX * scaleRef.current, y: ch / 2 - pinY * scaleRef.current });
  }

  useEffect(() => {
    if (!focusOnPinOnce) return;
    // L'atom peut contenir un pin (« voir sur le plan ») ou un identifiant (snippet).
    const targetId = typeof focusOnPinOnce === 'object' ? focusOnPinOnce.id : focusOnPinOnce;
    const pin = pins.find(p => p.id === targetId);
    if (!pin) return;
    setSelectedPin(pin); focusOnPin(pin); setFocusOnPinOnce(null);
  }, [focusOnPinOnce, pins]);

  useEffect(() => {
    if (selectedPin && !isDragging) {
      const p = pins.find(p => p.id === selectedPin.id);
      if (p) focusOnPin(p);
    }
  }, [selectedPin?.id, isDragging]);

  // ── Image load (plain-image mode) ─────────────────────────────────────────
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
      plan_id: plan.id,
      created_by: user?.id || null,
      updated_by: user?.id || null, updated_at: new Date().toISOString(),

    };
    try {
      const created = await insertPin(newPin);
      addPin(created);
      setSelectedPin(created);
      setPinMode(false);
    } catch (error) {
      console.error('handlePinAdd', error);
      alert("Impossible de créer le pin. Réessayez.");
    }
  };

  // ── Plain-image pins ──────────────────────────────────────────────────────
  const totalW = baseImageSize.width  * RENDER_SCALE;
  const totalH = baseImageSize.height * RENDER_SCALE;

  useEffect(() => {
    if (useOSD) return;
    const { width, height } = baseImageSizeRef.current;
    if (!width) return;
    const tw = width * RENDER_SCALE, th = height * RENDER_SCALE;
    const s = scaleRef.current, o = offsetRef.current;
    for (const el of Object.values(pinElemRefs.current)) {
      if (!el) continue;
      const px = parseFloat(el.dataset.px), py = parseFloat(el.dataset.py);
      el.style.transform = `translate(${px * tw * s + o.x}px, ${py * th * s + o.y}px) translate(-50%,-50%)`;
    }
  }, [pins, useOSD]);

  const plainImagePins = useMemo(() => {
    if (useOSD || !baseImageSize.width) return null;
    return pins.map((pin, idx) => {
      const sx = pin.x * totalW * scaleRef.current + offsetRef.current.x;
      const sy = pin.y * totalH * scaleRef.current + offsetRef.current.y;
      const z  = selectedPin?.id === pin.id ? 3000 : hoveredPinId === pin.id ? 2000 : 10;
      return (
        <div
          key={pin.id}
          data-px={pin.x} data-py={pin.y}
          ref={el => { if (el) pinElemRefs.current[pin.id] = el; else delete pinElemRefs.current[pin.id]; }}
          style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${sx}px, ${sy}px) translate(-50%,-50%)`, pointerEvents: 'auto', zIndex: z, cursor: pinMode ? 'crosshair' : 'move', opacity: draggingPin === pin.id ? 0.7 : 1 }}
          onMouseEnter={() => setHoveredPinId(pin.id)}
          onMouseLeave={() => setHoveredPinId(id => id === pin.id ? null : id)}
          onMouseDown={e => handlePinMouseDown(e, pin)}
          onClick={e => {
            if (isDragging || pinDragStart?.hasMoved || draggingPin) { e.stopPropagation(); return; }
            e.stopPropagation();
            setSelectedPin(pin);
          }}
        >
          <MapPin pin={pin} hovered={hoveredPinId === pin.id} dragging={draggingPin === pin.id} />
        </div>
      );
    });
  }, [pins, baseImageSize, selectedPin?.id, hoveredPinId, pinMode, draggingPin, isDragging, pinDragStart?.hasMoved, useOSD]);

  // ── OSD pins ─────────────────────────────────────────────────────────────
  const osdPins = useMemo(() => {
    if (!useOSD || !imageLoaded) return null;
    return pins.map((pin, idx) => {
      const z = selectedPin?.id === pin.id ? 3000 : hoveredPinId === pin.id ? 2000 : 10;
      return (
        <div
          key={pin.id}
          ref={el => {
            if (el) { osdPinElemRefs.current[pin.id] = el; syncOsdPinPositions(); }
            else    delete osdPinElemRefs.current[pin.id];
          }}
          style={{
            position: 'absolute',
            left: 0, top: 0,
            transform: 'translate(0px, 0px) translate(-50%, -50%)',
            zIndex: z,
            cursor: pinMode ? 'crosshair' : 'move',
            opacity: draggingPin === pin.id ? 0.7 : 1,
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => setHoveredPinId(pin.id)}
          onMouseLeave={() => setHoveredPinId(id => id === pin.id ? null : id)}
          onMouseDown={e => handlePinMouseDown(e, pin)}
          onClick={e => {
            e.stopPropagation();
            if (isDraggingRef.current) return;
            setSelectedPin(pin);
          }}
        >
          <MapPin pin={pin} hovered={hoveredPinId === pin.id} dragging={draggingPin === pin.id} />
        </div>
      );
    });
  }, [pins, selectedPin?.id, hoveredPinId, pinMode, draggingPin, imageLoaded, useOSD]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={GeistSans.className}
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
          cursor: useOSD ? (pinMode ? 'crosshair' : 'default') : (dragging ? 'grabbing' : 'grab'),
          overflow: 'hidden',
          width: '100%',
          height: 'calc(100vh - 64px)',
          position: 'relative',
          backgroundColor: '#fafaf9',
          userSelect: 'none',
        }}
      >
                {/* Controls */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-3">

          {/* Pin mode toggle group */}
          {!isGuest && (
            <div className="flex flex-col bg-white rounded-[6px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] border border-[#e5e5e2] overflow-hidden">
              <button
                onClick={() => setPinMode(false)}
                title="Mode déplacement"
                className={clsx(
                  'p-3 transition-colors border-b border-[#e5e5e2] relative group',
                  !pinMode ? 'bg-[#2f5ee0] text-white' : 'bg-white hover:bg-[#f5f5f4] text-[#8a8a84]'
                )}
              >
                <PointerIcon className="h-[18px] w-[18px]" />
                <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 rounded-[3px] bg-[#0d0d0c] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Déplacer
                </span>
              </button>
              <button
                onClick={() => setPinMode(true)}
                title="Placer un pin"
                className={clsx(
                  'p-3 transition-colors relative group',
                  pinMode ? 'bg-[#2f5ee0] text-white' : 'bg-white hover:bg-[#f5f5f4] text-[#8a8a84]'
                )}
              >
                <MapPinIcon className="h-[18px] w-[18px]" />
                <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 rounded-[3px] bg-[#0d0d0c] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Placer un pin
                </span>
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex flex-col bg-white rounded-[6px] shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)] border border-[#e5e5e2] overflow-hidden">
            <button
              onClick={zoomIn}
              title="Zoomer"
              className="p-3 hover:bg-[#f5f5f4] active:bg-[#eeeeec] transition-colors border-b border-[#e5e5e2] text-[#4a4a46]"
            >
              <ZoomIn className="h-[18px] w-[18px]" />
            </button>
            <div className={clsx('px-2 py-1.5 text-center text-[11px] font-medium text-[#8a8a84] border-b border-[#e5e5e2] select-none', GeistMono.className)}>
              {Math.round(scale * 100)}%
            </div>
            <button
              onClick={zoomOut}
              title="Dézoomer"
              className="p-3 hover:bg-[#f5f5f4] active:bg-[#eeeeec] transition-colors text-[#4a4a46]"
            >
              <ZoomOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* OSD tiled viewer */}
        {useOSD && (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#f5f5f4]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#e5e5e2] border-t-[#2f5ee0] mx-auto mb-4" />
                  <p className="text-[13px] text-[#666660]">Chargement du plan...</p>
                </div>
              </div>
            )}
            <div id={`osd-viewer-${plan.id}`} style={{ position: 'absolute', inset: 0 }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
              {osdPins}
            </div>
          </>
        )}

        {/* Plain image fallback */}
        {!useOSD && (
          <div
            ref={imageLayerRef}
            onClick={handleImageClick}
            style={{
              position: 'absolute',
              width: totalW || 'auto', height: totalH || 'auto',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'top left', willChange: 'transform',
              cursor: pinMode ? 'crosshair' : draggingPin ? 'grabbing' : 'default',
            }}
          >
            {!imageLoaded && (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#e5e5e2] border-t-[#2f5ee0] mx-auto mb-4" />
                  <p className="text-[13px] text-[#666660]">Chargement de l'image...</p>
                </div>
              </div>
            )}
            <img
              ref={imageRef} src={imageUrl} alt="Plan" onLoad={handleImageLoad}
              style={{ display: 'block', width: totalW || 'auto', height: totalH || 'auto', maxWidth: 'none', userSelect: 'none', pointerEvents: 'none', imageRendering: 'crisp-edges' }}
            />
          </div>
        )}

        {/* Plain-image pins */}
        {!useOSD && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
            {plainImagePins}
          </div>
        )}
      </div>

      {/* Ghost pin cursor */}
      {pinMode && ghostPinPos && (
        <div style={{ position: 'fixed', top: ghostPinPos.y, left: ghostPinPos.x, transform: 'translate(-50%, -100%)', pointerEvents: 'none', opacity: 0.5, zIndex: 9999 }}>
          <GhostPin />
        </div>
      )}

      {/* Tiroir du pin sélectionné */}
      <PinDrawer organization_id={organizationId} />
    </>
  );
}