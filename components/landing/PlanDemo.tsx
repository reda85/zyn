"use client";

import { useState } from "react";
import { useInView } from "./useInView";
import { RotateCcw, Camera, FileText } from "lucide-react";

// Réserves de la démonstration : position sur le plan (repère 0-640 × 0-420),
// lot, statut, nombre de photos. Elles apparaissent une par une, puis le
// rapport se compose.
const RESERVES = [
  { n: 1, x: 140, y: 120, titre: "Fissure en pied de voile", lot: "Gros œuvre", statut: "bloque", photos: 2 },
  { n: 2, x: 400, y: 95, titre: "Prise manquante, chambre 1", lot: "Électricité", statut: "valider", photos: 1 },
  { n: 3, x: 255, y: 380, titre: "Fuite au raccord EF, SDB", lot: "Plomberie", statut: "bloque", photos: 3 },
  { n: 4, x: 90, y: 420, titre: "Reprise d'enduit, cuisine", lot: "Peinture", statut: "valider", photos: 1 },
  { n: 5, x: 470, y: 430, titre: "Garde-corps conforme", lot: "Serrurerie", statut: "leve", photos: 2 },
] as const;

const STATUT = {
  bloque: { couleur: "var(--zs-alerte)", libelle: "Bloquée" },
  valider: { couleur: "var(--zs-tirage)", libelle: "À valider" },
  leve: { couleur: "var(--zs-valide)", libelle: "Levée" },
} as const;

const PAS = 0.9; // secondes entre deux réserves
const DEBUT = 0.6;
const FIN = DEBUT + RESERVES.length * PAS;

const CSS = `
        .pd-pin { opacity: 0; }
        .pd-vu .pd-pin { animation: pd-pose .5s cubic-bezier(.2,1.4,.4,1) forwards; }
        .pd-onde { opacity: 0; }
        .pd-vu .pd-onde { animation: pd-onde 1.1s ease-out forwards; }
        .pd-ligne { opacity: 0; }
        .pd-vu .pd-ligne { animation: pd-ligne .45s ease-out forwards; }
        .pd-rapport { opacity: .35; }
        .pd-vu .pd-rapport { animation: pd-rapport .4s ease-out forwards; }
        .pd-barre { width: 0; }
        .pd-vu .pd-barre { animation: pd-barre 1.2s cubic-bezier(.4,0,.2,1) forwards; }
        .pd-pret, .pd-rejouer { opacity: 0; }
        .pd-pdf { opacity: 0; }
        .pd-vu .pd-pdf { animation: pd-pdf .7s cubic-bezier(.2,1.2,.4,1) forwards; }
        .pd-vu .pd-pret, .pd-vu .pd-rejouer { animation: pd-apparait .4s ease-out forwards; }
        .pd-compteur::before { content: "0"; font-weight: 600; color: var(--zs-encre); }
        .pd-vu .pd-compteur::before { animation: pd-compte ${RESERVES.length * PAS}s steps(${RESERVES.length}, end) ${DEBUT + 0.3}s forwards; }
        @keyframes pd-pose { from { opacity: 0; transform: translateY(-18px) scale(.6); } to { opacity: 1; transform: none; } }
        @keyframes pd-onde { 0% { opacity: .35; transform: scale(.5); } 100% { opacity: 0; transform: scale(1.8); } }
        @keyframes pd-ligne { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
        @keyframes pd-rapport { to { opacity: 1; border-color: var(--zs-tirage-clair); } }
        @keyframes pd-barre { to { width: 100%; } }
        @keyframes pd-apparait { to { opacity: 1; } }
        @keyframes pd-pdf { from { opacity: 0; transform: translateY(40px) scale(.85) rotate(0); } to { opacity: 1; transform: rotate(3deg); } }
        @keyframes pd-compte { 0% { content: "0"; } 20% { content: "1"; } 40% { content: "2"; } 60% { content: "3"; } 80% { content: "4"; } 100% { content: "5"; } }
        @media (prefers-reduced-motion: reduce) {
          .pd-pin, .pd-ligne, .pd-rapport, .pd-pret, .pd-rejouer { animation: none !important; opacity: 1; }
          .pd-pdf { animation: none !important; opacity: 1; transform: rotate(3deg); }
          .pd-onde { display: none; }
          .pd-barre { animation: none !important; width: 100%; }
          .pd-compteur::before { animation: none !important; content: "5"; }
        }
      `;

export default function PlanDemo() {
  const [tour, setTour] = useState(0);
  // Sur mobile la démonstration est sous les boutons : elle démarre quand on la voit.
  const { ref, inView } = useInView<HTMLDivElement>(0.4, "0px");

  return (
    <div ref={ref}>
    <figure className={`pd relative ${inView ? "pd-vu" : ""}`} key={tour} aria-label="Démonstration : cinq réserves placées sur un plan, puis le rapport de visite généré">
      <div className="rounded-[14px] border border-filet bg-white shadow-[0_30px_80px_-30px_rgba(28,28,26,0.35)] overflow-hidden">
        {/* Barre de l'outil, comme dans l'application */}
        <div className="flex items-center gap-3 h-11 px-4 border-b border-filet bg-white">
          <span className="text-[13px] font-semibold text-encre truncate">Résidence Al Andalous</span>
          <span className="text-[12px] text-mine-clair hidden sm:inline">Niveau R+1</span>
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-mine tabular-nums">
            <span className="pd-compteur" aria-hidden="true" />
            réserves
          </span>
        </div>

        <div className="grid sm:grid-cols-[minmax(0,1fr)_220px]">
          {/* Plan */}
          <div className="relative bg-papier border-b sm:border-b-0 sm:border-r border-filet flex items-center p-2">
            <svg viewBox="0 0 600 560" preserveAspectRatio="xMidYMid meet" className="block w-full h-auto" role="img" aria-label="Plan du niveau R+1 avec cinq réserves">
              <defs>
                <pattern id="pd-grille" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0H0V20" fill="none" stroke="var(--zs-filet)" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="600" height="560" fill="url(#pd-grille)" />
              <g transform="translate(20 20)">
                <g className="pd-murs" fill="none" stroke="var(--zs-encre)" strokeLinecap="square">
                  <rect x="0" y="0" width="560" height="520" strokeWidth="6" />
                  <path d="M0 250H320M320 0V520M320 290H560M180 250V520M440 290V520" strokeWidth="3.5" />
                </g>
                {/* Portes */}
                <g stroke="var(--zs-papier)" strokeWidth="7">
                  <path d="M80 250h44M230 250h44M360 290h44M480 290h44M180 360v40M320 120v40" />
                </g>
                <g fill="none" stroke="var(--zs-trait)" strokeWidth="1">
                  <path d="M80 250a44 44 0 0 1 44-44M230 250a44 44 0 0 0 44-44M360 290a44 44 0 0 1 44 44" />
                </g>
                {/* Escalier */}
                <g stroke="var(--zs-trait)" strokeWidth="1">
                  {Array.from({ length: 9 }, (_, i) => (
                    <path key={i} d={`M${440 + i * 12} 24v170`} />
                  ))}
                </g>
                <g fill="var(--zs-mine-clair)" fontSize="14" fontFamily="var(--font-geist-sans), system-ui" textAnchor="middle">
                  <text x="160" y="190">Séjour</text>
                  <text x="380" y="240">Chambre 1</text>
                  <text x="90" y="490">Cuisine</text>
                  <text x="250" y="490">SDB</text>
                  <text x="500" y="490">Chambre 2</text>
                </g>
                {RESERVES.map((r, i) => {
                  const c = STATUT[r.statut].couleur;
                  const d = DEBUT + i * PAS;
                  return (
                    <g key={r.n} className="pd-pin" style={{ animationDelay: `${d}s`, transformOrigin: `${r.x}px ${r.y}px` }}>
                      <circle cx={r.x} cy={r.y} r="26" fill={c} className="pd-onde" style={{ animationDelay: `${d + 0.25}s`, transformOrigin: `${r.x}px ${r.y}px` }} />
                      <circle cx={r.x} cy={r.y} r="18" fill="white" />
                      <circle cx={r.x} cy={r.y} r="15" fill={c} />
                      <text x={r.x} y={r.y + 5} fontSize="14" fontWeight="600" fill="white" textAnchor="middle" fontFamily="var(--font-geist-sans), system-ui">
                        {r.n}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Liste qui devient le rapport */}
          <div className="flex flex-col bg-white">
            <ul className="flex-1 divide-y divide-voile">
              {RESERVES.map((r, i) => (
                <li key={r.n} className="pd-ligne px-3.5 py-2.5" style={{ animationDelay: `${DEBUT + i * PAS + 0.15}s` }}>
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-0.5 h-4 w-4 rounded-full text-[9px] font-semibold text-white flex items-center justify-center shrink-0"
                      style={{ background: STATUT[r.statut].couleur }}
                    >
                      {r.n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-encre leading-snug truncate">{r.titre}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-mine-clair">
                        <span>{r.lot}</span>
                        <span className="flex items-center gap-0.5 tabular-nums">
                          <Camera className="h-3 w-3" aria-hidden="true" />
                          {r.photos}
                        </span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-3 border-t border-filet">
              <div className="pd-rapport rounded-[8px] border border-filet px-3 py-2.5" style={{ animationDelay: `${FIN}s` }}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-tirage shrink-0" aria-hidden="true" />
                  <span className="text-[12px] font-medium text-encre">Rapport de visite</span>
                  <span className="ml-auto text-[11px] text-mine-clair">PDF</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-voile overflow-hidden">
                  <div className="pd-barre h-full bg-tirage" style={{ animationDelay: `${FIN + 0.2}s` }} />
                </div>
                <p className="pd-pret mt-1.5 text-[11px] text-valide font-medium" style={{ animationDelay: `${FIN + 1.5}s` }}>
                  Prêt à envoyer au maître d’ouvrage
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PagePdf delai={FIN + 1.5} />

      <button
        type="button"
        onClick={() => setTour((t) => t + 1)}
        className="pd-rejouer absolute -bottom-10 left-0 inline-flex items-center gap-1.5 text-[12px] text-mine hover:text-encre transition-colors"
        style={{ animationDelay: `${FIN + 1.8}s` }}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Rejouer
      </button>

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </figure>
    </div>
  );
}

// Première page du rapport généré : elle sort de la carte « Rapport de visite »
// une fois la barre remplie. Plan miniature avec les réserves, puis la liste.
function PagePdf({ delai }: { delai: number }) {
  return (
    <div
      className="pd-pdf absolute -right-2 sm:-right-7 lg:-right-16 -bottom-12 sm:-bottom-14 lg:-bottom-20 w-[172px] sm:w-[196px] rounded-[6px] border border-filet bg-white p-3 shadow-[0_24px_50px_-18px_rgba(28,28,26,0.45)]"
      style={{ animationDelay: `${delai}s`, transformOrigin: "80% 100%" }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-encre" />
          <span className="text-[8px] font-semibold tracking-[-0.01em] text-encre">Agence Benali</span>
        </span>
        <span className="rounded-[3px] bg-alerte px-1 py-px text-[7px] font-semibold text-white">PDF</span>
      </div>
      <p className="mt-2 text-[10px] font-semibold leading-tight text-encre">Rapport de visite n° 12</p>
      <p className="text-[7.5px] text-mine-clair">Résidence Al Andalous · Niveau R+1</p>
      <svg viewBox="0 0 120 70" className="mt-2 block w-full rounded-[3px] bg-papier">
        <g fill="none" stroke="var(--zs-encre)">
          <rect x="6" y="5" width="108" height="60" strokeWidth="1.4" />
          <path d="M6 34H68M68 5V65M68 39H114M40 34V65M91 39V65" strokeWidth=".8" />
        </g>
        {RESERVES.map((r) => (
          <circle key={r.n} cx={6 + (r.x / 560) * 108} cy={5 + (r.y / 520) * 60} r="3" fill={STATUT[r.statut].couleur} />
        ))}
      </svg>
      <ul className="mt-2 space-y-1">
        {RESERVES.slice(0, 4).map((r) => (
          <li key={r.n} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUT[r.statut].couleur }} />
            <span className="truncate text-[7.5px] text-encre">{r.titre}</span>
            <span className="ml-auto flex gap-0.5">
              {Array.from({ length: Math.min(r.photos, 2) }, (_, k) => <span key={k} className="h-2.5 w-3 rounded-[1px] bg-voile" />)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-voile pt-1.5 text-[7px] text-mine-clair">
        <span>5 réserves · 9 photos</span>
        <span>1 / 3</span>
      </div>
    </div>
  );
}
