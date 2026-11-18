"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Démonstration animée de ZaynSpace (vidéo muette en boucle, 16:9), produite par
 * marketing/motion/zaynspace/render.mjs --land.
 *
 * Rien n'est téléchargé avant que la vidéo n'approche de l'écran ; elle se met
 * en pause hors de l'écran. Si le visiteur a demandé moins d'animations, seule
 * l'image fixe s'affiche et la lecture reste à sa main. Un bouton permet de
 * mettre en pause à tout moment (contenu animé de plus de cinq secondes).
 */
// La vidéo n'est demandée qu'au premier affichage : MP4 (H.264), ou WebM (VP9)
// pour les navigateurs sans H.264.
function charger(v: HTMLVideoElement) {
  if (v.getAttribute("src")) return;
  v.src = v.canPlayType('video/mp4; codecs="avc1.640028"') ? "/landing/zaynspace-demo.mp4" : "/landing/zaynspace-demo.webm";
}

export default function DemoVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [enLecture, setEnLecture] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (reduit || v.dataset.pause) return;
        charger(v);
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }, { threshold: 0.25 });
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  const basculer = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) { delete v.dataset.pause; charger(v); v.play().catch(() => {}); }
    else { v.dataset.pause = "1"; v.pause(); }
  };

  return (
    <figure>
      <div className="relative overflow-hidden rounded-[14px] border border-filet bg-papier shadow-[0_30px_80px_-30px_rgba(28,28,26,0.35)]">
        <video
          ref={video}
          className="block w-full h-auto aspect-video"
          width={1920}
          height={1080}
          poster="/landing/zaynspace-demo-poster.webp"
          muted
          loop
          playsInline
          preload="none"
          aria-label="Démonstration de ZaynSpace : import des plans, réserves posées sur le plan depuis le téléphone, photo et remarque dictée, suivi des levées, versions de plans, planning, rapport de visite et invités"
          onPlay={() => setEnLecture(true)}
          onPause={() => setEnLecture(false)}
        />
        <button
          type="button"
          onClick={basculer}
          className="absolute right-2 bottom-2 sm:right-3.5 sm:bottom-3.5 h-8 sm:h-9 px-2 sm:pl-3 sm:pr-3.5 inline-flex items-center gap-2 rounded-[8px] bg-[rgba(28,28,26,0.82)] text-white text-[14px] font-medium hover:bg-encre transition-colors"
          aria-label={enLecture ? "Mettre la démonstration en pause" : "Lire la démonstration"}
        >
          {enLecture ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{enLecture ? "Pause" : "Lire"}</span>
        </button>
      </div>
      <figcaption className="mt-3 text-[13px] text-mine">
        Le projet de démonstration « Résidence Al Andalous » : données fictives.
      </figcaption>
    </figure>
  );
}
