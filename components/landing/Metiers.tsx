"use client";

import { Building2, Briefcase, HardHat, Check } from "lucide-react";
import { useInView } from "./useInView";

const METIERS = [
  {
    icon: Building2,
    titre: "Architectes",
    sousTitre: "Visites de chantier et OPR",
    points: ["Réserves posées sur le plan, depuis le chantier", "Comptes rendus à l'en-tête de l'agence", "Suivi des entreprises par lot"],
    Vignette: VignetteArchitecte,
  },
  {
    icon: Briefcase,
    titre: "MOD et AMO",
    sousTitre: "Pilotage de plusieurs opérations",
    points: ["Vue d'ensemble des chantiers et des retards", "Traçabilité pour la maîtrise d'ouvrage", "Rapports structurés et datés"],
    Vignette: VignetteMod,
  },
  {
    icon: HardHat,
    titre: "Promoteurs et entreprises",
    sousTitre: "Qualité et non-conformités",
    points: ["Avancement des levées par lot", "Non-conformités par corps d'état", "Historique horodaté de chaque réserve"],
    Vignette: VignettePromoteur,
  },
];

export default function Metiers() {
  return (
    <div className="mt mt-12 grid gap-4 md:grid-cols-3">
      {METIERS.map((m, k) => (
        <Metier key={m.titre} {...m} k={k} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  );
}

/** Chaque carte se joue quand elle-même entre dans l'écran. */
function Metier({ icon: Icon, titre, sousTitre, points, Vignette, k }: (typeof METIERS)[number] & { k: number }) {
  const { ref, inView } = useInView<HTMLElement>(0.35);
  return (
    <article
      ref={ref}
      className={`mt-carte ${inView ? "mt-vu" : ""} group rounded-[14px] border border-filet bg-white overflow-hidden flex flex-col hover:border-filet-fort hover:shadow-[0_14px_36px_-20px_rgba(28,28,26,0.4)] transition-[border-color,box-shadow] duration-300`}
      style={{ ["--k" as string]: k }}
    >
      <div className="relative h-[150px] bg-papier border-b border-filet overflow-hidden" aria-hidden="true">
        <Vignette />
      </div>
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-[9px] bg-encre flex items-center justify-center shrink-0">
            <Icon className="h-[18px] w-[18px] text-white" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] leading-tight">{titre}</h3>
            <p className="text-[13px] text-mine">{sousTitre}</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex gap-2.5 text-[14px] leading-[1.5] text-encre">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-tirage" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** Page de garde d'un compte rendu, à l'en-tête de l'agence. */
function VignetteArchitecte() {
  return (
    <div className="absolute inset-0 flex items-end justify-center">
      <div className="mt-doc w-[62%] h-[124px] rounded-t-[6px] bg-white border border-b-0 border-filet-fort shadow-sm px-3 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold tracking-[-0.01em] text-encre">Atelier K. Alaoui</span>
          <span className="h-4 w-4 rounded-[3px] bg-tirage" />
        </div>
        <p className="mt-3 text-[11px] font-semibold text-encre leading-tight">Compte rendu de visite n° 12</p>
        <p className="text-[9px] text-mine-clair">Résidence Al Andalous, 18 octobre</p>
        <div className="mt-2.5 flex gap-1.5">
          <span className="text-[8px] px-1.5 py-px rounded-full bg-alerte-pale text-alerte">4 bloquées</span>
          <span className="text-[8px] px-1.5 py-px rounded-full bg-valide-pale text-valide">11 levées</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          <span className="h-5 rounded-[2px] bg-[#b4ab9c]" />
          <span className="h-5 rounded-[2px] bg-[#8d949a]" />
          <span className="h-5 rounded-[2px] bg-[#a39c91]" />
        </div>
      </div>
    </div>
  );
}

/** Plusieurs opérations, leur avancement et leurs retards. */
function VignetteMod() {
  const ops = [
    { n: "Groupe scolaire", p: 72, r: 3 },
    { n: "Clinique, extension", p: 41, r: 9 },
    { n: "Siège régional", p: 88, r: 0 },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2.5 px-6">
      {ops.map((o, i) => (
        <div key={o.n} className="rounded-[7px] bg-white border border-filet px-2.5 py-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-encre font-medium truncate">{o.n}</span>
            <span className={o.r ? "text-alerte tabular-nums" : "text-mine-clair"}>{o.r ? `${o.r} en retard` : "à jour"}</span>
          </div>
          <span className="mt-1 block h-1 rounded-full bg-voile overflow-hidden">
            <span className="mt-barre block h-full rounded-full bg-tirage origin-left" style={{ width: `${o.p}%`, ["--i" as string]: i }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Levées par corps d'état. */
function VignettePromoteur() {
  const lots = [
    { n: "Gros œuvre", v: 92 },
    { n: "Plomberie", v: 64 },
    { n: "Électricité", v: 78 },
    { n: "Menuiserie", v: 35 },
    { n: "Peinture", v: 20 },
  ];
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-3 px-6 pb-4">
      {lots.map((l, i) => (
        <div key={l.n} className="flex flex-col items-center gap-1 w-8">
          <span className="text-[9px] font-semibold text-encre tabular-nums">{l.v}%</span>
          <span className="relative w-full h-[78px] rounded-[4px] bg-voile overflow-hidden">
            <span
              className={`mt-colonne absolute inset-x-0 bottom-0 rounded-[4px] ${l.v >= 60 ? "bg-valide" : "bg-tirage"}`}
              style={{ height: `${l.v}%`, ["--i" as string]: i }}
            />
          </span>
          <span className="text-[8px] text-mine truncate w-full text-center">{l.n}</span>
        </div>
      ))}
    </div>
  );
}

const CSS = `
.mt-carte { --kd: 0s; }
@media (min-width: 768px) { .mt-carte { --kd: calc(var(--k) * .12s); } }
.mt .mt-carte { opacity: 0; transform: translateY(14px); }
.mt-carte.mt-vu { animation: mt-monte .6s cubic-bezier(.2,.8,.2,1) var(--kd) forwards; }
.mt .mt-doc { transform: translateY(30px); }
.mt-vu .mt-doc { animation: mt-doc .8s cubic-bezier(.2,.8,.2,1) .35s forwards; }
.mt .mt-barre { transform: scaleX(0); }
.mt-vu .mt-barre { animation: mt-x .8s ease-out calc(.5s + var(--i) * .15s) forwards; }
.mt .mt-colonne { transform: scaleY(0); transform-origin: bottom; }
.mt-vu .mt-colonne { animation: mt-y .7s cubic-bezier(.2,.8,.2,1) calc(.6s + var(--i) * .1s) forwards; }
@keyframes mt-monte { to { opacity: 1; transform: none; } }
@keyframes mt-doc { to { transform: none; } }
@keyframes mt-x { to { transform: scaleX(1); } }
@keyframes mt-y { to { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  .mt .mt-carte, .mt .mt-doc, .mt .mt-barre, .mt .mt-colonne { opacity: 1; transform: none; animation: none !important; }
}
`;
