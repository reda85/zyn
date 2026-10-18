"use client";

import { FileStack, MapPin, ListChecks, FileText, Mic } from "lucide-react";
import { useInView } from "./useInView";

const ETAPES = [
  {
    icon: FileStack,
    titre: "Importez vos plans",
    texte: "Déposez le PDF : chaque page devient un plan, optimisé pour le mobile. Les nouvelles versions se comparent à l'ancienne.",
    Visuel: VisuelImport,
  },
  {
    icon: MapPin,
    titre: "Relevez sur le chantier",
    texte: "Touchez le plan à l'endroit exact, prenez la photo, dictez la remarque en français ou en darija.",
    Visuel: VisuelReleve,
  },
  {
    icon: ListChecks,
    titre: "Suivez les levées",
    texte: "Chaque réserve passe de « à faire » à « levée ». Les entreprises voient ce qui les concerne, vous voyez les retards.",
    Visuel: VisuelSuivi,
  },
  {
    icon: FileText,
    titre: "Envoyez le rapport",
    texte: "Le compte rendu se génère en PDF ou en Word, avec plans, photos et statuts, à votre en-tête et au logo du client.",
    Visuel: VisuelRapport,
  },
];

const PAS = 0.55; // secondes entre deux étapes

export default function Etapes() {
  const { ref, inView } = useInView<HTMLOListElement>(0.2);
  return (
    <ol ref={ref} className={`et mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative ${inView ? "et-vu" : ""}`}>
      {/* Fil qui relie les étapes et se remplit à l'arrivée */}
      <span aria-hidden="true" className="hidden lg:block absolute left-[12.5%] right-[12.5%] top-[22px] h-px bg-filet">
        <span className="et-fil block h-full bg-tirage origin-left" />
      </span>
      {ETAPES.map(({ icon: Icon, titre, texte, Visuel }, i) => (
        <li key={titre} className="et-carte relative flex flex-col" style={{ ["--d" as string]: `${i * PAS}s` }}>
          <div className="flex lg:justify-center">
            <span className="et-pastille relative z-10 h-11 w-11 rounded-full bg-white border border-filet-fort flex items-center justify-center">
              <Icon className="h-5 w-5 text-encre" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-5 flex-1 rounded-[12px] border border-filet bg-white overflow-hidden hover:border-filet-fort transition-colors">
            <div className="et-visuel relative h-36 bg-papier border-b border-filet overflow-hidden" aria-hidden="true">
              <Visuel />
            </div>
            <div className="p-5">
              <span className="text-[13px] font-medium text-tirage tabular-nums">Étape {i + 1}</span>
              <h3 className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em]">{titre}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-mine">{texte}</p>
            </div>
          </div>
        </li>
      ))}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </ol>
  );
}

/* ── Visuels ─────────────────────────────────────────────────────────────── */

function Grille() {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="et-grille" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="var(--zs-filet)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#et-grille)" />
    </svg>
  );
}

function MiniPlan({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 44" className={className}>
      <rect x="2" y="2" width="56" height="40" fill="white" stroke="var(--zs-encre)" strokeWidth="2" />
      <path d="M2 22H30M30 2V42M30 26H58" stroke="var(--zs-encre)" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function VisuelImport() {
  return (
    <>
      <Grille />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[92px] w-[176px]">
          {["Sous-sol", "R+1", "RDC"].map((n, k) => (
            <div key={n} className="et-page absolute top-0 left-[58px] w-[64px] rounded-[4px] bg-white border border-filet-fort shadow-sm p-1.5" style={{ ["--k" as string]: k }}>
              <MiniPlan className="w-full h-auto" />
              <p className="mt-1 text-[9px] text-mine text-center">{n}</p>
            </div>
          ))}
          <div className="et-pdf absolute top-0 left-[58px] w-[64px] h-[86px] rounded-[4px] bg-white border border-filet-fort shadow-sm flex flex-col items-center justify-center gap-1">
            <FileStack className="h-5 w-5 text-alerte" />
            <span className="text-[10px] font-semibold text-alerte">PDF</span>
          </div>
        </div>
      </div>
    </>
  );
}

function VisuelReleve() {
  return (
    <>
      <Grille />
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        <div className="relative w-[68px] h-[118px] rounded-[12px] border-2 border-encre bg-white p-1.5 translate-y-3">
          <div className="relative">
            <MiniPlan className="w-full h-auto" />
            <span className="et-pin absolute left-[60%] top-[36%] -translate-x-1/2 -translate-y-full">
              <MapPin className="h-4 w-4 fill-alerte text-white" strokeWidth={1.5} />
            </span>
          </div>
          <div className="mt-1.5 h-6 rounded-[3px] bg-voile" />
        </div>
        <div className="w-[128px]">
          <div className="flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-full bg-encre flex items-center justify-center"><Mic className="h-3 w-3 text-white" /></span>
            <span className="flex items-end gap-[2px] h-4">
              {[5, 9, 14, 8, 12, 6, 10, 4].map((h, k) => (
                <span key={k} className="et-onde w-[3px] rounded-full bg-tirage" style={{ height: h, ["--k" as string]: k }} />
              ))}
            </span>
          </div>
          <p className="et-texte mt-2 text-[10px] leading-snug text-encre whitespace-nowrap overflow-hidden">Fissure en pied de voile</p>
          <p className="mt-1 text-[9px] text-mine-clair">Gros œuvre</p>
        </div>
      </div>
    </>
  );
}

function VisuelSuivi() {
  const lignes = [
    { t: "Prise manquante", fin: "valide" },
    { t: "Fuite raccord EF", fin: "tirage" },
    { t: "Reprise d'enduit", fin: "valide" },
  ];
  return (
    <>
      <Grille />
      <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5">
        {lignes.map((l, k) => (
          <div key={l.t} className="flex items-center gap-2 rounded-[6px] bg-white border border-filet px-2.5 py-1.5" style={{ ["--k" as string]: k }}>
            <span className="text-[11px] text-encre flex-1 truncate">{l.t}</span>
            <span className="relative h-[18px] w-[64px] text-[10px] font-medium">
              <span className="et-s1 absolute inset-0 rounded-full bg-voile text-mine flex items-center justify-center">À faire</span>
              <span className="et-s2 absolute inset-0 rounded-full bg-tirage-pale text-tirage flex items-center justify-center">En cours</span>
              {l.fin === "valide" && (
                <span className="et-s3 absolute inset-0 rounded-full bg-valide-pale text-valide flex items-center justify-center">Levée</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function VisuelRapport() {
  return (
    <>
      <Grille />
      <div className="absolute inset-0 flex items-center justify-center gap-3">
        <div className="w-[84px] h-[108px] rounded-[4px] bg-white border border-filet-fort shadow-sm p-2 translate-y-2">
          <div className="flex items-center justify-between">
            <span className="h-2 w-8 rounded-full bg-encre" />
            <span className="h-3 w-3 rounded-[2px] bg-tirage" />
          </div>
          {[100, 80, 92].map((w, k) => (
            <span key={k} className="et-trait block mt-2 h-1 rounded-full bg-filet-fort origin-left" style={{ width: `${w}%`, ["--k" as string]: k }} />
          ))}
          <div className="et-photo mt-2 grid grid-cols-2 gap-1">
            <span className="h-6 rounded-[2px] bg-[#b9b2a4]" />
            <span className="h-6 rounded-[2px] bg-[#8f969b]" />
          </div>
          <span className="et-trait block mt-2 h-1 w-[70%] rounded-full bg-filet-fort origin-left" style={{ ["--k" as string]: 3 }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="et-badge text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-alerte-pale text-alerte" style={{ ["--k" as string]: 0 }}>PDF</span>
          <span className="et-badge text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-tirage-pale text-tirage" style={{ ["--k" as string]: 1 }}>Word</span>
        </div>
      </div>
    </>
  );
}

/* Tout démarre quand la liste entre dans l'écran (.et-vu), étape après étape
   grâce à --d ; --k décale les éléments d'un même visuel. */
const CSS = `
.et .et-carte { opacity: 0; transform: translateY(14px); }
.et-vu .et-carte { animation: et-monte .6s cubic-bezier(.2,.8,.2,1) var(--d) forwards; }
.et .et-fil { transform: scaleX(0); }
.et-vu .et-fil { animation: et-fil ${4 * PAS}s linear .2s forwards; }
.et-vu .et-pastille { animation: et-pastille .5s ease-out calc(var(--d) + .2s) forwards; }

.et .et-page { opacity: 0; }
.et-vu .et-page { animation: et-eventail .6s cubic-bezier(.2,.9,.3,1.2) calc(var(--d) + .5s + var(--k) * .12s) forwards; }
.et-vu .et-pdf { animation: et-pdf .5s ease-in calc(var(--d) + .35s) forwards; }

.et .et-pin { opacity: 0; }
.et-vu .et-pin { animation: et-pin .5s cubic-bezier(.2,1.5,.4,1) calc(var(--d) + .4s) forwards; }
.et-vu .et-onde { animation: et-onde .5s ease-in-out calc(var(--d) + .8s + var(--k) * .06s) 4 alternate; transform-origin: bottom; }
.et .et-texte { width: 0; }
.et-vu .et-texte { animation: et-tape 1.4s steps(24, end) calc(var(--d) + 1s) forwards; }

.et .et-s2, .et .et-s3 { opacity: 0; }
.et-vu .et-s2 { animation: et-apparait .3s ease-out calc(var(--d) + .7s + var(--k) * .25s) forwards; }
.et-vu .et-s3 { animation: et-apparait .3s ease-out calc(var(--d) + 1.5s + var(--k) * .25s) forwards; }

.et .et-trait { transform: scaleX(0); }
.et-vu .et-trait { animation: et-trait .45s ease-out calc(var(--d) + .4s + var(--k) * .15s) forwards; }
.et .et-photo, .et .et-badge { opacity: 0; }
.et-vu .et-photo { animation: et-apparait .4s ease-out calc(var(--d) + .75s) forwards; }
.et-vu .et-badge { animation: et-pop .4s cubic-bezier(.2,1.5,.4,1) calc(var(--d) + 1.2s + var(--k) * .15s) forwards; }

@keyframes et-monte { to { opacity: 1; transform: none; } }
@keyframes et-fil { to { transform: scaleX(1); } }
@keyframes et-pastille { 0% { border-color: var(--zs-filet-fort); } 100% { border-color: var(--zs-tirage); box-shadow: 0 0 0 4px var(--zs-tirage-pale); } }
@keyframes et-pdf { to { opacity: 0; transform: scale(.85); } }
@keyframes et-eventail { from { opacity: 0; transform: none; } to { opacity: 1; transform: translateX(calc((var(--k) - 1) * 56px)) rotate(calc((var(--k) - 1) * 4deg)); } }
@keyframes et-pin { from { opacity: 0; transform: translate(-50%, -160%); } to { opacity: 1; transform: translate(-50%, -100%); } }
@keyframes et-onde { from { transform: scaleY(1); } to { transform: scaleY(.35); } }
@keyframes et-tape { to { width: 100%; } }
@keyframes et-apparait { to { opacity: 1; } }
@keyframes et-trait { to { transform: scaleX(1); } }
@keyframes et-pop { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .et .et-carte, .et .et-page, .et .et-pin, .et .et-s2, .et .et-s3, .et .et-photo, .et .et-badge { opacity: 1; transform: none; animation: none !important; }
  .et .et-fil, .et .et-trait { transform: none; animation: none !important; }
  .et .et-texte { width: 100%; animation: none !important; }
  .et .et-pdf { display: none; }
  .et .et-page { transform: translateX(calc((var(--k) - 1) * 56px)) rotate(calc((var(--k) - 1) * 4deg)); }
}
`;
