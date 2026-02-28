"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowUpRight, MapPin, Camera,
  CheckCircle2, TrendingUp, ShieldCheck, FileText,
  Users, BarChart3, Wifi,
} from "lucide-react";

/* ── SETUP REQUIRED in layout.tsx:
   import { Outfit, Lexend } from "next/font/google"
   const outfit = Outfit({ subsets:["latin"], weight:["400","500","600","700"], variable:"--font-outfit" })
   const lexend = Lexend({ subsets:["latin"], weight:["600","700"], variable:"--font-lexend" })
   <html className={`${outfit.variable} ${lexend.variable}`}>

   in tailwind.config.ts:
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

function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.5);
  const started = useRef(false);
  useEffect(() => {
    if (inView && !started.current) {
      started.current = true;
      const t0 = performance.now();
      const run = (now: number) => {
        const p = Math.min((now - t0) / 1800, 1);
        setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
        if (p < 1) requestAnimationFrame(run); else setCount(end);
      };
      requestAnimationFrame(run);
    }
  }, [inView, end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function AppMockup() {
  const [activeTask, setActiveTask] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveTask(p => (p + 1) % 4), 2200);
    return () => clearInterval(t);
  }, []);

  const tasks = [
    { label: "Inspection électrique", status: "EN COURS",   color: "#10b981", progress: 65,  zone: "Zone A" },
    { label: "Charpente bois R+1",    status: "TERMINÉ",    color: "#16a34a", progress: 100, zone: "Zone B" },
    { label: "Retard livraison acier",status: "BLOQUÉ",     color: "#dc2626", progress: 30,  zone: "Salle principale" },
    { label: "Cloisons intérieures",  status: "EN ATTENTE", color: "#d97706", progress: 0,   zone: "Local tech." },
  ];
  const pins = [{ left:"20%",top:"26%" },{ left:"78%",top:"26%" },{ left:"28%",top:"66%" },{ left:"74%",top:"68%" }];
  const rooms = [
    { x:"5%",y:"8%",w:"35%",h:"38%",label:"Zone A" },
    { x:"42%",y:"8%",w:"22%",h:"38%",label:"Couloir" },
    { x:"66%",y:"8%",w:"28%",h:"38%",label:"Zone B" },
    { x:"5%",y:"50%",w:"52%",h:"38%",label:"Salle principale" },
    { x:"60%",y:"50%",w:"34%",h:"38%",label:"Local tech." },
  ];
  const nav = [
    { icon: BarChart3, label:"Tableau de bord", active:false },
    { icon: MapPin,    label:"Plan interactif", active:true  },
    { icon: FileText,  label:"Rapports",        active:false },
    { icon: Users,     label:"Équipe",          active:false },
    { icon: Camera,    label:"Médias",          active:false },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white text-xs font-outfit">
      {/* Topbar */}
      <div className="h-11 bg-slate-900 flex items-center px-4 gap-2 shrink-0">
        <div className="flex gap-1.5">
          {["#ff5f57","#febc2e","#28c840"].map(c => (
            <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="flex-1 mx-3 bg-white/10 rounded h-5 flex items-center px-2">
          <span className="text-white/40" style={{ fontSize: 9 }}>app.zaynspace.com · Chantier Bellevue · R+1</span>
        </div>
        <Wifi size={10} className="text-white/30" />
      </div>

      {/* Layout */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: "200px 1fr" }}>
        {/* Sidebar */}
        <div className="bg-slate-900 flex flex-col py-4 border-r border-white/5">
          <div className="px-3.5 pb-4 mb-4 border-b border-white/5">
            <div className="text-slate-200 font-semibold mb-0.5" style={{ fontSize: 11 }}>Chantier Bellevue</div>
            <div className="text-white/30 tracking-widest" style={{ fontSize: 8 }}>4 INTERVENANTS ACTIFS</div>
          </div>
          {nav.map(({ icon: Icon, label, active }) => (
            <div key={label} className="flex items-center gap-2.5 px-3.5 py-2 mb-0.5 cursor-pointer"
              style={{
                background: active ? "rgba(16,185,129,0.15)" : "transparent",
                borderLeft: active ? "2px solid #10b981" : "2px solid transparent",
              }}>
              <Icon size={12} color={active ? "#60a5fa" : "rgba(255,255,255,0.3)"} />
              <span className={active ? "text-slate-200" : "text-white/35"} style={{ fontSize: 11, fontWeight: active ? 500 : 400 }}>{label}</span>
            </div>
          ))}
          <div className="mt-auto px-3.5 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "linear-gradient(135deg,#10b981,#7c3aed)", fontSize: 8 }}>SM</div>
              <div>
                <div className="text-slate-200 font-medium" style={{ fontSize: 10 }}>S. Martin</div>
                <div className="text-white/30" style={{ fontSize: 8 }}>Chef de projet</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="bg-slate-100 flex flex-col overflow-hidden">
          <div className="h-10 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
            <span className="text-slate-900 font-semibold" style={{ fontSize: 11 }}>Plan interactif</span>
            <div className="ml-auto flex gap-1.5">
              <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-500" style={{ fontSize: 9 }}>Niveau R+1</div>
              <div className="px-2.5 py-1 bg-emerald-500 rounded text-white font-medium" style={{ fontSize: 9 }}>+ Tâche</div>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-3 border border-slate-300 rounded bg-white"
              style={{
                backgroundImage: "linear-gradient(#f1f5f9 1px,transparent 1px),linear-gradient(90deg,#f1f5f9 1px,transparent 1px)",
                backgroundSize: "20px 20px",
              }}>
              {rooms.map(r => (
                <div key={r.label} className="absolute border border-slate-300 bg-slate-50/60 flex items-start p-1.5"
                  style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
                  <span className="text-slate-400 font-medium tracking-widest uppercase" style={{ fontSize: 7 }}>{r.label}</span>
                </div>
              ))}
              {tasks.map((task, i) => {
                const pos = pins[i];
                const active = activeTask === i;
                return (
                  <div key={i} className="absolute" style={{ ...pos, transform: "translate(-50%,-50%)", zIndex: active ? 10 : 5 }}>
                    {active && (
                      <div className="absolute rounded-full border"
                        style={{ inset: -12, borderColor: task.color, opacity: 0.4, animation: "mockup-pulse 1.2s ease-out infinite" }} />
                    )}
                    <div className="rounded-full border-2 border-white flex items-center justify-center cursor-pointer transition-all duration-300"
                      style={{ width: active ? 20 : 14, height: active ? 20 : 14, background: task.color, boxShadow: `0 2px 8px ${task.color}55` }}>
                      <div className="w-1 h-1 rounded-full bg-white/80" />
                    </div>
                    {active && (
                      <div className="absolute bg-slate-900 rounded-md shadow-xl"
                        style={{ bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", width: 150, padding: "10px 12px" }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: task.color }} />
                          <span className="font-semibold tracking-wide" style={{ fontSize: 7.5, color: task.color }}>{task.status}</span>
                        </div>
                        <div className="text-slate-200 font-medium mb-1" style={{ fontSize: 10 }}>{task.label}</div>
                        <div className="text-white/40" style={{ fontSize: 8 }}>{task.zone}</div>
                        <div className="mt-1.5 h-0.5 bg-white/10 rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${task.progress}%`, background: task.color }} />
                        </div>
                        <div className="text-white/30 mt-1" style={{ fontSize: 7 }}>{task.progress}% complété</div>
                        <div className="absolute w-0 h-0 left-1/2 -translate-x-1/2"
                          style={{ bottom: -5, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #0f172a" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex" style={{ height: 52 }}>
              {tasks.map((task, i) => (
                <div key={i} onClick={() => setActiveTask(i)}
                  className="flex-1 flex items-center gap-2 px-3 cursor-pointer border-r border-slate-50 transition-colors"
                  style={{
                    background: activeTask === i ? "#f8fafc" : "#fff",
                    borderBottom: activeTask === i ? `2px solid ${task.color}` : "2px solid transparent",
                  }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: task.color }} />
                  <div>
                    <div className="text-slate-900 font-medium leading-tight" style={{ fontSize: 9 }}>{task.label}</div>
                    <div className="text-slate-400" style={{ fontSize: 8 }}>{task.zone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mockup-pulse { 0% { transform:scale(0.8); opacity:0.6; } 100% { transform:scale(2.2); opacity:0; } }
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

  const loginUrl =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://app.localhost:3000/sign-in"
      : "https://app.zaynspace.com/sign-in";

  const features = [
    { icon: TrendingUp,  title: "Suivi temps réel",       desc: "Chaque action sur le chantier est capturée et synchronisée instantanément. Votre équipe voit les mises à jour au moment où elles se produisent, sans latence, sans friction." },
    { icon: ShieldCheck, title: "Protection juridique",    desc: "Chaque tâche est horodatée et documentée automatiquement. En cas de litige, votre historique complet est disponible en un instant, exportable en PDF légal." },
    { icon: FileText,    title: "Rapports à la demande",   desc: "Générez des rapports professionnels complets en un clic. Partagez-les directement avec vos clients, architectes ou sous-traitants depuis l'application." },
    { icon: MapPin,      title: "Géolocalisation précise", desc: "Placez chaque tâche sur le plan avec une précision chirurgicale. Les coordonnées GPS sont capturées automatiquement à chaque relevé terrain." },
    { icon: Camera,      title: "Documentation visuelle",  desc: "Associez photos et annotations directement aux tâches. Le contexte visuel est préservé avec la localisation exacte sur le plan." },
    { icon: Users,       title: "Collaboration fluide",    desc: "Invitez votre équipe, vos clients et sous-traitants. Les permissions sont granulaires — chacun voit exactement ce dont il a besoin." },
  ];

  return (
    <div className="min-h-screen bg-[#fefefe] text-slate-900 font-outfit">

      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-12 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-lg border-b border-slate-200" : "bg-transparent"}`}>
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
            <Image src="/logo_blanc.png" alt="ZaynSpace" width={18} height={18} />
          </div>
          <span className="font-outfit text-lg font-semibold text-slate-900 tracking-tight">zaynspace</span>
        </Link>

        <nav className="hidden md:flex gap-9 ml-14 flex-1">
          {["Fonctionnalités","Témoignages","Tarifs"].map(l => (
            <a key={l} href="#"
              className="font-outfit text-[11px] tracking-widest uppercase text-slate-400 hover:text-slate-900 transition-colors no-underline relative group">
              {l}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-slate-900 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-6 ml-auto">
          <Link href={loginUrl}
            className="font-outfit text-[11px] tracking-widest uppercase text-slate-400 hover:text-slate-900 transition-colors no-underline">
            Connexion
          </Link>
          <a href="#"
            className="font-outfit text-[11px] tracking-widest uppercase font-medium bg-slate-900 text-white px-5 py-2.5 rounded-sm hover:bg-slate-700 transition-colors no-underline">
            Essai gratuit
          </a>
        </div>

        <button onClick={() => setMenuOpen(true)}
          className="md:hidden ml-auto bg-transparent border-none text-slate-900 cursor-pointer p-0">
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-[#fefefe] z-50 flex flex-col px-7 pb-10">
          <div className="h-16 flex items-center justify-between">
            <span className="font-outfit text-lg font-semibold">zaynspace</span>
            <button onClick={() => setMenuOpen(false)}
              className="bg-transparent border-none text-slate-400 cursor-pointer p-0"><X size={20} /></button>
          </div>
          <div className="h-px bg-slate-200" />
          <nav className="flex-1 flex flex-col justify-center gap-9">
            {["Fonctionnalités","Témoignages","Tarifs"].map(l => (
              <a key={l} href="#" className="font-outfit text-3xl font-medium text-slate-900 no-underline">{l}</a>
            ))}
          </nav>
          <a href="#"
            className="font-outfit text-[11px] tracking-widest uppercase font-medium bg-slate-900 text-white py-4 text-center rounded-sm no-underline">
            Commencer
          </a>
        </div>
      )}

      {/* HERO */}
      <section className="min-h-screen grid md:grid-cols-2 items-center pt-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(15,23,42,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,0.04) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
        <div className="absolute top-1/2 right-1/3 w-96 h-96 -translate-y-1/2 translate-x-1/2 pointer-events-none"
          style={{ background: "radial-gradient(ellipse,rgba(16,185,129,0.06) 0%,transparent 65%)" }} />

        <div className="px-12 py-20 relative z-10">
          <h1 className="font-lexend font-bold text-slate-900 leading-none mb-1"
            style={{ fontSize: "clamp(40px,5vw,64px)", letterSpacing: "-0.02em", opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.2s forwards slideUp" }}>
            Le chantier,
          </h1>
          <h1 className="font-lexend font-bold text-emerald-500 leading-none mb-7"
            style={{ fontSize: "clamp(40px,5vw,64px)", letterSpacing: "-0.02em", opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.32s forwards slideUp" }}>
            sous contrôle.
          </h1>

          <div className="w-12 h-px mb-7"
            style={{ background: "linear-gradient(90deg,transparent,#10b981 30%,#10b981 70%,transparent)", opacity: 0, animation: "0.5s ease 0.44s forwards fadeOnly" }} />

          <p className="font-outfit text-base text-slate-500 leading-relaxed mb-10 max-w-md"
            style={{ opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.5s forwards slideUp" }}>
            Relevez les tâches sur plan, associez photos et localisations, suivez l'avancement en temps réel. La plateforme de gestion de chantier la plus précise du marché.
          </p>

          <div className="flex gap-2.5 flex-wrap mb-10"
            style={{ opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.62s forwards slideUp" }}>
            <a href="#"
              className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase font-medium bg-slate-900 text-white px-7 py-3.5 rounded-sm hover:bg-slate-700 transition-colors no-underline">
              Commencer gratuitement <ArrowUpRight size={13} />
            </a>
            <a href="#"
              className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-slate-900 px-7 py-3.5 border border-slate-300 rounded-sm hover:border-slate-900 hover:bg-slate-50 transition-all no-underline">
              Voir la démo
            </a>
          </div>

          <div className="flex gap-6 flex-wrap mb-12"
            style={{ opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.74s forwards slideUp" }}>
            {["Pas de carte bancaire","14 jours offerts","Annulation libre"].map(t => (
              <span key={t} className="font-outfit flex items-center gap-1.5 text-[11px] text-slate-400 tracking-wide">
                <CheckCircle2 size={11} className="text-emerald-500" /> {t}
              </span>
            ))}
          </div>

          <div className="flex gap-8 pt-8 border-t border-slate-200"
            style={{ opacity: 0, animation: "0.9s ease 0.9s forwards slideUp" }}>
            {[["2.4k+","projets actifs"],["98%","satisfaction"],["3×","plus rapide"]].map(([v,l]) => (
              <div key={l}>
                <div className="font-lexend text-2xl font-bold text-slate-900 leading-none">{v}</div>
                <div className="font-outfit text-[10px] text-slate-400 mt-1 tracking-widest uppercase">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: range.io style hero visual */}
        <div className="hidden md:flex flex-col justify-center relative h-screen bg-slate-50 border-l border-slate-100 overflow-hidden"
          style={{ opacity: 0, animation: "1s ease 0.4s forwards fadeOnly" }}>

          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-slate-50 to-slate-100" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(16,185,129,0.08) 0%, transparent 60%)" }} />

          {/* Main screenshot — tilted, overflowing bottom */}
          <div className="absolute left-8 right-0 bottom-0 top-16"
            style={{ perspective: "1200px" }}>
            <div className="relative w-full h-full"
              style={{ transform: "rotateX(4deg) rotateY(-3deg) scale(1.05)", transformOrigin: "top center" }}>
              <div className="absolute inset-0 rounded-tl-xl rounded-tr-xl overflow-hidden shadow-[0_32px_80px_rgba(15,23,42,0.18)] border border-slate-200/80">
                <img src="/app-screenshot.jpg" alt="ZaynSpace app" className="w-full h-full object-cover object-top" />
                {/* Subtle overlay to blend bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent" />
              </div>
            </div>
          </div>

          {/* Floating card 1 — task status */}
          <div className="absolute top-24 right-6 bg-white rounded-xl shadow-xl border border-slate-100 p-3.5 w-44 z-20"
            style={{ animation: "float-card 4s ease-in-out infinite" }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-outfit font-semibold text-[10px] text-emerald-500 tracking-wide uppercase">En cours</span>
            </div>
            <div className="font-outfit font-semibold text-slate-900 text-[12px] mb-1">Disjoncteur H.S.</div>
            <div className="font-outfit text-[10px] text-slate-400 mb-2.5">Marouane Reda · ID: 17-3</div>
            <div className="h-1 bg-slate-100 rounded-full">
              <div className="h-full w-3/5 bg-emerald-500 rounded-full" />
            </div>
          </div>

          {/* Floating card 2 — done */}
          <div className="absolute top-52 left-4 bg-white rounded-xl shadow-xl border border-slate-100 p-3 w-40 z-20"
            style={{ animation: "float-card 4s ease-in-out 1.4s infinite" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-outfit font-semibold text-[10px] text-emerald-600 tracking-wide uppercase">Terminé</span>
            </div>
            <div className="font-outfit font-medium text-slate-900 text-[11px]">Carreaux cassés</div>
            <div className="font-outfit text-[9px] text-slate-400 mt-0.5">il y a 24 jours</div>
          </div>

          {/* Floating card 3 — member count */}
          <div className="absolute bottom-28 right-8 bg-slate-900 rounded-xl shadow-xl p-3 z-20 flex items-center gap-2.5"
            style={{ animation: "float-card 4s ease-in-out 2.5s infinite" }}>
            <div className="flex -space-x-1.5">
              {["#10b981","#8b5cf6","#10b981"].map(c => (
                <div key={c} className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white font-outfit" style={{ background: c }}>
                  {c === "#10b981" ? "M" : c === "#8b5cf6" ? "S" : "K"}
                </div>
              ))}
            </div>
            <div>
              <div className="font-outfit font-semibold text-white text-[11px]">4 actifs</div>
              <div className="font-outfit text-slate-400 text-[9px]">sur le chantier</div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden px-6 pb-16">
          <div className="rounded-xl overflow-hidden shadow-xl border border-slate-200" style={{ aspectRatio: "9/16", maxHeight: 500 }}>
            <img src="/app-screenshot.jpg" alt="ZaynSpace app" className="w-full h-full object-cover object-top" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-t border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-3">
          {[
            { n: 2400, s: "+", label: "Projets actifs",     sub: "sur la plateforme" },
            { n: 98,   s: "%", label: "Satisfaction client", sub: "équipes B2B" },
            { n: 3,    s: "×", label: "Plus rapide",         sub: "qu'une gestion papier" },
          ].map(({ n, s, label, sub }, i) => (
            <FadeIn key={label} delay={i * 80}>
              <div className={`p-9 relative overflow-hidden group hover:shadow-md transition-all bg-white ${i > 0 ? "border-l border-slate-200" : ""}`}>
                <div className="absolute bottom-0 left-0 h-0.5 w-1/4 bg-emerald-500 group-hover:w-full transition-all duration-500" />
                <div className="font-lexend font-bold text-emerald-500 leading-none mb-2" style={{ fontSize: "clamp(36px,4vw,52px)" }}>
                  <Counter end={n} suffix={s} />
                </div>
                <div className="font-outfit text-sm font-medium text-slate-900 mb-1">{label}</div>
                <div className="font-outfit text-[10px] text-slate-400 tracking-widest uppercase">{sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 border-t border-b border-slate-100 bg-[#fefefe]">
        <div className="max-w-5xl mx-auto">
          <div className="hidden md:grid grid-cols-2 gap-20 items-start">
            <FadeIn>
              <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-5">Fonctionnalités</span>
              <h2 className="font-lexend font-bold text-slate-900 leading-tight mb-12"
                style={{ fontSize: "clamp(28px,3.5vw,42px)", letterSpacing: "-0.015em" }}>
                Conçu pour les équipes<br />
                <span className="text-emerald-500">qui construisent.</span>
              </h2>
              <div className="pl-5">
                {features.map((f, i) => (
                  <div key={f.title} onClick={() => setActiveFeature(i)}
                    className="py-4 border-b border-slate-100 cursor-pointer relative transition-all"
                    style={{ paddingLeft: activeFeature === i ? 4 : 0 }}>
                    <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-0.5 bg-emerald-500 transition-all duration-300"
                      style={{ height: activeFeature === i ? "60%" : "0%" }} />
                    <span className={`font-outfit text-sm transition-colors ${activeFeature === i ? "font-medium text-slate-900" : "text-slate-400"}`}>
                      {f.title}
                    </span>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <div className="bg-white border border-slate-200 rounded-lg p-10 sticky top-20 shadow-sm min-h-64">
                {(() => { const Icon = features[activeFeature].icon; return (
                  <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center mb-6">
                    <Icon size={20} className="text-emerald-500" />
                  </div>
                ); })()}
                <h3 className="font-lexend font-semibold text-slate-900 mb-3.5"
                  style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
                  {features[activeFeature].title}
                </h3>
                <p className="font-outfit text-sm text-slate-500 leading-relaxed">
                  {features[activeFeature].desc}
                </p>
                <a href="#"
                  className="font-outfit inline-flex items-center gap-1.5 mt-7 text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 no-underline hover:gap-3 transition-all">
                  En savoir plus <ArrowUpRight size={10} />
                </a>
              </div>
            </FadeIn>
          </div>

          <div className="md:hidden flex flex-col gap-3.5">
            <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-3">Fonctionnalités</span>
            <h2 className="font-lexend font-bold text-slate-900 mb-8" style={{ fontSize: 28, letterSpacing: "-0.015em" }}>
              Conçu pour les équipes <span className="text-emerald-500">qui construisent.</span>
            </h2>
            {features.map(f => { const Icon = f.icon; return (
              <div key={f.title} className="p-6 bg-white border border-slate-200 rounded-lg">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                  <Icon size={16} className="text-emerald-500" />
                </div>
                <div className="font-outfit text-sm font-medium text-slate-900 mb-2">{f.title}</div>
                <p className="font-outfit text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500 block mb-4">Mise en place</span>
              <h2 className="font-lexend font-bold text-slate-900"
                style={{ fontSize: "clamp(26px,4vw,44px)", letterSpacing: "-0.015em" }}>
                Opérationnel en <span className="text-emerald-500">5 minutes.</span>
              </h2>
            </div>
          </FadeIn>

          {[
            { n:"01", title:"Importez votre plan",   desc:"Téléchargez le plan de votre chantier en PDF ou image. Notre outil de mise à l'échelle le recale automatiquement." },
            { n:"02", title:"Placez vos tâches",     desc:"Cliquez sur le plan pour créer une tâche. Associez photos, localisations, assignations et niveaux de priorité." },
            { n:"03", title:"Invitez votre équipe",  desc:"Partagez le projet avec sous-traitants et clients. Les permissions sont granulaires, configurables par rôle." },
            { n:"04", title:"Pilotez en temps réel", desc:"Tableau de bord en direct, alertes automatiques, rapports PDF générés à la demande en un clic." },
          ].map(({ n, title, desc }, i) => (
            <FadeIn key={n} delay={i * 70}>
              <div className="grid gap-5 mb-11 items-start" style={{ gridTemplateColumns: "56px 1fr" }}>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-outfit text-[11px] font-semibold text-emerald-500">
                  {n}
                </div>
                <div>
                  <div className="font-outfit text-sm font-medium text-slate-900 mb-2">{title}</div>
                  <p className="font-outfit text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-red-500" />
              <div className="bg-slate-800 p-12">
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <blockquote className="font-outfit font-normal text-slate-200 leading-relaxed mb-9 max-w-lg"
                  style={{ fontSize: "clamp(18px,2.5vw,24px)", letterSpacing: "-0.01em" }}>
                  "ZaynSpace a transformé notre façon de gérer les chantiers. La documentation nous prend trois fois moins de temps, et nos équipes sont enfin parfaitement alignées."
                </blockquote>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-outfit text-[11px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#10b981,#7c3aed)" }}>CS</div>
                  <div>
                    <div className="font-outfit text-sm font-semibold text-slate-200">Ghita Alami</div>
                    <div className="font-outfit text-[10px] text-slate-500 mt-0.5 tracking-widest">Ghita Alami Architecte</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 bg-[#fefefe]">
        <div className="max-w-xl mx-auto text-center">
          <FadeIn>
            <div className="flex items-center gap-5 mb-12">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="font-outfit text-[10px] font-medium tracking-[0.2em] uppercase text-emerald-500">Commencez dès aujourd'hui</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <h2 className="font-lexend font-bold text-slate-900 leading-none mb-6"
              style={{ fontSize: "clamp(32px,6vw,72px)", letterSpacing: "-0.025em" }}>
              Prêt à optimiser<br />
              <span className="text-emerald-500">vos chantiers ?</span>
            </h2>
            <div className="w-12 h-px mx-auto mb-7"
              style={{ background: "linear-gradient(90deg,transparent,#10b981 30%,#10b981 70%,transparent)" }} />
            <p className="font-outfit text-sm text-slate-500 leading-relaxed max-w-xs mx-auto mb-11">
              Rejoignez des milliers de professionnels de la construction qui font confiance à ZaynSpace.
            </p>
            <div className="flex gap-2.5 justify-center flex-wrap mb-6">
              <a href="#"
                className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase font-medium bg-slate-900 text-white px-10 py-4 rounded-sm hover:bg-slate-700 transition-colors no-underline">
                Commencer maintenant <ArrowUpRight size={14} />
              </a>
              <a href="#"
                className="font-outfit inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-slate-900 px-10 py-4 border border-slate-300 rounded-sm hover:border-slate-900 hover:bg-slate-50 transition-all no-underline">
                Voir la démo
              </a>
            </div>
            <p className="font-outfit text-[10px] text-slate-400 tracking-widest">
              Pas de carte bancaire · 14 jours offerts · Annulation à tout moment
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-10 px-12 bg-slate-900">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
              <Image src="/logo_blanc.png" alt="ZaynSpace" width={15} height={15} style={{ filter: "invert(1)" }} />
            </div>
            <span className="font-outfit text-base font-semibold text-slate-200">zaynspace</span>
          </Link>
          <div className="flex gap-7">
            {[{ l:"Confidentialité",h:"/privacy"},{ l:"CGU",h:"/terms"},{ l:"Twitter",h:"#"},{ l:"GitHub",h:"#"}].map(({ l, h }) => (
              <a key={l} href={h}
                className="font-outfit text-[11px] tracking-widest uppercase text-slate-500 hover:text-slate-200 transition-colors no-underline">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: "page-blink 1.5s step-end infinite" }} />
            <span className="font-outfit text-[10px] text-slate-500 tracking-widest">© {new Date().getFullYear()} ZAYNSPACE</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes slideUp  { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeOnly { from { opacity:0; } to { opacity:1; } }
        @keyframes page-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}