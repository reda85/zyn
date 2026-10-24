"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { GeistSans } from "geist/font/sans";
import {
  Menu, X, ArrowRight, Check, Smartphone, FileText, Users, ShieldCheck, Headset,
} from "lucide-react";
import PlanDemo from "@/components/landing/PlanDemo";
import Etapes from "@/components/landing/Etapes";
import Metiers from "@/components/landing/Metiers";
import Fonctions from "@/components/landing/Fonctions";
import FondHero from "@/components/landing/FondHero";

const DEMO_URL = "https://cal.com/zaynspace/demo";

// En local, l'application tourne sur app.localhost ; en production sur app.zaynspace.com.
function useAppUrls() {
  const [base, setBase] = useState("https://app.zaynspace.com");
  useEffect(() => {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") setBase("http://app.localhost:3000");
  }, []);
  return { signUp: `${base}/sign-up`, signIn: `${base}/sign-in` };
}

const NAV = [
  { label: "Pour qui", href: "#metiers" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Tarifs", href: "#tarifs" },
];

const OFFRES = [
  { nom: "Starter", prix: "399", pour: "Architectes indépendants et petits cabinets", points: ["1 utilisateur actif inclus", "Invités illimités et gratuits", "3 projets actifs", "Rapports PDF illimités", "Stockage 5 Go", "Support par e-mail"], cta: "Commencer", demo: false, avant: false },
  { nom: "Pro", prix: "699", pour: "Agences et bureaux de contrôle", points: ["À partir de 3 utilisateurs actifs", "Invités illimités et gratuits", "Projets illimités", "Rapports à l'en-tête de l'agence", "Stockage 50 Go", "Support prioritaire"], cta: "Commencer", demo: false, avant: true },
  { nom: "Business", prix: "1 200", pour: "MOD, AMO et structures multi-chantiers", points: ["À partir de 5 utilisateurs actifs", "Invités illimités et gratuits", "Collaboration entre organisations", "Rôles et permissions détaillés", "Reporting consolidé multi-chantiers", "API, webhooks et accompagnement"], cta: "Nous contacter", demo: true, avant: false },
];

function Logo({ clair = false }: { clair?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Image src={clair ? "/logo_clair.png" : "/logo_encre.png"} alt="" width={16} height={26} className="h-[26px] w-auto" />
      <span className={`text-[17px] font-semibold tracking-[-0.02em] ${clair ? "text-white" : "text-encre"}`}>ZaynSpace</span>
    </span>
  );
}

export default function HomePage() {
  const { signUp, signIn } = useAppUrls();
  const [menu, setMenu] = useState(false);
  const [defile, setDefile] = useState(false);

  useEffect(() => {
    const f = () => setDefile(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <div className={`${GeistSans.className} min-h-screen bg-papier text-encre antialiased`}>
      {/* ── En-tête ── */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors ${defile ? "bg-papier/90 backdrop-blur border-b border-filet" : "bg-transparent border-b border-transparent"}`}>
        <div className="mx-auto max-w-[1200px] h-16 px-5 sm:px-8 flex items-center gap-10">
          <Link href="/" aria-label="ZaynSpace, accueil"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-7" aria-label="Sections">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="text-[14px] text-mine hover:text-encre transition-colors">{l.label}</a>
            ))}
          </nav>
          <div className="ml-auto hidden md:flex items-center gap-2">
            <Link href={signIn} className="h-9 px-3 inline-flex items-center text-[14px] text-mine hover:text-encre transition-colors">Connexion</Link>
            <Link href={signUp} className="h-9 px-4 inline-flex items-center rounded-[6px] bg-encre text-white text-[14px] font-medium hover:bg-encre-survol transition-colors">
              Essai gratuit
            </Link>
          </div>
          <button className="md:hidden ml-auto h-9 w-9 -mr-2 inline-flex items-center justify-center" onClick={() => setMenu(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {menu && (
        <div className="fixed inset-0 z-[60] bg-papier px-5 py-4 flex flex-col md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex items-center justify-between h-8">
            <Logo />
            <button onClick={() => setMenu(false)} aria-label="Fermer le menu" className="h-9 w-9 -mr-2 inline-flex items-center justify-center"><X className="h-5 w-5" /></button>
          </div>
          <nav className="mt-10 flex flex-col gap-6">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenu(false)} className="text-[26px] font-semibold tracking-[-0.02em]">{l.label}</a>
            ))}
            <Link href={signIn} className="text-[26px] font-semibold tracking-[-0.02em] text-mine">Connexion</Link>
          </nav>
          <Link href={signUp} className="mt-auto h-12 inline-flex items-center justify-center rounded-[8px] bg-encre text-white text-[15px] font-medium">Essai gratuit 14 jours</Link>
        </div>
      )}

      <main>
        {/* ── Ouverture ── */}
        <section className="relative isolate pt-28 sm:pt-36 pb-24 overflow-hidden">
          <FondHero />
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-14 lg:gap-14 items-center">
            <div>
              <h1 className="text-[clamp(2.4rem,1.6rem+3.4vw,4.1rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-encre">
                Le chantier documenté avant d’avoir quitté le site.
              </h1>
              <p className="mt-6 text-[17px] leading-[1.6] text-mine max-w-[30rem]">
                Posez chaque réserve sur le plan, avec ses photos et sa remarque dictée. ZaynSpace en fait le compte rendu de visite, prêt à envoyer.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href={signUp} className="h-12 px-5 inline-flex items-center gap-2 rounded-[8px] bg-encre text-white text-[15px] font-medium hover:bg-encre-survol transition-colors">
                  Essai gratuit 14 jours <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href={DEMO_URL} className="h-12 px-5 inline-flex items-center rounded-[8px] border border-filet-fort bg-white text-[15px] font-medium text-encre hover:border-encre transition-colors">
                  Réserver une démo
                </a>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-mine">
                {["Sans carte bancaire", "Invités gratuits", "Conforme à la loi 09-08"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-tirage" aria-hidden="true" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="pb-10">
              <PlanDemo />
            </div>
          </div>
        </section>

        {/* ── De la visite au rapport (une vraie séquence) ── */}
        <section className="border-t border-filet bg-white">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-20 sm:py-24">
            <h2 className="text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold tracking-[-0.03em] leading-[1.1] max-w-[22ch]">
              De la visite au rapport, sans ressaisie.
            </h2>
            <Etapes />
          </div>
        </section>

        {/* ── Métiers ── */}
        <section id="metiers" className="border-t border-filet scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-20 sm:py-24">
            <h2 className="text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold tracking-[-0.03em] leading-[1.1] max-w-[24ch]">
              Pensé pour ceux qui contrôlent le chantier.
            </h2>
            <Metiers />
          </div>
        </section>

        {/* ── Fonctionnalités ── */}
        <section id="fonctionnalites" className="border-t border-filet bg-white scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-20 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold tracking-[-0.03em] leading-[1.1] max-w-[22ch]">
                Tout ce qu’une visite de chantier demande.
              </h2>
              <p className="text-[16px] leading-[1.6] text-mine max-w-[26rem]">
                Une application mobile pour le terrain, une application web pour le bureau, les mêmes données des deux côtés.
              </p>
            </div>
            <Fonctions />
          </div>
        </section>

        {/* ── Tarifs ── */}
        <section id="tarifs" className="border-t border-filet scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-20 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="text-[clamp(1.8rem,1.3rem+1.6vw,2.6rem)] font-semibold tracking-[-0.03em] leading-[1.1] max-w-[22ch]">
                Vous payez vos utilisateurs. Vos invités sont gratuits.
              </h2>
              <p className="text-[14px] text-mine">Prix par utilisateur actif et par mois, hors taxes.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {OFFRES.map((o) => (
                <article
                  key={o.nom}
                  className={`rounded-[14px] p-7 flex flex-col transition-[border-color,box-shadow] ${o.avant ? "bg-encre text-white shadow-[0_24px_60px_-28px_rgba(28,28,26,0.6)] md:-my-3 md:py-10" : "bg-white border border-filet hover:border-filet-fort hover:shadow-[0_14px_36px_-20px_rgba(28,28,26,0.35)]"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-semibold">{o.nom}</h3>
                    {o.avant && <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white">Le plus choisi</span>}
                  </div>
                  <p className={`mt-1 text-[14px] ${o.avant ? "text-white/65" : "text-mine"}`}>{o.pour}</p>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-[40px] font-semibold tracking-[-0.03em] tabular-nums leading-none">{o.prix}</span>
                    <span className={`text-[14px] ${o.avant ? "text-white/65" : "text-mine"}`}>MAD</span>
                  </p>
                  <ul className="mt-7 space-y-2.5 flex-1">
                    {o.points.map((p) => (
                      <li key={p} className="flex gap-2.5 text-[14px] leading-[1.45]">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${o.avant ? "text-white" : "text-tirage"}`} aria-hidden="true" />
                        <span className={o.avant ? "text-white/85" : "text-encre"}>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={o.demo ? DEMO_URL : signUp}
                    className={`mt-8 h-11 inline-flex items-center justify-center rounded-[8px] text-[14px] font-medium transition-colors ${
                      o.avant ? "bg-white text-encre hover:bg-voile" : "bg-encre text-white hover:bg-encre-survol"
                    }`}
                  >
                    {o.cta}
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-[14px] border border-filet bg-white px-6 py-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Smartphone, t: "Application mobile", d: "Relevés sur le terrain, photos et dictée" },
                { icon: FileText, t: "Rapports PDF et Word", d: "Sans limite de nombre" },
                { icon: Users, t: "Invités illimités", d: "Entreprises, contrôleurs, clients" },
                { icon: ShieldCheck, t: "Loi 09-08", d: "Données personnelles protégées" },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="h-9 w-9 rounded-[9px] bg-tirage-pale flex items-center justify-center shrink-0">
                    <Icon className="h-[18px] w-[18px] text-tirage" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-encre">{t}</p>
                    <p className="text-[13px] text-mine">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 flex items-center gap-2 text-[14px] text-mine">
              <Headset className="h-4 w-4 text-mine-clair" aria-hidden="true" />
              <span>Besoin d’une offre sur mesure ? <a href={DEMO_URL} className="text-tirage underline underline-offset-4 hover:text-tirage-fonce">Contactez-nous</a>.</span>
            </p>
          </div>
        </section>

        {/* ── Appel final ── */}
        <section className="relative bg-encre text-white overflow-hidden">
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.07]">
            <defs>
              <pattern id="cta-grille" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M28 0H0V28" fill="none" stroke="white" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-grille)" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 520 320" className="absolute -right-20 -top-16 w-[520px] max-w-none opacity-[0.14] hidden lg:block">
            <g fill="none" stroke="white" strokeLinecap="square">
              <rect x="10" y="10" width="500" height="300" strokeWidth="6" />
              <path d="M10 150H280M280 10V310M280 170H510M150 150V310M400 170V310" strokeWidth="3" />
            </g>
          </svg>
          <div aria-hidden="true" className="absolute right-[9%] top-[18%] hidden lg:flex gap-20">
            {["var(--zs-alerte)", "var(--zs-tirage)", "var(--zs-valide)"].map((c, i) => (
              <span key={i} className="h-5 w-5 rounded-full border-2 border-encre" style={{ background: c, transform: `translateY(${[-40, 20, -10][i]}px)` }} />
            ))}
          </div>
          <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8 py-20 sm:py-28 flex flex-wrap items-end justify-between gap-10">
            <div className="max-w-[34rem]">
              <h2 className="text-[clamp(1.9rem,1.3rem+2vw,3rem)] font-semibold tracking-[-0.03em] leading-[1.05]">
                Votre prochaine visite, rapport compris.
              </h2>
              <p className="mt-5 text-[16px] leading-[1.6] text-white/70">
                Importez un plan, placez trois réserves, générez le rapport : quelques minutes suffisent pour juger sur pièce.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={signUp} className="h-12 px-5 inline-flex items-center gap-2 rounded-[8px] bg-white text-encre text-[15px] font-medium hover:bg-voile transition-colors">
                Essai gratuit 14 jours <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href={DEMO_URL} className="h-12 px-5 inline-flex items-center rounded-[8px] border border-white/25 bg-encre text-[15px] font-medium hover:border-white transition-colors">
                Réserver une démo
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-encre text-white/60 border-t border-white/10">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-8 flex flex-wrap items-center gap-x-8 gap-y-4 text-[13px]">
          <Logo clair />
          <nav className="ml-auto flex gap-6" aria-label="Liens légaux">
            <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Conditions</Link>
            <a href={DEMO_URL} className="hover:text-white transition-colors">Contact</a>
          </nav>
          <span className="w-full sm:w-auto">© {new Date().getFullYear()} ZaynSpace</span>
        </div>
      </footer>
    </div>
  );
}
