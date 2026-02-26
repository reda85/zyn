"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowLeft, Shield, Database, MapPin,
  Camera, Share2, Lock, UserCheck, Clock, Bell, Mail
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
    icon: Shield,
    id: "introduction",
    title: "1. Introduction",
    content: [
      "ZaynSpace (« nous », « notre ») s'engage à protéger la vie privée de ses utilisateurs professionnels. La présente Politique de Confidentialité décrit comment nous collectons, utilisons, stockons et protégeons vos données personnelles lorsque vous utilisez l'application mobile ZaynSpace (l'« Application »).",
      "En utilisant ZaynSpace, vous acceptez les pratiques décrites dans cette politique. Date d'entrée en vigueur : 22 février 2026.",
    ],
  },
  {
    icon: Database,
    id: "donnees",
    title: "2. Données collectées",
    content: [
      "Données de compte : adresse e-mail, mot de passe chiffré, nom et informations de profil professionnel fournies lors de l'inscription.",
      "Données de contenu : tâches et descriptions saisies sur le plan, photos et images associées aux tâches, données de géolocalisation (coordonnées GPS) lorsque vous ajoutez une localisation à une tâche, historique de suivi et mises à jour de statut.",
      "Données techniques : identifiant de l'appareil, système d'exploitation, version de l'application, journaux d'erreurs et données de performance.",
      "Données d'utilisation : interactions avec les fonctionnalités de l'application, fréquence d'utilisation et préférences de navigation.",
    ],
  },
  {
    icon: Database,
    id: "stockage",
    title: "3. Stockage des données",
    content: [
      "Vos données sont stockées à la fois localement sur votre appareil et sur nos serveurs cloud sécurisés. Le stockage local permet une utilisation hors ligne. Le stockage cloud assure la synchronisation entre vos appareils et la sauvegarde de vos données.",
      "Nous utilisons des services cloud conformes aux normes de sécurité en vigueur (chiffrement en transit via TLS et au repos). Les données sont hébergées dans l'Union Européenne ou offrant des garanties équivalentes.",
      "La suppression d'un projet ou d'une tâche entraîne sa suppression des serveurs dans un délai maximum de 30 jours.",
    ],
  },
  {
    icon: MapPin,
    id: "geolocalisation",
    title: "4. Géolocalisation",
    content: [
      "L'Application demande l'accès à votre localisation uniquement lorsque vous choisissez d'associer une coordonnée GPS à une tâche ou un élément sur le plan. Cet accès est optionnel et peut être refusé ou révoqué à tout moment dans les paramètres de votre appareil.",
      "Les données de localisation sont stockées avec le contenu de la tâche concernée et ne sont pas utilisées à d'autres fins.",
    ],
  },
  {
    icon: Camera,
    id: "photos",
    title: "5. Accès aux photos",
    content: [
      "L'Application demande l'accès à votre photothèque ou à l'appareil photo uniquement lorsque vous souhaitez joindre une photo à une tâche. Les photos sont stockées localement et synchronisées sur le cloud.",
      "Vous pouvez révoquer cet accès à tout moment dans les paramètres de votre appareil.",
    ],
  },
  {
    icon: Share2,
    id: "partage",
    title: "6. Partage des données",
    content: [
      "ZaynSpace ne vend, ne loue ni ne partage vos données personnelles avec des tiers, sauf dans les cas suivants : prestataires techniques liés par des accords de confidentialité stricts ; obligations légales sur demande d'une autorité compétente ; protection de nos droits en cas de fraude.",
      "Tout membre de votre organisation auquel vous accordez un accès à un projet pourra voir les tâches, photos et localisations associées à ce projet.",
    ],
  },
  {
    icon: Lock,
    id: "securite",
    title: "7. Sécurité",
    content: [
      "Nous mettons en œuvre des mesures de sécurité adaptées : chiffrement des mots de passe, chiffrement des communications (HTTPS/TLS), authentification par e-mail et mot de passe, et surveillance des accès non autorisés.",
      "En cas de violation de données susceptible d'affecter vos droits, nous vous en informerons dans les délais prévus par la réglementation applicable.",
    ],
  },
  {
    icon: UserCheck,
    id: "droits",
    title: "8. Vos droits",
    content: [
      "Conformément au RGPD pour les utilisateurs en Europe, vous disposez des droits suivants : accès à vos données personnelles ; rectification des informations inexactes ; suppression de vos données (droit à l'oubli) ; portabilité de vos données ; opposition au traitement de vos données.",
      "Pour exercer ces droits, contactez-nous à : privacy@zaynspace.com.",
    ],
  },
  {
    icon: Clock,
    id: "conservation",
    title: "9. Conservation des données",
    content: [
      "Vos données sont conservées pendant toute la durée d'activité de votre compte. En cas de suppression, vos données personnelles sont effacées de nos serveurs dans un délai de 90 jours, sauf obligation légale de conservation plus longue.",
    ],
  },
  {
    icon: Bell,
    id: "modifications",
    title: "10. Modifications",
    content: [
      "Nous pouvons mettre à jour cette politique. En cas de modification substantielle, vous serez notifié par e-mail ou via l'Application. La date de dernière mise à jour est indiquée en haut du document.",
    ],
  },
  {
    icon: Mail,
    id: "contact",
    title: "11. Contact",
    content: ["Pour toute question relative à cette politique : privacy@zaynspace.com"],
  },
];

export default function PrivacyPage() {
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
                <Shield size={11} color={C.white} />
                <span className="eyebrow" style={{ fontSize: 9 }}>Politique de confidentialité · Mise à jour le 22 fév. 2026</span>
              </div>
            </div>

            <h1 style={{
              fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700,
              letterSpacing: "-0.03em", lineHeight: 1.05, color: C.text,
              marginBottom: 16,
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.22s forwards slideUp",
            }}>
              Confidentialité
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
              Chez ZaynSpace, la protection de vos données professionnelles est une priorité absolue. Voici comment nous les traitons.
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
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Des questions sur vos données ?</div>
                    <div style={{ fontSize: 13, color: C.muted, fontWeight: 300 }}>Notre équipe est disponible pour vous répondre.</div>
                  </div>
                  <a href="mailto:privacy@zaynspace.com" className="btn-p">
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

        <style>{`
          @media (max-width: 768px) {
            .content-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </>
  );
}