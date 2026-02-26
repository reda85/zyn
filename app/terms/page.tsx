"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowLeft, FileText, Briefcase, User,
  CheckSquare, Star, Copyright, Server,
  AlertTriangle, RefreshCw, XCircle, Scale, Bell, Mail
} from "lucide-react";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>{children}</div>
  );
}

const C = {
  bg:      "#060810",
  bg2:     "#0a0d16",
  bg3:     "#0e1220",
  text:    "#e0f2fe",
  muted:   "rgba(224,242,254,0.42)",
  white:   "#ffffff",
  border:  "rgba(255,255,255,0.1)",
  border2: "rgba(255,255,255,0.18)",
};

const sections = [
  {
    icon: FileText,
    id: "acceptation",
    title: "1. Acceptation des conditions",
    content: [
      "Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation de l'application mobile ZaynSpace (l'« Application ») éditée par ZaynSpace.",
      "En créant un compte ou en utilisant l'Application, vous acceptez les présentes CGU dans leur intégralité. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser l'Application.",
    ],
  },
  {
    icon: Briefcase,
    id: "service",
    title: "2. Description du service",
    content: [
      "ZaynSpace est une application de gestion de tâches professionnelles permettant de relever et d'organiser des tâches sur un plan, d'y associer des photos, des localisations et d'autres métadonnées, et d'en assurer le suivi en temps réel.",
      "L'Application est destinée exclusivement à un usage professionnel et entrepreneurial (B2B).",
    ],
  },
  {
    icon: User,
    id: "compte",
    title: "3. Compte utilisateur",
    content: [
      "L'accès à l'Application nécessite la création d'un compte avec une adresse e-mail valide et un mot de passe. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités effectuées sous votre compte.",
      "Vous vous engagez à fournir des informations exactes lors de l'inscription et à les maintenir à jour. ZaynSpace se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.",
    ],
  },
  {
    icon: CheckSquare,
    id: "utilisation",
    title: "4. Utilisation acceptable",
    content: [
      "Vous vous engagez à utiliser l'Application uniquement à des fins légales et professionnelles. Il est expressément interdit de : télécharger des contenus illicites, offensants ou portant atteinte aux droits de tiers ; tenter de contourner les mécanismes de sécurité ; utiliser l'Application pour concurrencer déloyalement ZaynSpace ; partager votre compte avec des personnes non autorisées au sein de votre organisation.",
    ],
  },
  {
    icon: Star,
    id: "contenu",
    title: "5. Contenu utilisateur",
    content: [
      "Vous conservez la propriété intellectuelle de tout contenu (textes, photos, données) que vous importez dans l'Application. En utilisant l'Application, vous accordez à ZaynSpace une licence limitée, non exclusive et révocable, uniquement dans le but d'héberger et de synchroniser votre contenu.",
      "Vous êtes seul responsable du contenu que vous créez et de sa conformité aux lois applicables, notamment en matière de droit à l'image et de propriété intellectuelle.",
    ],
  },
  {
    icon: Copyright,
    id: "propriete",
    title: "6. Propriété intellectuelle",
    content: [
      "L'Application, son interface, son code source, ses fonctionnalités et sa marque sont la propriété exclusive de ZaynSpace. Toute reproduction, modification ou utilisation commerciale sans autorisation préalable est strictement interdite.",
      "La présente licence d'utilisation est personnelle, non exclusive et non transférable.",
    ],
  },
  {
    icon: Server,
    id: "disponibilite",
    title: "7. Disponibilité du service",
    content: [
      "ZaynSpace s'efforce d'assurer la disponibilité de l'Application 24h/24, 7j/7. Toutefois, nous ne pouvons garantir une disponibilité ininterrompue. Des interruptions pour maintenance ou pour des raisons techniques peuvent survenir.",
      "ZaynSpace ne pourra être tenu responsable de pertes résultant d'une indisponibilité temporaire du service.",
    ],
  },
  {
    icon: AlertTriangle,
    id: "responsabilite",
    title: "8. Limitation de responsabilité",
    content: [
      "ZaynSpace fournit l'Application « en l'état ». Dans les limites autorisées par la loi, ZaynSpace ne pourra être tenu responsable des dommages indirects, perte de données ou perte de profits résultant de l'utilisation ou de l'impossibilité d'utiliser l'Application.",
      "Il est fortement recommandé d'effectuer des sauvegardes régulières de vos données importantes.",
    ],
  },
  {
    icon: RefreshCw,
    id: "modifications-service",
    title: "9. Modifications du service",
    content: [
      "ZaynSpace se réserve le droit de modifier, suspendre ou interrompre tout ou partie de l'Application à tout moment. En cas de modification substantielle des fonctionnalités payantes, vous en serez informé au préalable.",
    ],
  },
  {
    icon: XCircle,
    id: "resiliation",
    title: "10. Résiliation",
    content: [
      "Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'Application. ZaynSpace peut résilier votre accès en cas de violation des présentes CGU, avec ou sans préavis selon la gravité de la violation.",
      "La résiliation entraîne la suppression progressive de vos données conformément à la Politique de Confidentialité.",
    ],
  },
  {
    icon: Scale,
    id: "droit",
    title: "11. Droit applicable",
    content: [
      "Les présentes CGU sont soumises au droit applicable dans le pays de résidence de l'éditeur. Tout litige sera soumis à la juridiction compétente correspondante.",
      "Si une clause des présentes est déclarée nulle, les autres clauses restent valides et applicables.",
    ],
  },
  {
    icon: Bell,
    id: "modifications-cgu",
    title: "12. Modifications des CGU",
    content: [
      "ZaynSpace se réserve le droit de modifier les présentes CGU. Les modifications importantes vous seront notifiées par e-mail ou via l'Application au moins 15 jours avant leur entrée en vigueur. La poursuite de l'utilisation de l'Application après cette période vaut acceptation des nouvelles conditions.",
    ],
  },
  {
    icon: Mail,
    id: "contact",
    title: "13. Contact",
    content: ["Pour toute question relative aux présentes CGU : legal@zaynspace.com"],
  },
];

export default function TermsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: #060810; color: #e0f2fe;
          font-family: 'Outfit', sans-serif; font-weight: 300;
          -webkit-font-smoothing: antialiased; overflow-x: hidden;
        }
        .eyebrow {
          font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase; color: #ffffff;
        }
        .white-line { height: 1px; background: linear-gradient(90deg, transparent, #ffffff 30%, #ffffff 70%, transparent); }
        .tech-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .nav-link {
          position: relative; text-decoration: none;
          font-family: 'Outfit', sans-serif; font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(224,242,254,0.45); transition: color 0.2s;
        }
        .nav-link:hover { color: #e0f2fe; }
        .nav-link::after {
          content: ''; position: absolute; bottom: -3px; left: 0;
          width: 0; height: 1px; background: #ffffff;
          box-shadow: 0 0 4px rgba(255,255,255,0.5);
          transition: width 0.3s ease;
        }
        .nav-link:hover::after { width: 100%; }
        .btn-p {
          display: inline-flex; align-items: center; gap: 8px;
          background: #ffffff; color: #060810;
          font-family: 'Outfit', sans-serif; font-weight: 500;
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 9px 20px; border: none; border-radius: 2px;
          cursor: pointer; transition: all 0.2s ease; text-decoration: none;
        }
        .btn-p:hover { box-shadow: 0 0 20px rgba(255,255,255,0.25); transform: translateY(-1px); }
        .section-card {
          background: #0a0d16; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px; padding: 36px 40px;
          transition: border-color 0.3s ease;
          position: relative; overflow: hidden;
        }
        .section-card::before {
          content: ''; position: absolute; top: 0; left: 0;
          width: 2px; height: 0; background: #ffffff;
          transition: height 0.4s ease;
        }
        .section-card:hover::before { height: 100%; }
        .section-card:hover { border-color: rgba(255,255,255,0.22); }
        .toc-link {
          font-size: 12px; color: rgba(224,242,254,0.45);
          text-decoration: none; transition: color 0.2s;
          font-family: 'Outfit', sans-serif;
          display: flex; align-items: center; gap: 8px;
        }
        .toc-link::before { content: '—'; color: rgba(255,255,255,0.2); font-size: 10px; }
        .toc-link:hover { color: #e0f2fe; }
        .toc-link:hover::before { color: #ffffff; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #060810; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 2px; }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .hp { padding: 0 20px !important; }
          .content-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg }}>

        {/* ── HEADER */}
        <header style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          height: 68, display: "flex", alignItems: "center", padding: "0 48px",
          background: scrolled ? "rgba(6,8,16,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
          transition: "all 0.3s ease",
        }} className="hp">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 30, height: 30, background: C.white, borderRadius: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 12px rgba(255,255,255,0.3)",
            }}>
              <Image src="/logo_blanc.png" alt="ZaynSpace" width={18} height={18} style={{ filter: "invert(1)" }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>zaynspace</span>
          </Link>

          <nav className="desktop-only" style={{ display: "flex", gap: 36, marginLeft: 56, flex: 1 }}>
            {["Fonctionnalités", "Témoignages", "Tarifs"].map(l => (
              <a key={l} href="/#" className="nav-link">{l}</a>
            ))}
          </nav>

          <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 24, marginLeft: "auto" }}>
            
            <Link href={loginUrl} className="nav-link">Connexion</Link>
            <a href="/#" className="btn-p">Essai gratuit</a>
          </div>

          <button onClick={() => setMenuOpen(true)} style={{ display: "none", marginLeft: "auto", background: "none", border: "none", color: C.text, cursor: "pointer" }} className="mobile-only">
            <Menu size={20} />
          </button>
        </header>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 200, display: "flex", flexDirection: "column", padding: "0 28px 40px" }}>
            <div style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>zaynspace</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="white-line" />
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
              {["Fonctionnalités", "Témoignages", "Tarifs"].map(l => (
                <a key={l} href="/#" style={{ fontSize: 28, fontWeight: 500, color: C.text, textDecoration: "none" }}>{l}</a>
              ))}
            </nav>
            <a href="/#" className="btn-p" style={{ justifyContent: "center" }}>Commencer</a>
          </div>
        )}

        {/* ── HERO BANNER */}
        <section style={{
          paddingTop: 68, position: "relative", overflow: "hidden",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div className="tech-grid" style={{ position: "absolute", inset: 0 }} />
          <div style={{
            position: "absolute", top: "50%", left: "30%",
            width: 500, height: 500,
            background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)",
            transform: "translate(-50%,-50%)", pointerEvents: "none",
          }} />

          <div style={{ maxWidth: 900, margin: "0 auto", padding: "72px 48px 64px", position: "relative", zIndex: 2 }} className="hp">
            <div style={{ opacity: 0, animation: "0.7s ease 0.1s forwards slideUp" }}>
              <Link href="/" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 11, color: C.muted, textDecoration: "none",
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 32, transition: "color 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
              >
                <ArrowLeft size={13} /> Retour à l'accueil
              </Link>
            </div>

            <div style={{ opacity: 0, animation: "0.7s ease 0.15s forwards slideUp" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border2}`,
                borderRadius: 2, padding: "6px 14px", marginBottom: 24,
              }}>
                <FileText size={11} color={C.white} />
                <span className="eyebrow" style={{ fontSize: 9 }}>Conditions d'utilisation · Mise à jour le 22 fév. 2026</span>
              </div>
            </div>

            <h1 style={{
              fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700,
              letterSpacing: "-0.03em", lineHeight: 1.05, color: C.text,
              marginBottom: 16,
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.22s forwards slideUp",
            }}>
              Conditions d'utilisation
            </h1>

            <div className="white-line" style={{
              width: 44, marginBottom: 20,
              opacity: 0, animation: "0.5s ease 0.38s forwards slideUp",
            }} />

            <p style={{
              fontSize: 16, color: C.muted, lineHeight: 1.8,
              maxWidth: 520, fontWeight: 300,
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.44s forwards slideUp",
            }}>
              Ces conditions régissent votre accès et votre utilisation de ZaynSpace. Merci de les lire attentivement avant d'utiliser l'Application.
            </p>
          </div>
        </section>

        {/* ── CONTENT */}
        <section style={{ padding: "64px 24px 100px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "220px 1fr", gap: 48, alignItems: "start" }} className="content-grid">

            {/* TOC sidebar */}
            <div className="desktop-only" style={{ position: "sticky", top: 88 }}>
              <FadeIn>
                <div style={{
                  background: C.bg2, border: `1px solid ${C.border}`,
                  borderRadius: 4, padding: "24px 20px",
                }}>
                  <div className="eyebrow" style={{ fontSize: 9, marginBottom: 20, display: "block" }}>Table des matières</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sections.map(s => (
                      <a key={s.id} href={`#${s.id}`} className="toc-link">{s.title}</a>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {sections.map((section, i) => {
                const Icon = section.icon;
                return (
                  <FadeIn key={section.id} delay={i * 40}>
                    <div id={section.id} className="section-card" style={{ scrollMarginTop: 88 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                        <div style={{
                          width: 36, height: 36,
                          background: "rgba(255,255,255,0.05)",
                          border: `1px solid ${C.border2}`,
                          borderRadius: 2,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={16} color={C.white} />
                        </div>
                        <h2 style={{
                          fontSize: 16, fontWeight: 600,
                          color: C.text, letterSpacing: "-0.01em",
                        }}>{section.title}</h2>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 50 }}>
                        {section.content.map((para, j) => (
                          <p key={j} style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, fontWeight: 300 }}>{para}</p>
                        ))}
                      </div>
                    </div>
                  </FadeIn>
                );
              })}

              {/* Contact CTA */}
              <FadeIn delay={sections.length * 40}>
                <div style={{
                  background: C.bg3, border: `1px solid ${C.border2}`,
                  borderRadius: 4, padding: "32px 40px",
                  display: "flex", flexWrap: "wrap",
                  alignItems: "center", justifyContent: "space-between", gap: 20,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    width: 160, height: 160,
                    background: "radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 70%)",
                    pointerEvents: "none",
                  }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Des questions sur ces conditions ?</div>
                    <div style={{ fontSize: 13, color: C.muted, fontWeight: 300 }}>Notre équipe juridique est disponible pour vous répondre.</div>
                  </div>
                  <a href="mailto:legal@zaynspace.com" className="btn-p">
                    Nous contacter
                  </a>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── FOOTER */}
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "36px 48px", background: C.bg2 }} className="hp">
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{ width: 26, height: 26, background: C.white, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                <Image src="/logo_blanc.png" alt="ZaynSpace" width={15} height={15} style={{ filter: "invert(1)" }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>zaynspace</span>
            </Link>
            <div style={{ display: "flex", gap: 28 }}>
              {[{ l: "Confidentialité", h: "/privacy" }, { l: "CGU", h: "/terms" }, { l: "Twitter", h: "#" }, { l: "GitHub", h: "#" }].map(({ l, h }) => (
                <a key={l} href={h} className="nav-link">{l}</a>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.white, animation: "blink 1.5s step-end infinite", boxShadow: "0 0 5px rgba(255,255,255,0.4)" }} />
              <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.06em", fontFamily: "'Outfit',sans-serif" }}>© {new Date().getFullYear()} ZAYNSPACE</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}