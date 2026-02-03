import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Lexend } from 'next/font/google';
import { useAtom } from 'jotai';
import { categoriesAtom, filteredPinsAtom, focusOnPinAtom, pinsAtom, selectedPinAtom, selectedPlanAtom, selectedProjectAtom, statusesAtom } from '@/store/atoms';
import DrawerHeader from './DrawerHeader';
import DrawerFooter from './DrawerFooter';
import DrawerBody from './DrawerBody';
import MapPin from './MapPin';
import { ZoomIn, ZoomOut, PointerIcon, MapPinIcon } from 'lucide-react';
import GhostPin from './GhostPin';
import { supabase } from '@/utils/supabase/client';

const inter = Lexend({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

function getDistance(touches) {
  if (touches.length < 2) return 0;
  const [t1, t2] = touches;
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Composant de tuile individuelle avec lazy loading
 */
function Tile({ src, x, y, size, scale }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        overflow: 'hidden',
      }}
    >
      {!error && (
        <img
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: '100%',
            height: '100%',
            display: loaded ? 'block' : 'none',
            imageRendering: scale < 0.5 ? 'auto' : 'crisp-edges',
          }}
        />
      )}
      {!loaded && !error && (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f0f0f0',
        }} />
      )}
    </div>
  );
}

export default function TiledImageCanvas({ plan, project, user }) {
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom);
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom);
  const [scale, setScale] = useState(0.25);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom);
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [statuses, setStatuses] = useAtom(statusesAtom);
  const [allPins, setAllPins] = useAtom(pinsAtom);
  const [pins] = useAtom(filteredPinsAtom);
  const [pinMode, setPinMode] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [ghostPinPos, setGhostPinPos] = useState(null);
  const [imageSize, setImageSize] = useState({ width: plan?.width || 0, height: plan?.height || 0 });
  const [containerRect, setContainerRect] = useState({ left: 0, top: 0 });
  const [newComment, setNewComment] = useState(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [focusOnPinOnce, setFocusOnPinOnce] = useAtom(focusOnPinAtom);
  const [touches, setTouches] = useState([]);
  const [initialDistance, setInitialDistance] = useState(null);
  const [initialScale, setInitialScale] = useState(scale);
  const [photoUploadTrigger, setPhotoUploadTrigger] = useState(0);
  const [draggingPin, setDraggingPin] = useState(null);
  const [pinDragStart, setPinDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const draggingPinRef = useRef(null);
  const [tilesBaseUrl, setTilesBaseUrl] = useState('');

  // Charger l'URL de base des tiles
  useEffect(() => {
    if (plan?.tiles_path) {
      const { data } = supabase.storage
        .from('project-plans')
        .getPublicUrl(plan.tiles_path);
      
      setTilesBaseUrl(data.publicUrl);
    }
  }, [plan?.tiles_path]);

  // Calculer les tiles visibles
  const visibleTiles = useMemo(() => {
    if (!imageSize.width || !imageSize.height || !containerRef.current) {
      return [];
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const tileSize = 512;
    
    // Déterminer le niveau de zoom approprié (Deep Zoom structure)
    // Level 0 = image complète à 1x1, chaque niveau double la résolution
    const maxLevel = Math.ceil(Math.log2(Math.max(imageSize.width, imageSize.height) / tileSize));
    const targetLevel = Math.max(0, Math.min(maxLevel, Math.floor(Math.log2(scale) + maxLevel)));
    
    // Dimensions à ce niveau
    const levelScale = Math.pow(2, targetLevel);
    const levelWidth = Math.ceil(imageSize.width / Math.pow(2, maxLevel - targetLevel));
    const levelHeight = Math.ceil(imageSize.height / Math.pow(2, maxLevel - targetLevel));
    
    // Calculer la zone visible
    const visibleLeft = Math.max(0, -offset.x / scale);
    const visibleTop = Math.max(0, -offset.y / scale);
    const visibleRight = Math.min(imageSize.width, (containerRect.width - offset.x) / scale);
    const visibleBottom = Math.min(imageSize.height, (containerRect.height - offset.y) / scale);
    
    // Convertir en coordonnées de tiles
    const startCol = Math.max(0, Math.floor(visibleLeft / tileSize));
    const startRow = Math.max(0, Math.floor(visibleTop / tileSize));
    const endCol = Math.min(Math.ceil(levelWidth / tileSize), Math.ceil(visibleRight / tileSize));
    const endRow = Math.min(Math.ceil(levelHeight / tileSize), Math.ceil(visibleBottom / tileSize));
    
    const tiles = [];
    
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tileUrl = `${tilesBaseUrl}_files/${targetLevel}/${col}_${row}.jpeg`;
        tiles.push({
          key: `${targetLevel}-${col}-${row}`,
          src: tileUrl,
          x: col * tileSize * scale,
          y: row * tileSize * scale,
          size: tileSize * scale,
        });
      }
    }
    
    return tiles;
  }, [scale, offset, imageSize, tilesBaseUrl]);

  const handlePinMouseDown = (e, pin) => {
    e.stopPropagation();
    if (pinMode) return;
    
    draggingPinRef.current = pin.id;
    setIsDragging(false);
    
    setPinDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      pinX: pin.x,
      pinY: pin.y,
      pinId: pin.id,
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
      setIsDragging(true);
    }
    
    const activePinId = draggingPinRef.current;
    if (!activePinId) return;
    
    const mouseDeltaX = (e.clientX - pinDragStart.mouseX) / scale;
    const mouseDeltaY = (e.clientY - pinDragStart.mouseY) / scale;
    
    const newX = pinDragStart.pinX + (mouseDeltaX / imageSize.width);
    const newY = pinDragStart.pinY + (mouseDeltaY / imageSize.height);
    
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
  }, [pinDragStart, scale, imageSize]);

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
      const newX = updatedPin.x;
      const newY = updatedPin.y;
      
      const { error } = await supabase
        .from('pdf_pins')
        .update({ x: newX, y: newY })
        .eq('id', updatedPin.id);
      
      if (error) {
        console.error('Error updating pin position:', error);
      } else {
        console.log('Pin position updated successfully');
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
      const latestPin = pins.find(p => p.id === selectedPin.id);
      if (latestPin) {
        focusOnPin(latestPin);
      }
    }
  }, [selectedPin?.id, isDragging, pins]);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRect({ left: rect.left, top: rect.top });
    }
  }, [imageSize, scale, offset]);

  // Initialiser la taille de l'image depuis le plan
  useEffect(() => {
    if (plan?.width && plan?.height) {
      setImageSize({ width: plan.width, height: plan.height });
    }
  }, [plan?.width, plan?.height]);

  function zoom(factor) {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const imageX = (centerX - offset.x) / scale;
    const imageY = (centerY - offset.y) / scale;

    const newScale = Math.max(0.125, Math.min(scale * factor, 5));

    const newOffsetX = centerX - imageX * newScale;
    const newOffsetY = centerY - imageY * newScale;

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

  const handlePinAdd = async (pin, user) => {
    console.log('handlePinAdd', pin);
    const { error, data } = await supabase.from('pdf_pins').insert(pin).select('*,projects(*),plans(*)').single();
    if (data) {
      console.log('handlePinAdd data', data);
      setSelectedPin(data);
      setAllPins(pins => [...pins, data]);
      setPinMode(false);
      const { data: eventdata, error: eventerror } = await supabase.from('events').insert({
        user_id: data.created_by,
        pin_id: data.id,
        event: ' a créé ce pin',
        category: 'creation'
      }).select('*').single();
      console.log('eventdata', eventdata);
      if (eventerror) {
        console.log('eventerror', eventerror);
      }
    }
    if (error) {
      console.log('handlePinAdd', error);
    }
  };

  function closeDrawer() {
    setSelectedPin(null);
  }

  function focusOnPin(pin) {
    if (!canvasRef.current || !containerRef.current || !imageSize.width) return;

    const pinX = pin.x * imageSize.width;
    const pinY = pin.y * imageSize.height;

    const container = containerRef.current.getBoundingClientRect();
    const centerX = container.width / 4;
    const centerY = container.height / 2;

    const newOffset = {
      x: centerX - pinX * scale,
      y: centerY - pinY * scale,
    };

    setOffset(newOffset);
  }

  function handleCanvasClick(e) {
    if (!pinMode || dragging || !containerRef.current || !canvasRef.current) return;

    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    
    const canvasRect = canvasElement.getBoundingClientRect();
    
    const clickX = e.clientX - canvasRect.left;
    const clickY = e.clientY - canvasRect.top;
    
    const x = clickX / canvasRect.width;
    const y = clickY / canvasRect.height;
    
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    const newPin = {
      category_id: categories.find(c => c.order === 0)?.id,
      x,
      y,
      status_id: statuses.find(s => s.order === 0)?.id,
      note: '',
      name: '',
      project_id: project.id,
      pdf_name: plan.name,
      plan_id: plan.id,
      created_by: user?.id || null,
    };

    handlePinAdd(newPin, user);
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

        {/* Tiled Image + Pins */}
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            width: imageSize.width,
            height: imageSize.height,
            margin: 'auto',
            position: 'relative',
            cursor: pinMode ? 'pointer' : draggingPin ? 'grabbing' : 'default',
            willChange: 'transform',
            backgroundColor: '#fff',
          }}
        >
          {/* Render tiles */}
          {visibleTiles.map(tile => (
            <Tile
              key={tile.key}
              src={tile.src}
              x={tile.x / scale}
              y={tile.y / scale}
              size={tile.size / scale}
              scale={scale}
            />
          ))}

          {/* Pins */}
          {imageSize.width > 0 && pins.map((pin, idx) => {
            const scaledX = pin.x * imageSize.width;
            const scaledY = pin.y * imageSize.height;

            const z =
              selectedPin?.id === pin.id ? 3000 :
              hoveredPinId === pin.id ? 2000 : 10;
            
            const inverseScale = 1 / scale;
            
            return (
              <div
                key={pin.id}
                style={{
                  position: 'absolute',
                  top: scaledY,
                  left: scaledX,
                  transform: `translate(-50%, -50%) scale(${inverseScale})`,
                  transformOrigin: 'center center',
                  pointerEvents: 'auto',
                  zIndex: z,
                  cursor: pinMode ? 'pointer' : 'move',
                  opacity: draggingPin === pin.id ? 0.7 : 1,
                  backfaceVisibility: 'hidden',
                  willChange: 'transform',
                }}
                onMouseEnter={() => setHoveredPinId(pin.id)}
                onMouseLeave={() => setHoveredPinId((id) => (id === pin.id ? null : id))}
                onMouseDown={(e) => handlePinMouseDown(e, pin)}
                onClick={(e) => {
                  if (isDragging || pinDragStart?.hasMoved || draggingPin) {
                    e.stopPropagation();
                    return;
                  }
                  e.stopPropagation();
                  const currentPin = pins.find(p => p.id === pin.id);
                  setSelectedPin({ ...currentPin, index: idx });
                }}
                title={`Pin #${idx + 1}`}
              >
                <div style={{ 
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                }}>
                  <MapPin pin={pin} hovered={hoveredPinId === pin.id} dragging={draggingPin === pin.id} />
                </div>
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
          <div className="flex-1 overflow-y-auto">
            <DrawerBody pin={selectedPin} onClose={closeDrawer} newComment={newComment} photoUploadTrigger={photoUploadTrigger} />
          </div>

          {/* Fixed Footer */}
          <div className="px-5 py-4 border-t border-gray-200 shrink-0">
            <DrawerFooter pin={selectedPin} submit={closeDrawer} onCommentAdded={(comment) => {
              setNewComment(comment);
            }} />
          </div>
        </div>
      )}
    </>
  );
}