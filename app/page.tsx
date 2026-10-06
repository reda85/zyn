"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowUpRight, MapPin, Camera,
  CheckCircle2, TrendingUp, ShieldCheck, FileText,
  Users, BarChart3, Building2, HardHat, Briefcase,
  PaintRoller, Flame, Lock, Zap, Droplet, Plus,
  UserCheck,
} from "lucide-react";

/* ── SETUP REQUIRED in layout.tsx:
   import { Outfit, Lexend } from "next/font/google"
   const outfit = Outfit({ subsets:["latin"], weight:["400","500","600","700"], variable:"--font-outfit" })
   const lexend = Lexend({ subsets:["latin"], weight:["600","700"], variable:"--font-lexend" })
   <html className={`${outfit.variable} ${lexend.variable}`}>

   tailwind.config.ts:
   fontFamily: { outfit: ["var(--font-outfit)"], lexend: ["var(--font-lexend)"] }
*/

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className="transition-all duration-700 ease-out"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function PlanMockup() {
  const [replayKey, setReplayKey] = useState(0);
  const pins = [
    { id: 1, x: 300, y: 85,  color: "#D946A8", Icon: PaintRoller, delay: 0.4 },
    { id: 2, x: 380, y: 320, color: "#E11D48", Icon: Flame,       delay: 1.2 },
    { id: 3, x: 415, y: 340, color: "#D946A8", Icon: Lock,        delay: 2.0 },
    { id: 4, x: 150, y: 280, color: "#F59E0B", Icon: Zap,         delay: 2.8 },
    { id: 5, x: 560, y: 360, color: "#0EA5E9", Icon: Droplet,     delay: 3.6 },
  ];

  return (
    <div key={replayKey} className="relative w-full h-full">
      <div className="absolute inset-0 bg-white border border-slate-200 rounded-tl-xl rounded-tr-xl overflow-hidden shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <div className="h-11 bg-slate-900 flex items-center px-4 gap-2 shrink-0 relative z-20">
          <div className="flex gap-1.5">
            {["#ff5f57","#febc2e","#28c840"].map(c => (
              <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="flex-1 mx-3 bg-white/10 rounded h-5 flex items-center px-2">
            <span className="text-white/40" style={{ fontSize: 9 }}>Résidence Almaz · Niveau R+2 · Casablanca</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50 font-medium" style={{ fontSize: 9 }}>5 réserves</span>
          </div>
        </div>
        <div className="relative h-[calc(100%-44px)] w-full overflow-hidden">
          <svg viewBox="0 0 960 600" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <defs><pattern id="planGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#f1f5f9" strokeWidth="0.5" /></pattern></defs>
            <rect width="960" height="600" fill="url(#planGrid)" />
            <g transform="translate(60, 60)">
              <g stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="square">
                <rect x="20" y="20" width="620" height="400" />
                <line x1="20" y1="200" x2="380" y2="200" /><line x1="380" y1="20" x2="380" y2="280" />
                <line x1="380" y1="280" x2="640" y2="280" /><line x1="240" y1="200" x2="240" y2="420" />
                <line x1="500" y1="280" x2="500" y2="420" />
              </g>
              <g stroke="#475569" strokeWidth="0.8" opacity="0.4">
                {[0,1,2,3,4,5].map(i => (<line key={i} x1={380+i*4} y1={20} x2={372+i*4} y2={280} />))}
              </g>
              <g stroke="white" strokeWidth="4">
                <line x1="130" y1="200" x2="180" y2="200" /><line x1="300" y1="200" x2="350" y2="200" />
                <line x1="560" y1="280" x2="610" y2="280" />
              </g>
              <g fill="#64748b" fontSize="10" fontFamily="ui-sans-serif, system-ui" textAnchor="middle">
                <text x="200" y="12">10,63</text><text x="510" y="12">8,42</text>
                <text x="130" y="448">6,25</text><text x="370" y="448">0,32</text><text x="570" y="448">5,18</text>
              </g>
              <g stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="2,2">
                <line x1="20" y1="0" x2="380" y2="0" /><line x1="380" y1="0" x2="640" y2="0" />
                <line x1="20" y1="438" x2="640" y2="438" />
              </g>
              <g transform="translate(320, 240)"><polygon points="0,-8 -7,4 7,4" fill="#0f172a" />
                <text x="0" y="22" fontSize="11" fill="#0f172a" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">A2</text>
              </g>
              <g transform="translate(440, 340)">
                <circle cx="0" cy="0" r="70" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="4,4" />
                <text x="0" y="6" fontSize="18" fill="#94a3b8" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontWeight="300">5m</text>
              </g>
              <text x="670" y="220" fontSize="11" fill="#94a3b8" fontFamily="ui-sans-serif, system-ui" transform="rotate(-90, 670, 220)" textAnchor="middle">(38,80)</text>
              <g fill="#cbd5e1" fontSize="9" fontFamily="ui-sans-serif, system-ui" textAnchor="middle" fontWeight="500" style={{ letterSpacing: "0.1em" }}>
                <text x="200" y="110">SÉJOUR</text><text x="510" y="150">CHAMBRE 1</text>
                <text x="130" y="320">CUISINE</text><text x="370" y="370">SDB</text><text x="570" y="370">CHAMBRE 2</text>
              </g>
            </g>
            <g transform="translate(60, 60)">
              {pins.map(({ id, x, y, color, Icon, delay }) => (
                <g key={id} className="plan-pin" style={{ animationDelay: `${delay}s` }}>
                  <circle cx={x} cy={y} r="15" fill={color} opacity="0.25" className="plan-pin-halo" style={{ animationDelay: `${delay+0.6}s`, transformOrigin: `${x}px ${y}px` }} />
                  <circle cx={x} cy={y} r="17" fill="white" /><circle cx={x} cy={y} r="15" fill={color} />
                  <foreignObject x={x-9} y={y-9} width="18" height="18">
                    <div className="flex items-center justify-center w-full h-full"><Icon size={12} color="white" strokeWidth={2.5} /></div>
                  </foreignObject>
                </g>
              ))}
            </g>
            <g transform="translate(885, 130)"><circle cx="0" cy="0" r="24" fill="#2563EB" />
              <g fill="white">{[-6,0,6].map(cy=>[-6,0,6].map(cx=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" />))}</g>
            </g>
            <g transform="translate(885, 420)">
              <circle cx="0" cy="0" r="28" fill="none" stroke="#0f172a" strokeWidth="1.5" opacity="0.3" className="fab-pulse" style={{ transformOrigin:"center" }} />
              <circle cx="0" cy="0" r="24" fill="#0f172a" />
              <foreignObject x="-10" y="-10" width="20" height="20"><div className="flex items-center justify-center w-full h-full"><MapPin size={12} color="white" strokeWidth={2.2} fill="white" fillOpacity={0.2} /></div></foreignObject>
              <foreignObject x="4" y="-14" width="14" height="14"><div className="flex items-center justify-center w-full h-full rounded-full bg-emerald-500"><Plus size={9} color="white" strokeWidth={3} /></div></foreignObject>
            </g>
            <g transform="translate(885, 485)"><circle cx="0" cy="0" r="24" fill="#9333EA" />
              <g stroke="white" strokeWidth="2.2" strokeLinecap="round"><line x1="-8" y1="-6" x2="8" y2="-6" /><line x1="-5" y1="0" x2="5" y2="0" /><line x1="-2" y1="6" x2="2" y2="6" /></g>
            </g>
          </svg>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50/80 to-transparent pointer-events-none" />
        </div>
      </div>
      <button onClick={() => setReplayKey(k => k + 1)} className="absolute top-14 right-4 z-30 bg-white/95 backdrop-blur border border-slate-200 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8a6 6 0 1 1 1.8 4.3" /><path d="M2 13v-4h4" /></svg>Replay
      </button>
      <style>{`
        .plan-pin{opacity:0;transform-origin:center;animation:pinDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards}
        .plan-pin-halo{animation:pinPulse 2.5s ease-out infinite}
        .fab-pulse{animation:fabPulseRing 2s ease-out infinite}
        @keyframes pinDrop{0%{opacity:0;transform:translateY(-30px) scale(0.4)}70%{opacity:1;transform:translateY(2px) scale(1.1)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pinPulse{0%{r:15;opacity:0.35}100%{r:32;opacity:0}}
        @keyframes fabPulseRing{0%{transform:scale(1);opacity:0.5}100%{transform:scale(1.7);opacity:0}}
      `}</style>
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const signUpUrl = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://app.localhost:3000/sign-up" : "https://app.zaynspace.com/sign-up";
  const loginUrl = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://app.localhost:3000/sign-in" : "https://app.zaynspace.com/sign-in";
  const demoUrl = "https://cal.com/zaynspace/demo";

  const features = [
    { icon: TrendingUp, title: "Suivi temps réel", desc: "Chaque action sur le chantier est capturée et synchronisée instantanément. Votre équipe voit les mises à jour au moment où elles se produisent, sans latence." },
    { icon: ShieldCheck, title: "Protection juridique", desc: "Chaque point de contrôle est horodaté et documenté automatiquement. En cas de litige, votre historique complet est disponible, exportable en PDF légal." },
    { icon: FileText, title: "Rapports en un clic", desc: "Générez des rapports de visite professionnels en quelques secondes. Partagez-les directement avec vos clients et la maîtrise d'ouvrage." },
    { icon: MapPin, title: "Géolocalisation précise", desc: "Placez chaque observation sur le plan avec une précision chirurgicale. Les coordonnées GPS sont capturées automatiquement à chaque relevé terrain." },
    { icon: Camera, title: "Documentation visuelle", desc: "Associez photos et annotations directement aux points relevés. Le contexte visuel est préservé avec la localisation exacte sur le plan." },
    { icon: Users, title: "Collaboration fluide", desc: "Invitez votre équipe, vos clients et sous-traitants. Les permissions sont granulaires — chacun voit exactement ce dont il a besoin." },
  ];

  const personas = [
    { icon: Building2, title: "Pour les architectes", tagline: "OPR et visites de chantier", points: ["Levées de réserves sur plan, depuis le chantier", "Rapports PDF brandés à votre agence", "Suivi des entreprises et sous-traitants"] },
    { icon: Briefcase, title: "Pour les MOD / AMO", tagline: "Pilotage multi-chantiers", points: ["Tableau de bord consolidé de vos opérations", "Traçabilité complète pour la maîtrise d'ouvrage", "Rapports structurés dignes de vos honoraires"] },
    { icon: HardHat, title: "Pour les promoteurs & BTP", tagline: "Qualité et non-conformités", points: ["Vue temps réel de l'avancement par lot", "Suivi des non-conformités par corps d'état", "Historique juridique opposable"] },
  ];

  const pricingPlans = [
    { name: "Starter", price: "399", description: "Pour les architectes indépendants et petits cabinets", features: ["1 seat actif inclus", "Guests & viewers illimités gratuits", "3 projets actifs", "Rapports PDF illimités", "Stockage 5 Go", "Support par email"], cta: "Commencer", ctaUrl: "signup", highlight: false },
    { name: "Pro", price: "699", description: "Pour les agences et bureaux de contrôle", features: ["À partir de 3 seats actifs", "Guests & viewers illimités gratuits", "Projets illimités", "Rapports PDF brandés à votre agence", "Stockage 50 Go", "Support prioritaire"], cta: "Commencer", ctaUrl: "signup", highlight: true },
    { name: "Business", price: "1 200", description: "Pour les MOD/AMO et structures multi-chantiers", features: ["À partir de 5 seats actifs", "Guests & viewers illimités gratuits", "Collaboration cross-org incluse", "Rôles et permissions granulaires", "Reporting consolidé multi-chantiers", "API, webhooks & accompagnement dédié"], cta: "Nous contacter", ctaUrl: "demo", highlight: false },
  ];

  const navLinks = [{ label: "Pour qui ?", href: "#personas" }, { label: "Fonctionnalités", href: "#features" }, { label: "Tarifs", href: "#pricing" }];

  return (
    <div className="min-h-screen bg-[#fefefe] text-slate-900 font-outfit">

      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 md:px-12 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-lg border-b border-slate-200" : "bg-transparent"}`}>
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center"><Image src="/logo_blanc.png" alt="ZaynSpace" width={18} height={18} /></div>
          <span className="font-outfit text-lg font-semibold text-slate-900 tracking-tight">zaynspace</span>
        </Link>
        <nav className="hidden md:flex gap-9 ml-14 flex-1">
          {navLinks.map(({ label, href }) => (
            <a key={label} href={href} className="font-outfit text-[11px] tracking-widest uppercase text-slate-400 hover:text-slate-900 transition-colors no-underline relative group">
              {label}<span className="absolute -bottom-0.5 left-0 w-0 h-px bg-slate-900 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-6 ml-auto">
          <Link href={loginUrl} className="font-outfit text-[11px] tracking-widest uppercase text-slate-400 hover:text-slate-900 transition-colors no-underline">Connexion</Link>
          <Link href={signUpUrl} className="font-outfit text-[11px] tracking-widest uppercase font-medium bg-slate-900 text-white px-5 py-2.5 rounded-sm hover:bg-slate-700 transition-colors no-underline">Essai gratuit</Link>
        </div>
        <button onClick={() => setMenuOpen(true)} className="md:hidden ml-auto bg-transparent border-none text-slate-900 cursor-pointer p-0"><Menu size={20} /></button>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-[#fefefe] z-50 flex flex-col px-7 pb-10">
          <div className="h-16 flex items-center justify-between">
            <span className="font-outfit text-lg font-semibold">zaynspace</span>
            <button onClick={() => setMenuOpen(false)} className="bg-transparent border-none text-slate-400 cursor-pointer p-0"><X size={20} /></button>
          </div>
          <div className="h-px bg-slate-200" />
          <nav className="flex-1 flex flex-col justify-center gap-9">
            {navLinks.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)} className="font-outfit text-3xl font-medium text-slate-900 no-underline">{label}</a>
            ))}
          </nav>
          <Link href={signUpUrl} className="font-outfit text-[11px] tracking-widest uppercase font-medium bg-slate-900 text-white py-4 text-center rounded-sm no-underline">Commencer gratuitement</Link>
        </div>
      )}

      {/* HERO */}
      <section className="min-h-screen grid md:grid-cols-2 items-center pt-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(15,23,42,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-1/2 right-1/3 w-96 h-96 -translate-y-1/2 translate-x-1/2 pointer-events-none" style={{ background: "radial-gradient(ellipse,rgba(16,185,129,0.06) 0%,transparent 65%)" }} />

        <div className="px-6 md:px-12 py-20 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 mb-6" style={{ opacity: 0, animation: "0.7s ease 0.1s forwards fadeOnly" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-outfit text-[10px] font-medium text-slate-600 tracking-wide">Conçu pour les professionnels du bâtiment au Maroc</span>
          </div>

          <h1 className="font-lexend font-bold text-slate-900 leading-[1.05] mb-1" style={{ fontSize: "clamp(36px,5vw,60px)", letterSpacing: "-0.02em", opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.2s forwards slideUp" }}>
            Le chantier documenté,
          </h1>
          <h1 className="font-lexend font-bold text-emerald-500 leading-[1.05] mb-7" style={{ fontSize: "clamp(36px,5vw,60px)", letterSpacing: "-0.02em", opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.32s forwards slideUp" }}>
            avant d'avoir quitté le site.
          </h1>

          <div className="w-12 h-px mb-7" style={{ background: "linear-gradient(90deg,transparent,#10b981 30%,#10b981 70%,transparent)", opacity: 0, animation: "0.5s ease 0.44s forwards fadeOnly" }} />

          <p className="font-outfit text-base text-slate-500 leading-relaxed mb-10 max-w-md" style={{ opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.5s forwards slideUp" }}>
            Réserves, non-conformités, points de contrôle — ZaynSpace transforme vos visites de chantier en rapports PDF professionnels, directement depuis votre mobile.
          </p>

          <div className="flex gap-2.5 flex-wrap mb-8" style={{ opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.62s forwards slideUp" }}>
            <Link href={signUpUrl} className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase font-medium bg-slate-900 text-white px-7 py-3.5 rounded-sm hover:bg-slate-700 transition-colors no-underline">
              Essai gratuit 14 jours <ArrowUpRight size={13} />
            </Link>
            <Link href={demoUrl} className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-slate-900 px-7 py-3.5 border border-slate-300 rounded-sm hover:border-slate-900 hover:bg-slate-50 transition-all no-underline">
              Réserver une démo
            </Link>
          </div>

          <div className="flex gap-6 flex-wrap" style={{ opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.74s forwards slideUp" }}>
            {["Pas de carte bancaire", "14 jours offerts", "Conforme loi 09-08"].map(t => (
              <span key={t} className="font-outfit flex items-center gap-1.5 text-[11px] text-slate-400 tracking-wide">
                <CheckCircle2 size={11} className="text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Desktop animation */}
        <div className="hidden md:flex flex-col justify-center relative h-screen bg-slate-50 border-l border-slate-100 overflow-hidden" style={{ opacity: 0, animation: "1s ease 0.4s forwards fadeOnly" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-slate-50 to-slate-100" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(16,185,129,0.08) 0%, transparent 60%)" }} />
          <div className="absolute left-8 right-0 bottom-0 top-16" style={{ perspective: "1200px" }}>
            <div className="relative w-full h-full" style={{ transform: "rotateX(4deg) rotateY(-3deg) scale(1.05)", transformOrigin: "top center" }}>
              <PlanMockup />
            </div>
          </div>
          <div className="absolute top-24 right-6 bg-white rounded-xl shadow-xl border border-slate-100 p-3.5 w-48 z-20" style={{ animation: "float-card 4s ease-in-out infinite" }}>
            <div className="flex items-center gap-2 mb-2.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="font-outfit font-semibold text-[10px] text-rose-500 tracking-wide uppercase">Nouveau</span></div>
            <div className="font-outfit font-semibold text-slate-900 text-[12px] mb-1">Fuite canalisation SDB</div>
            <div className="font-outfit text-[10px] text-slate-400 mb-2.5">Y. Bennani · il y a 2 min</div>
            <div className="h-1 bg-slate-100 rounded-full"><div className="h-full w-1/5 bg-rose-500 rounded-full" /></div>
          </div>
          <div className="absolute top-56 left-4 bg-white rounded-xl shadow-xl border border-slate-100 p-3 w-40 z-20" style={{ animation: "float-card 4s ease-in-out 1.4s infinite" }}>
            <div className="flex items-center gap-2 mb-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-outfit font-semibold text-[10px] text-emerald-600 tracking-wide uppercase">Terminé</span></div>
            <div className="font-outfit font-medium text-slate-900 text-[11px]">Carreaux cassés</div>
            <div className="font-outfit text-[9px] text-slate-400 mt-0.5">il y a 2 jours</div>
          </div>
          <div className="absolute bottom-32 right-8 bg-slate-900 rounded-xl shadow-xl p-3 z-20 flex items-center gap-2.5" style={{ animation: "float-card 4s ease-in-out 2.5s infinite" }}>
            <div className="flex -space-x-1.5">
              {[["#10b981","M"],["#8b5cf6","S"],["#f59e0b","Y"]].map(([c,l]) => (
                <div key={l} className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white font-outfit" style={{ background: c }}>{l}</div>
              ))}
            </div>
            <div><div className="font-outfit font-semibold text-white text-[11px]">4 actifs</div><div className="font-outfit text-slate-400 text-[9px]">sur le chantier</div></div>
          </div>
        </div>

        <div className="md:hidden px-6 pb-16">
          <div className="relative rounded-xl overflow-hidden shadow-xl border border-slate-200" style={{ aspectRatio: "4/5" }}><PlanMockup /></div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-t border-b border-slate-200 bg-white py-10 px-6">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center">
            <p className="font-outfit text-[10px] tracking-[0.2em] uppercase text-slate-400 mb-4">Actuellement en bêta avec les premières agences marocaines</p>
            <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 opacity-60">
              {["Agence A","Cabinet B","MOD C","Studio D","Bureau E"].map(name => (
                <div key={name} className="font-outfit text-sm font-medium text-slate-400 tracking-wide">{name}</div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* PERSONAS */}
      <section id="personas" className="py-24 px-6 bg-[#fefefe]">
        <div className="max-w-5xl mx-auto">
          <FadeIn><div className="text-center mb-16">
            <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-4">Pour qui ?</span>
            <h2 className="font-lexend font-bold text-slate-900" style={{ fontSize: "clamp(28px,3.5vw,42px)", letterSpacing: "-0.015em" }}>Un outil, trois métiers du <span className="text-emerald-500">bâtiment.</span></h2>
          </div></FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {personas.map((p, i) => { const Icon = p.icon; return (
              <FadeIn key={p.title} delay={i * 100}>
                <div className="h-full p-8 bg-white border border-slate-200 rounded-lg hover:border-emerald-200 hover:shadow-lg transition-all">
                  <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center mb-6"><Icon size={20} className="text-emerald-500" /></div>
                  <div className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-slate-400 mb-2">{p.tagline}</div>
                  <h3 className="font-lexend text-xl font-semibold text-slate-900 mb-5" style={{ letterSpacing: "-0.01em" }}>{p.title}</h3>
                  <ul className="space-y-3">
                    {p.points.map(pt => (<li key={pt} className="flex items-start gap-2.5"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /><span className="font-outfit text-sm text-slate-600 leading-snug">{pt}</span></li>))}
                  </ul>
                </div>
              </FadeIn>
            ); })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 border-t border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="hidden md:grid grid-cols-2 gap-20 items-start">
            <FadeIn>
              <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-5">Fonctionnalités</span>
              <h2 className="font-lexend font-bold text-slate-900 leading-tight mb-12" style={{ fontSize: "clamp(28px,3.5vw,42px)", letterSpacing: "-0.015em" }}>Conçu pour les équipes<br /><span className="text-emerald-500">qui construisent.</span></h2>
              <div className="pl-5">
                {features.map((f, i) => (
                  <div key={f.title} onClick={() => setActiveFeature(i)} className="py-4 border-b border-slate-100 cursor-pointer relative transition-all" style={{ paddingLeft: activeFeature === i ? 4 : 0 }}>
                    <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-0.5 bg-emerald-500 transition-all duration-300" style={{ height: activeFeature === i ? "60%" : "0%" }} />
                    <span className={`font-outfit text-sm transition-colors ${activeFeature === i ? "font-medium text-slate-900" : "text-slate-400"}`}>{f.title}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-10 sticky top-20 shadow-sm min-h-64">
                {(() => { const Icon = features[activeFeature].icon; return (<div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center mb-6"><Icon size={20} className="text-emerald-500" /></div>); })()}
                <h3 className="font-lexend font-semibold text-slate-900 mb-3.5" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>{features[activeFeature].title}</h3>
                <p className="font-outfit text-sm text-slate-500 leading-relaxed">{features[activeFeature].desc}</p>
              </div>
            </FadeIn>
          </div>
          <div className="md:hidden flex flex-col gap-3.5">
            <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-3">Fonctionnalités</span>
            <h2 className="font-lexend font-bold text-slate-900 mb-8" style={{ fontSize: 28, letterSpacing: "-0.015em" }}>Conçu pour les équipes <span className="text-emerald-500">qui construisent.</span></h2>
            {features.map(f => { const Icon = f.icon; return (
              <div key={f.title} className="p-6 bg-white border border-slate-200 rounded-lg">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center mb-3"><Icon size={16} className="text-emerald-500" /></div>
                <div className="font-outfit text-sm font-medium text-slate-900 mb-2">{f.title}</div>
                <p className="font-outfit text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-[#fefefe]">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="max-w-xl mx-auto mb-12 bg-slate-900 text-white rounded-lg p-4 flex items-center gap-3 shadow-lg">
              <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="font-outfit text-[11px] md:text-sm leading-snug"><span className="font-semibold">Offre Founding Customer</span> : <span className="text-slate-300">-40% à vie pour les 15 premiers clients</span></p>
            </div>
          </FadeIn>
          <FadeIn><div className="text-center mb-6">
            <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-4">Tarifs</span>
            <h2 className="font-lexend font-bold text-slate-900" style={{ fontSize: "clamp(28px,3.5vw,42px)", letterSpacing: "-0.015em" }}>Payez pour vos actifs.<br /><span className="text-emerald-500">Les invités sont gratuits.</span></h2>
            <p className="font-outfit text-sm text-slate-500 mt-4 max-w-lg mx-auto">Facturé par seat actif (membres qui créent, assignent et rapportent). Sous-traitants, clients et viewers en consultation : gratuits et illimités. -20% en facturation annuelle.</p>
          </div></FadeIn>
          <FadeIn delay={50}>
            <div className="max-w-lg mx-auto mb-14 flex items-center justify-center gap-6 py-4 px-6 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="flex items-center gap-2"><UserCheck size={16} className="text-emerald-600" /><span className="font-outfit text-sm font-medium text-emerald-700">Seats actifs</span><span className="font-outfit text-xs text-emerald-600">= facturés</span></div>
              <div className="w-px h-6 bg-emerald-200" />
              <div className="flex items-center gap-2"><Users size={16} className="text-emerald-600" /><span className="font-outfit text-sm font-medium text-emerald-700">Guests & viewers</span><span className="font-outfit text-xs text-emerald-600">= gratuits ∞</span></div>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {pricingPlans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 100}>
                <div className={`h-full rounded-lg p-8 flex flex-col transition-all ${plan.highlight ? "bg-slate-900 text-white border border-slate-900 shadow-2xl md:scale-105" : "bg-white border border-slate-200 hover:border-emerald-200"}`}>
                  {plan.highlight && (<div className="mb-4 -mt-2"><span className="inline-block bg-emerald-500 text-white text-[9px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded">Le plus populaire</span></div>)}
                  <h3 className={`font-lexend text-xl font-semibold mb-2 ${plan.highlight ? "text-white" : "text-slate-900"}`}>{plan.name}</h3>
                  <p className={`font-outfit text-sm mb-6 ${plan.highlight ? "text-slate-400" : "text-slate-500"}`}>{plan.description}</p>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className={`font-lexend text-4xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>{plan.price}</span>
                      <span className={`font-outfit text-sm ${plan.highlight ? "text-slate-400" : "text-slate-500"}`}>MAD / mois</span>
                    </div>
                    <div className={`font-outfit text-[10px] mt-1 ${plan.highlight ? "text-slate-500" : "text-slate-400"}`}>par seat actif, HT</div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (<li key={f} className="flex items-start gap-2.5"><CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${plan.highlight ? "text-emerald-400" : "text-emerald-500"}`} /><span className={`font-outfit text-sm leading-snug ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>{f}</span></li>))}
                  </ul>
                  <Link href={plan.ctaUrl === "demo" ? demoUrl : signUpUrl} className={`font-outfit text-center text-[11px] tracking-widest uppercase font-medium py-3.5 rounded-sm transition-colors no-underline ${plan.highlight ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-900 text-white hover:bg-slate-700"}`}>{plan.cta}</Link>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}><p className="text-center font-outfit text-[11px] text-slate-400 mt-10">Besoin d'un plan sur mesure ? <a href={demoUrl} className="text-emerald-500 hover:text-emerald-600 underline underline-offset-2">Contactez-nous</a>.</p></FadeIn>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-xl mx-auto">
          <FadeIn><div className="text-center mb-16">
            <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-4">Mise en place</span>
            <h2 className="font-lexend font-bold text-slate-900" style={{ fontSize: "clamp(26px,4vw,44px)", letterSpacing: "-0.015em" }}>Opérationnel en <span className="text-emerald-500">5 minutes.</span></h2>
          </div></FadeIn>
          {[
            { n:"01", title:"Importez votre plan", desc:"Téléchargez le plan de votre chantier en PDF ou image. Notre outil de mise à l'échelle le recale automatiquement." },
            { n:"02", title:"Documentez sur le terrain", desc:"Sur le chantier, placez vos observations sur le plan. Associez photos, localisation GPS, assignation et priorité — tout depuis votre mobile." },
            { n:"03", title:"Invitez votre équipe", desc:"Partagez le projet avec sous-traitants, clients et partenaires. Guests gratuits et illimités, permissions configurables par rôle." },
            { n:"04", title:"Générez vos rapports", desc:"Rapports PDF professionnels générés en un clic, prêts à envoyer à vos clients et à la maîtrise d'ouvrage." },
          ].map(({ n, title, desc }, i) => (
            <FadeIn key={n} delay={i * 70}>
              <div className="grid gap-5 mb-11 items-start" style={{ gridTemplateColumns: "56px 1fr" }}>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-outfit text-[11px] font-semibold text-emerald-500">{n}</div>
                <div><div className="font-outfit text-sm font-medium text-slate-900 mb-2">{title}</div><p className="font-outfit text-sm text-slate-500 leading-relaxed">{desc}</p></div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: "radial-gradient(ellipse,rgba(16,185,129,0.15) 0%,transparent 60%)" }} />
        <div className="max-w-xl mx-auto text-center relative z-10">
          <FadeIn>
            <div className="flex items-center gap-5 mb-12"><div className="flex-1 h-px bg-slate-700" /><span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-400">Commencez dès aujourd'hui</span><div className="flex-1 h-px bg-slate-700" /></div>
            <h2 className="font-lexend font-bold text-white leading-none mb-6" style={{ fontSize: "clamp(32px,6vw,64px)", letterSpacing: "-0.025em" }}>Prêt à documenter<br /><span className="text-emerald-400">vos chantiers ?</span></h2>
            <div className="w-12 h-px mx-auto mb-7" style={{ background: "linear-gradient(90deg,transparent,#10b981 30%,#10b981 70%,transparent)" }} />
            <p className="font-outfit text-sm text-slate-400 leading-relaxed max-w-sm mx-auto mb-11">Rejoignez les architectes, MOD-AMO et entreprises du BTP qui gagnent 3h par visite de chantier avec ZaynSpace.</p>
            <div className="flex gap-2.5 justify-center flex-wrap mb-6">
              <Link href={signUpUrl} className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase font-medium bg-emerald-500 text-white px-10 py-4 rounded-sm hover:bg-emerald-600 transition-colors no-underline">Commencer gratuitement <ArrowUpRight size={14} /></Link>
              <Link href={demoUrl} className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-white px-10 py-4 border border-slate-700 rounded-sm hover:border-slate-500 hover:bg-slate-800 transition-all no-underline">Réserver une démo</Link>
            </div>
            <p className="font-outfit text-[10px] text-slate-500 tracking-widest">Pas de carte bancaire · 14 jours offerts · Conforme loi 09-08</p>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-10 px-6 md:px-12 bg-slate-900">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-7 h-7 bg-white rounded flex items-center justify-center"><Image src="/logo_blanc.png" alt="ZaynSpace" width={15} height={15} style={{ filter: "invert(1)" }} /></div>
            <span className="font-outfit text-base font-semibold text-slate-200">zaynspace</span>
          </Link>
          <div className="flex gap-7 flex-wrap">
            {[{ l:"Confidentialité",h:"/privacy"},{ l:"CGU",h:"/terms"},{ l:"Contact",h:demoUrl}].map(({ l, h }) => (
              <Link key={l} href={h} className="font-outfit text-[11px] tracking-widest uppercase text-slate-500 hover:text-slate-200 transition-colors no-underline">{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "page-blink 1.5s step-end infinite" }} />
            <span className="font-outfit text-[10px] text-slate-500 tracking-widest">© {new Date().getFullYear()} ZAYNSPACE · Casablanca, Maroc</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeOnly { from{opacity:0} to{opacity:1} }
        @keyframes page-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes float-card { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>
    </div>
  );
}