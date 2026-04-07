'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, MapPin, Check } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'


const SUPABASE_STORAGE = `https://zvebdabtofcusfdaacrq.supabase.co/storage/v1/object/public/project-plans`

let OSD = null // lazy-loaded OpenSeadragon singleton

// ─── OSD coordinate helpers (same logic as ImageCanvas) ──────────────────────
function makePinToViewport(nativeSize) {
  return (px, py) => {
    const { width, height } = nativeSize
    return new OSD.Point(px, py * (height / width))
  }
}
function makeViewportToPin(nativeSize) {
  return (vx, vy) => {
    const { width, height } = nativeSize
    return { x: vx, y: vy / (height / width) }
  }
}

export default function PlacePinModal({ pin, plans, onClose, onPlaced }) {
  // ── Plan selection state ──────────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState(null)

  // ── Viewer state ──────────────────────────────────────────────────────────
  const [viewerReady, setViewerReady]   = useState(false)
  const [pendingPos, setPendingPos]     = useState(null)   // { x, y } normalized 0-1
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const viewerRef    = useRef(null)   // OSD viewer instance
  const nativeSize   = useRef({ width: 1, height: 1 })
  const markerRef    = useRef(null)   // crosshair DOM el
  const viewerId     = useRef(`place-pin-osd-${Math.random().toString(36).slice(2)}`)

  // ── Destroy viewer on plan change / unmount ───────────────────────────────
  const destroyViewer = useCallback(() => {
    viewerRef.current?.destroy()
    viewerRef.current = null
    setViewerReady(false)
    setPendingPos(null)
    markerRef.current = null
  }, [])

  useEffect(() => () => destroyViewer(), [destroyViewer])

  // ── Init OSD when a plan is selected ─────────────────────────────────────
  useEffect(() => {
    if (!selectedPlan) return
    destroyViewer()
    setError(null)

    const useOSD   = Boolean(selectedPlan.tiles_path)
    const basePath = useOSD ? `${SUPABASE_STORAGE}/${selectedPlan.tiles_path}_files` : null

    const initViewer = (width, height, tileSource) => {
      nativeSize.current = { width, height }
      const pinToViewport  = makePinToViewport(nativeSize.current)
      const viewportToPin  = makeViewportToPin(nativeSize.current)

      const viewer = OSD({
        id: viewerId.current,
        prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
        showNavigationControl: false,
        showZoomControl: false,
        showHomeControl: false,
        showFullPageControl: false,
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false, scrollToZoom: true, dragToPan: true },
        gestureSettingsTouch: { clickToZoom: false, pinchToZoom: true, dragToPan: true },
        tileSources: tileSource,
      })

      viewerRef.current = viewer

      // Marker el — a persistent crosshair that moves on each click
      const marker = document.createElement('div')
      marker.style.cssText = `
        position: absolute; left: 0; top: 0;
        width: 28px; height: 28px;
        pointer-events: none;
        transform: translate(-50%, -50%);
        display: none; z-index: 20;
      `
      marker.innerHTML = `
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="13" fill="white" stroke="#111" stroke-width="1.5"/>
          <circle cx="14" cy="10" r="4.5" fill="#111"/>
          <path d="M14 14.5C14 14.5 9.5 19.5 9.5 22C9.5 24.5 11.5 26 14 26C16.5 26 18.5 24.5 18.5 22C18.5 19.5 14 14.5 14 14.5Z" fill="#111"/>
        </svg>
      `
      markerRef.current = marker
      viewer.canvas.appendChild(marker)

      // Sync marker position on viewport change
      const syncMarker = () => {
        if (!markerRef.current || !pendingPosRef.current) return
        const { x, y } = pendingPosRef.current
        const vp = pinToViewport(x, y)
        const px = viewer.viewport.viewportToViewerElementCoordinates(vp)
        markerRef.current.style.transform = `translate(${px.x}px, ${px.y}px) translate(-50%, -100%)`
      }

      viewer.addHandler('viewport-change', syncMarker)
      viewer.addHandler('open', () => setViewerReady(true))

      // Click → place marker
      viewer.addHandler('canvas-click', (e) => {
        if (!e.quick) return
        const vp  = viewer.viewport.pointFromPixel(e.position)
        const pin = viewportToPin(vp.x, vp.y)
        const pos = {
          x: Math.max(0, Math.min(1, pin.x)),
          y: Math.max(0, Math.min(1, pin.y)),
        }
        setPendingPos(pos)
        pendingPosRef.current = pos

        // Show + position marker
        if (markerRef.current) {
          markerRef.current.style.display = 'block'
          const vpPt = pinToViewport(pos.x, pos.y)
          const px   = viewer.viewport.viewportToViewerElementCoordinates(vpPt)
          markerRef.current.style.transform = `translate(${px.x}px, ${px.y}px) translate(-50%, -100%)`
        }
      })
    }

    import('openseadragon').then(({ default: _OSD }) => {
      OSD = _OSD

      if (useOSD) {
        // Tiled plan — read vips-properties.xml for dimensions
        fetch(`${basePath}/vips-properties.xml`)
          .then(r => r.text())
          .then(xml => {
            const doc = new DOMParser().parseFromString(xml, 'text/xml')
            const get = name => parseInt(
              [...doc.querySelectorAll('property')]
                .find(p => p.querySelector('name')?.textContent === name)
                ?.querySelector('value')?.textContent
            )
            const width    = get('width')
            const height   = get('height')
            const maxLevel = Math.ceil(Math.log2(Math.max(width, height)))
            initViewer(width, height, {
              width, height,
              tileSize: 512, tileOverlap: 0,
              minLevel: 0, maxLevel,
              getTileUrl: (level, x, y) => `${basePath}/${level}/${x}_${y}.jpeg`,
            })
          })
          .catch(() => setError('Impossible de charger le plan tuilé.'))
      } else {
        // Plain image — use SimpleImage tileSource
        const img = new Image()
        img.onload = () => {
          initViewer(img.naturalWidth, img.naturalHeight, {
            type: 'image',
            url: selectedPlan.image_url,
          })
        }
        img.onerror = () => setError('Impossible de charger l\'image du plan.')
        img.src = selectedPlan.image_url
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan?.id])

  // pendingPos ref for use inside OSD closures (avoids stale closure)
  const pendingPosRef = useRef(null)
  useEffect(() => { pendingPosRef.current = pendingPos }, [pendingPos])

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  const zoomIn  = () => { const v = viewerRef.current; if (v) { v.viewport.zoomBy(2); v.viewport.applyConstraints() } }
  const zoomOut = () => { const v = viewerRef.current; if (v) { v.viewport.zoomBy(0.5); v.viewport.applyConstraints() } }

  // ── Confirm placement ─────────────────────────────────────────────────────
  const confirmPlacement = async () => {
    if (!pendingPos || !selectedPlan) return
    setSaving(true)
    setError(null)
    const { data, error: dbError } = await supabase
      .from('pdf_pins')
      .update({
        x: pendingPos.x,
        y: pendingPos.y,
        plan_id: selectedPlan.id,
        pdf_name: selectedPlan.name,
       
      })
      .eq('id', pin.id)
      .select('*,projects(*),plans(*)')
      .single()

    setSaving(false)
    if (dbError) { setError('Erreur lors de la sauvegarde.'); return }
    onPlaced?.(data)
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 780, height: 580 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 shrink-0">
          <div>
            <p className="text-sm font-semibold text-neutral-800">
              {selectedPlan ? 'Cliquez sur le plan pour placer le pin' : 'Choisir un plan'}
            </p>
            {selectedPlan && (
              <p className="text-xs text-neutral-400 mt-0.5">{selectedPlan.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedPlan && (
              <button
                onClick={() => { destroyViewer(); setSelectedPlan(null) }}
                className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
              >
                Changer de plan
              </button>
            )}
            <button
              onClick={onClose}
              className="hover:bg-neutral-100 rounded-full p-1.5 text-neutral-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden bg-neutral-100">

          {/* Plan picker */}
          {!selectedPlan && (
            <div className="absolute inset-0 overflow-y-auto p-4">
              {plans.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-neutral-400">Aucun plan disponible pour ce projet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 hover:shadow-sm transition-all text-left group"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center border border-neutral-200">
                        {plan.image_url ? (
                          <img src={plan.image_url} alt={plan.name} className="w-full h-full object-cover" />
                        ) : (
                          <MapPin size={20} className="text-neutral-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{plan.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {plan.tiles_path ? '🟢 Haute résolution' : '🔵 Image'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OSD viewer */}
          {selectedPlan && (
            <>
              {/* Loading overlay */}
              {!viewerReady && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-neutral-100">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-400 mx-auto mb-3" />
                    <p className="text-sm text-neutral-500">Chargement du plan…</p>
                  </div>
                </div>
              )}

              {/* Cursor hint */}
              {viewerReady && !pendingPos && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                  Cliquez pour positionner le pin
                </div>
              )}

              {/* OSD mount point */}
              <div
                id={viewerId.current}
                className="absolute inset-0"
                style={{ cursor: 'crosshair' }}
              />

              {/* Zoom controls */}
              <div className="absolute top-3 left-3 z-10 flex flex-col bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                <button onClick={zoomIn}  className="p-2 hover:bg-neutral-50 border-b border-neutral-200 transition-colors">
                  <ZoomIn size={15} className="text-neutral-600" />
                </button>
                <button onClick={zoomOut} className="p-2 hover:bg-neutral-50 transition-colors">
                  <ZoomOut size={15} className="text-neutral-600" />
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-lg">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {selectedPlan && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 shrink-0 bg-white">
            <p className="text-xs text-neutral-400">
              {pendingPos
                ? `Position : (${pendingPos.x.toFixed(3)}, ${pendingPos.y.toFixed(3)})`
                : 'Aucune position sélectionnée'}
            </p>
            <button
              onClick={confirmPlacement}
              disabled={!pendingPos || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
            >
              {saving
                ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
                : <><Check size={15} /> Confirmer</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}