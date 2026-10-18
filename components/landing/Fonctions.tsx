"use client";

import { MapPin, Camera, Mic, Layers, FileText, CalendarRange, Users, Calendar, User } from "lucide-react";
import { useInView } from "./useInView";

/** Fonctionnalités en mosaïque : chaque tuile montre la fonction plutôt que de la décrire. */
export default function Fonctions() {
  return (
    <div className="fn mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Tuile className="md:col-span-2 lg:row-span-2" icon={MapPin} titre="Réserves sur plan" texte="Chaque observation est un point sur le plan, numéroté, avec son lot, son statut, son échéance et son responsable." k={0}>
        <VisuelReserves />
      </Tuile>
      <Tuile icon={Mic} titre="Dictée en darija et en français" texte="Parlez au lieu de taper : la remarque s'écrit pendant que vous marchez." k={1}>
        <VisuelDictee />
      </Tuile>
      <Tuile icon={Camera} titre="Photos localisées" texte="Rattachées à la réserve, avec leur position GPS, annotables sur le téléphone." k={2}>
        <VisuelPhoto />
      </Tuile>
      <Tuile icon={Layers} titre="Versions de plans" texte="Remplacez un plan par son indice suivant : les différences s'affichent." k={3}>
        <VisuelVersions />
      </Tuile>
      <Tuile icon={FileText} titre="Rapports PDF et Word" texte="Modèles personnalisables : sections, ordre, galerie photo, en-tête et logo du client." k={4}>
        <VisuelRapports />
      </Tuile>
      <Tuile icon={CalendarRange} titre="Planning" texte="Un Gantt simple pour suivre les lots et les échéances, à côté des réserves." k={5}>
        <VisuelPlanning />
      </Tuile>
      <Tuile className="md:col-span-2 lg:col-span-3" icon={Users} titre="Invités gratuits" texte="Entreprises, bureaux de contrôle et clients rejoignent le projet sans licence, avec des droits limités à ce qui les concerne." k={6} horizontal>
        <VisuelInvites />
      </Tuile>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  );
}

function Tuile({
  icon: Icon, titre, texte, children, className = "", k, horizontal = false,
}: {
  icon: React.ComponentType<{ className?: string }>; titre: string; texte: string; children: React.ReactNode; className?: string; k: number; horizontal?: boolean;
}) {
  // Chaque tuile se joue quand elle-même arrive à l'écran (sur mobile, au fil du défilement).
  const { ref, inView } = useInView<HTMLElement>(0.35);
  return (
    <article
      ref={ref}
      className={`fn-tuile ${inView ? "fn-vu" : ""} group rounded-[14px] border border-filet bg-white overflow-hidden flex ${horizontal ? "flex-col md:flex-row" : "flex-col"} hover:border-filet-fort hover:shadow-[0_12px_32px_-18px_rgba(28,28,26,0.35)] transition-[border-color,box-shadow] ${className}`}
      style={{ ["--k" as string]: k }}
    >
      <div className={`relative bg-papier overflow-hidden ${horizontal ? "md:w-[55%] min-h-[190px] border-b md:border-b-0 md:border-r" : "flex-1 min-h-[150px] border-b"} border-filet`} aria-hidden="true">
        {children}
      </div>
      <div className={`p-5 ${horizontal ? "md:flex-1 md:flex md:flex-col md:justify-center md:p-8" : ""}`}>
        <h3 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em]">
          <Icon className="h-[18px] w-[18px] text-tirage" />
          {titre}
        </h3>
        <p className="mt-1.5 text-[14px] leading-[1.6] text-mine">{texte}</p>
      </div>
    </article>
  );
}

function Grille({ id }: { id: string }) {
  return (
    <svg className="absolute inset-0 h-full w-full">
      <defs>
        <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M18 0H0V18" fill="none" stroke="var(--zs-filet)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ── Réserves sur plan : un plan, des pins, la fiche de la réserve ouverte ── */
function VisuelReserves() {
  const pins = [
    { x: 22, y: 30, c: "var(--zs-valide)", n: 12 },
    { x: 64, y: 22, c: "var(--zs-tirage)", n: 13 },
    { x: 40, y: 66, c: "var(--zs-alerte)", n: 14, actif: true },
    { x: 78, y: 70, c: "var(--zs-tirage)", n: 15 },
  ];
  return (
    <div className="absolute inset-0">
      <Grille id="fn-g1" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-[8%] w-[84%] h-[84%]">
        <g fill="none" stroke="var(--zs-encre)" vectorEffect="non-scaling-stroke">
          <rect x="0" y="0" width="100" height="100" strokeWidth="5" vectorEffect="non-scaling-stroke" />
          <path d="M0 48H52M52 0V100M52 56H100M28 48V100M78 56V100" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <div className="absolute inset-[8%]">
        {pins.map((p) => (
          <span
            key={p.n}
            className={`fn-pin absolute -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 border-white text-[10px] font-semibold text-white flex items-center justify-center shadow ${p.actif ? "fn-pin-actif" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.c }}
          >
            {p.n}
          </span>
        ))}
        {/* Fiche de la réserve 14 */}
        <div className="fn-fiche absolute left-[47%] top-[30%] w-[min(250px,48%)] rounded-[10px] bg-white border border-filet shadow-[0_16px_40px_-16px_rgba(28,28,26,0.4)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-alerte text-white font-medium">Bloquée</span>
            <span className="ml-auto font-mono text-[10px] text-mine-clair">#14</span>
          </div>
          <p className="mt-2 text-[13px] font-semibold text-encre leading-snug">Fuite au raccord de la colonne EF</p>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
            <span className="flex items-center gap-1 rounded-[5px] border border-filet px-1.5 py-1 text-mine truncate"><User className="h-3 w-3 shrink-0" />Plomberie Atlas</span>
            <span className="flex items-center gap-1 rounded-[5px] border border-alerte-clair bg-alerte-pale px-1.5 py-1 text-alerte"><Calendar className="h-3 w-3 shrink-0" />12 oct.</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <span className="h-9 rounded-[3px] bg-[#b4ab9c]" />
            <span className="h-9 rounded-[3px] bg-[#8d949a]" />
            <span className="h-9 rounded-[3px] bg-[#a39c91]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisuelDictee() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-5 gap-3">
      <div className="flex items-center gap-2.5">
        <span className="fn-micro h-9 w-9 rounded-full bg-alerte flex items-center justify-center"><Mic className="h-4 w-4 text-white" /></span>
        <span className="flex items-center gap-[3px] h-8">
          {[8, 14, 22, 12, 28, 18, 10, 24, 16, 9, 20, 13, 7, 17, 11].map((h, i) => (
            <span key={i} className="fn-onde w-[3px] rounded-full bg-encre" style={{ height: h, ["--i" as string]: i }} />
          ))}
        </span>
      </div>
      <div className="rounded-[8px] bg-white border border-filet px-3 py-2">
        <p className="fn-tape text-[12px] text-encre whitespace-nowrap overflow-hidden">Enduit irrégulier sur le mur pignon</p>
        <div className="mt-1.5 flex gap-1.5">
          <span className="text-[10px] px-1.5 py-px rounded-full bg-voile text-mine">Français</span>
          <span className="text-[10px] px-1.5 py-px rounded-full bg-voile text-mine">Darija</span>
        </div>
      </div>
    </div>
  );
}

function VisuelPhoto() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[220px] aspect-[4/3] rounded-[8px] overflow-hidden" style={{ background: "linear-gradient(160deg,#c9c1b2 0%,#a69d8e 55%,#7d776d 100%)" }}>
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[#6f6a61]" />
        <div className="absolute left-[14%] top-[18%] h-[40%] w-[30%] bg-[#d8d1c3]" />
        <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full">
          <ellipse cx="62" cy="40" rx="15" ry="10" fill="none" stroke="var(--zs-alerte)" strokeWidth="2" className="fn-cercle" pathLength={1} />
        </svg>
        <span className="absolute left-2 bottom-2 flex items-center gap-1 rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[10px] text-white tabular-nums">
          <MapPin className="h-3 w-3" />33,573° N 7,589° O
        </span>
      </div>
    </div>
  );
}

function VisuelVersions() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-3 px-4">
      <div className="w-[42%]">
        <svg viewBox="0 0 80 60" className="w-full h-auto">
          <rect x="2" y="2" width="76" height="56" fill="white" stroke="var(--zs-encre)" strokeWidth="2.5" />
          <path d="M2 30H44M44 2V58" stroke="var(--zs-encre)" strokeWidth="1.5" fill="none" />
          <path d="M44 30H78" stroke="var(--zs-alerte)" strokeWidth="2" strokeDasharray="3 2" fill="none" className="fn-retire" />
        </svg>
        <p className="mt-1 text-[10px] text-mine text-center">Indice A</p>
      </div>
      <span className="text-mine-clair text-[16px]">→</span>
      <div className="w-[42%]">
        <svg viewBox="0 0 80 60" className="w-full h-auto">
          <rect x="2" y="2" width="76" height="56" fill="white" stroke="var(--zs-encre)" strokeWidth="2.5" />
          <path d="M2 30H44M44 2V58" stroke="var(--zs-encre)" strokeWidth="1.5" fill="none" />
          <path d="M60 2V58" stroke="var(--zs-tirage)" strokeWidth="2.5" fill="none" className="fn-ajout" pathLength={1} />
          <rect x="50" y="10" width="20" height="12" fill="var(--zs-tirage-pale)" stroke="var(--zs-tirage)" strokeWidth="1" className="fn-zone" />
        </svg>
        <p className="mt-1 text-[10px] text-mine text-center">Indice B</p>
      </div>
    </div>
  );
}

function VisuelRapports() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[{ r: -8, x: -46, t: "Word", c: "text-tirage" }, { r: 6, x: 46, t: "PDF", c: "text-alerte" }].map((d) => (
        <div key={d.t} className="fn-doc absolute w-[88px] h-[112px] rounded-[5px] bg-white border border-filet-fort shadow-sm p-2" style={{ ["--r" as string]: `${d.r}deg`, ["--x" as string]: `${d.x}px` }}>
          <div className="flex items-center justify-between">
            <span className="h-1.5 w-8 rounded-full bg-encre" />
            <span className={`text-[9px] font-bold ${d.c}`}>{d.t}</span>
          </div>
          <span className="block mt-2 h-1 w-full rounded-full bg-filet-fort" />
          <span className="block mt-1.5 h-1 w-4/5 rounded-full bg-filet-fort" />
          <div className="mt-2 grid grid-cols-2 gap-1">
            <span className="h-5 rounded-[2px] bg-[#b4ab9c]" />
            <span className="h-5 rounded-[2px] bg-[#8d949a]" />
          </div>
          <span className="block mt-2 h-1 w-full rounded-full bg-filet-fort" />
          <span className="block mt-1.5 h-1 w-3/5 rounded-full bg-filet-fort" />
        </div>
      ))}
    </div>
  );
}

function VisuelPlanning() {
  const lots = [
    { n: "Gros œuvre", d: 0, l: 45, c: "bg-encre" },
    { n: "Plomberie", d: 30, l: 35, c: "bg-tirage" },
    { n: "Électricité", d: 38, l: 40, c: "bg-tirage" },
    { n: "Peinture", d: 66, l: 30, c: "bg-valide" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5">
      {lots.map((l, i) => (
        <div key={l.n} className="flex items-center gap-2">
          <span className="w-[62px] shrink-0 text-[10px] text-mine truncate">{l.n}</span>
          <span className="relative flex-1 h-3 rounded-full bg-voile">
            <span className={`fn-barre absolute top-0 h-3 rounded-full ${l.c}`} style={{ left: `${l.d}%`, width: `${l.l}%`, ["--i" as string]: i }} />
          </span>
        </div>
      ))}
      <div className="relative ml-[70px] h-3">
        <span className="absolute left-[52%] -top-[78px] h-[84px] w-px bg-alerte" />
        <span className="absolute left-[52%] top-0 -translate-x-1/2 text-[9px] text-alerte">Aujourd’hui</span>
      </div>
    </div>
  );
}

function VisuelInvites() {
  const roles = [
    { n: "Entreprise de plomberie", i: "PA", c: "#2c4f91" },
    { n: "Bureau de contrôle", i: "BC", c: "#2f6b4a" },
    { n: "Maître d’ouvrage", i: "MO", c: "#1c1c1a" },
  ];
  return (
    <div className="absolute inset-0 flex items-center px-6 md:px-10">
      <ul className="w-full space-y-2">
        {roles.map((r, k) => (
          <li key={r.n} className="fn-invite flex items-center gap-3 rounded-[8px] bg-white border border-filet px-3 py-2" style={{ ["--i" as string]: k }}>
            <span className="h-7 w-7 rounded-full text-[10px] font-semibold text-white flex items-center justify-center shrink-0" style={{ background: r.c }}>{r.i}</span>
            <span className="text-[12px] text-encre flex-1 truncate">{r.n}</span>
            <span className="text-[11px] text-mine">Invité</span>
            <span className="text-[11px] font-semibold text-valide tabular-nums">0 MAD</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CSS = `
.fn-tuile { --kd: 0s; }
@media (min-width: 1024px) { .fn-tuile { --kd: calc(var(--k) * .08s); } }
.fn .fn-tuile { opacity: 0; transform: translateY(12px); }
.fn-tuile.fn-vu { animation: fn-monte .6s cubic-bezier(.2,.8,.2,1) var(--kd) forwards; }

.fn .fn-pin { opacity: 0; }
.fn-vu .fn-pin { animation: fn-pin .45s cubic-bezier(.2,1.5,.4,1) forwards; }
.fn-vu .fn-pin:nth-child(1) { animation-delay: .3s; } .fn-vu .fn-pin:nth-child(2) { animation-delay: .45s; }
.fn-vu .fn-pin:nth-child(3) { animation-delay: .6s; } .fn-vu .fn-pin:nth-child(4) { animation-delay: .75s; }
.fn-pin-actif { box-shadow: 0 0 0 0 rgba(168,50,42,.5); }
.fn-vu .fn-pin.fn-pin-actif.fn-pin-actif { animation: fn-pin .45s cubic-bezier(.2,1.5,.4,1) .6s forwards, fn-halo 1.8s ease-out 1.2s 3; }
.fn .fn-fiche { opacity: 0; transform: translateY(8px) scale(.97); }
.fn-vu .fn-fiche { animation: fn-monte .5s cubic-bezier(.2,.8,.2,1) 1.1s forwards; }

.fn-vu .fn-onde { animation: fn-onde .55s ease-in-out calc(.6s + var(--i) * .05s) 6 alternate; transform-origin: center; }
.fn-vu .fn-micro { animation: fn-micro 1.2s ease-out .6s 3; }
.fn .fn-tape { width: 0; }
.fn-vu .fn-tape { animation: fn-tape 1.8s steps(34, end) 1s forwards; }

.fn .fn-cercle { stroke-dasharray: 1; stroke-dashoffset: 1; }
.fn-vu .fn-cercle { animation: fn-trace .9s ease-out 1s forwards; }

.fn .fn-retire { opacity: 1; }
.fn-vu .fn-retire { animation: fn-clignote .6s ease-in-out 1s 3 alternate; }
.fn .fn-ajout { stroke-dasharray: 1; stroke-dashoffset: 1; }
.fn-vu .fn-ajout { animation: fn-trace .8s ease-out 1.1s forwards; }
.fn .fn-zone { opacity: 0; }
.fn-vu .fn-zone { animation: fn-apparait .4s ease-out 1.7s forwards; }

.fn .fn-doc { transform: translateX(0) rotate(0); }
.fn-vu .fn-doc { animation: fn-ouvre .7s cubic-bezier(.2,.9,.3,1.1) .8s forwards; }

.fn .fn-barre { transform: scaleX(0); transform-origin: left; }
.fn-vu .fn-barre { animation: fn-trait .6s ease-out calc(.7s + var(--i) * .15s) forwards; }

.fn .fn-invite { opacity: 0; transform: translateX(-10px); }
.fn-vu .fn-invite { animation: fn-monte .45s ease-out calc(.8s + var(--i) * .12s) forwards; }

@keyframes fn-monte { to { opacity: 1; transform: none; } }
@keyframes fn-pin { from { opacity: 0; transform: translate(-50%, -110%) scale(.6); } to { opacity: 1; transform: translate(-50%, -50%); } }
@keyframes fn-halo { 0% { box-shadow: 0 0 0 0 rgba(168,50,42,.45); } 100% { box-shadow: 0 0 0 12px rgba(168,50,42,0); } }
@keyframes fn-onde { from { transform: scaleY(1); } to { transform: scaleY(.3); } }
@keyframes fn-micro { 0% { box-shadow: 0 0 0 0 rgba(168,50,42,.45); } 100% { box-shadow: 0 0 0 10px rgba(168,50,42,0); } }
@keyframes fn-tape { to { width: 100%; } }
@keyframes fn-trace { to { stroke-dashoffset: 0; } }
@keyframes fn-clignote { to { opacity: .15; } }
@keyframes fn-apparait { to { opacity: 1; } }
@keyframes fn-ouvre { to { transform: translateX(var(--x)) rotate(var(--r)); } }
@keyframes fn-trait { to { transform: scaleX(1); } }

@media (prefers-reduced-motion: reduce) {
  .fn .fn-tuile, .fn .fn-pin, .fn .fn-fiche, .fn .fn-zone, .fn .fn-invite { opacity: 1; transform: none; animation: none !important; }
  .fn .fn-pin { transform: translate(-50%, -50%); }
  .fn .fn-tape { width: 100%; animation: none !important; }
  .fn .fn-cercle, .fn .fn-ajout { stroke-dashoffset: 0; animation: none !important; }
  .fn .fn-doc { transform: translateX(var(--x)) rotate(var(--r)); animation: none !important; }
  .fn .fn-barre { transform: none; animation: none !important; }
  .fn .fn-onde, .fn .fn-micro, .fn .fn-retire { animation: none !important; }
}
`;
