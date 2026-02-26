"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu, X, ArrowUpRight, MapPin, Camera,
  CheckCircle2, TrendingUp, ShieldCheck, FileText,
  Users, BarChart3, ChevronDown, Zap, Wifi
} from "lucide-react";

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      ...style,
    }}>{children}</div>
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
        const e = 1 - Math.pow(1 - p, 3);
        setCount(Math.floor(e * end));
        if (p < 1) requestAnimationFrame(run); else setCount(end);
      };
      requestAnimationFrame(run);
    }
  }, [inView, end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Animated blueprint hero ─── */
function BlueprintHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Floor plan geometry (normalized 0-1, will scale to canvas)
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // Rooms defined as [x, y, w, h] fractions
    const rooms = [
      { x: 0.05, y: 0.08, w: 0.38, h: 0.42, label: "Zone A" },
      { x: 0.45, y: 0.08, w: 0.22, h: 0.42, label: "Couloir" },
      { x: 0.69, y: 0.08, w: 0.26, h: 0.42, label: "Zone B" },
      { x: 0.05, y: 0.52, w: 0.55, h: 0.40, label: "Salle principale" },
      { x: 0.62, y: 0.52, w: 0.33, h: 0.40, label: "Local technique" },
    ];

    // Task pins
    const pins = [
      { rx: 0.20, ry: 0.25, color: "#ffffff", label: "Inspection élec.", status: "EN COURS", user: "S.M.", progress: 0 },
      { rx: 0.78, ry: 0.26, color: "#22c55e", label: "Charpente validée", status: "TERMINÉ",  user: "M.D.", progress: 0 },
      { rx: 0.30, ry: 0.68, color: "#ff4444", label: "Retard livraison",  status: "BLOQUÉ",   user: "K.B.", progress: 0 },
      { rx: 0.75, ry: 0.70, color: "#f59e0b", label: "Cloisons R+1",     status: "EN ATTENTE",user: "L.R.", progress: 0 },
      { rx: 0.54, ry: 0.30, color: "#22c55e", label: "Plomberie OK",      status: "TERMINÉ",  user: "P.V.", progress: 0 },
    ];

    // Connections between pins
    const connections = [
      [0, 1], [0, 4], [2, 3], [1, 3],
    ];

    let t = 0;

    const draw = () => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      t += 0.008;
      timeRef.current = t;

      // ── Background grid ──
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // ── Rooms ──
      rooms.forEach(room => {
        const rx = room.x * w, ry = room.y * h;
        const rw = room.w * w, rh = room.h * h;

        // Fill
        ctx.fillStyle = "rgba(255,255,255,0.025)";
        ctx.fillRect(rx, ry, rw, rh);

        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, rw, rh);

        // Corner accents
        const ca = 12;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]].forEach(([cx, cy], ci) => {
          ctx.beginPath();
          const dx = ci % 2 === 0 ? 1 : -1;
          const dy = ci < 2 ? 1 : -1;
          ctx.moveTo(cx + dx * ca, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + dy * ca);
          ctx.stroke();
        });

        // Room label
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = `500 10px 'Outfit', sans-serif`;
        ctx.letterSpacing = "0.1em";
        ctx.fillText(room.label.toUpperCase(), rx + 10, ry + 18);
      });

      // ── Dimension lines ──
      const dimAlpha = 0.15;
      ctx.strokeStyle = `rgba(255,255,255,${dimAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      // Horizontal dim
      ctx.beginPath(); ctx.moveTo(w * 0.05, h * 0.03); ctx.lineTo(w * 0.95, h * 0.03); ctx.stroke();
      // Vertical dim  
      ctx.beginPath(); ctx.moveTo(w * 0.02, h * 0.08); ctx.lineTo(w * 0.02, h * 0.92); ctx.stroke();
      ctx.setLineDash([]);

      // Dim arrows & text
      ctx.fillStyle = `rgba(255,255,255,${dimAlpha + 0.1})`;
      ctx.font = `400 9px 'Outfit', sans-serif`;
      ctx.fillText("48.50 m", w * 0.44, h * 0.025);
      ctx.save();
      ctx.translate(w * 0.018, h * 0.5);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("24.20 m", -20, 0);
      ctx.restore();

      // ── Connection lines (animated dash) ──
      connections.forEach(([ai, bi], ci) => {
        const a = pins[ai], b = pins[bi];
        const ax = a.rx * w, ay = a.ry * h;
        const bx = b.rx * w, by = b.ry * h;
        const dash = 6, gap = 10;
        const offset = (t * 20) % (dash + gap);

        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([dash, gap]);
        ctx.lineDashOffset = -offset;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        // Curved line
        const mx = (ax + bx) / 2, my = (ay + by) / 2 - 20;
        ctx.quadraticCurveTo(mx, my, bx, by);
        ctx.stroke();
        ctx.restore();
      });

      // ── Pins ──
      pins.forEach((pin, i) => {
        const px = pin.rx * w, py = pin.ry * h;
        const phase = t + i * 1.2;

        // Radar pulse rings
        for (let r = 0; r < 3; r++) {
          const ringPhase = (phase + r * 0.7) % 2.1;
          const radius = ringPhase * 36;
          const alpha = Math.max(0, 1 - ringPhase / 2.1) * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.strokeStyle = pin.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = pin.color + "22";
        ctx.fill();
        ctx.strokeStyle = pin.color + "cc";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = pin.color;
        ctx.fill();

        // Center gleam
        ctx.beginPath();
        ctx.arc(px - 1.5, py - 1.5, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();

        // Floating task card (appears at intervals)
        const cardPhase = (t * 0.4 + i * 0.7) % 5;
        if (cardPhase > 1.5 && cardPhase < 4.5) {
          const cardAlpha = Math.min(1, Math.min(cardPhase - 1.5, 4.5 - cardPhase) * 1.5);
          const cardY = py - 60 - Math.sin(cardPhase * 0.8) * 8;
          const cardX = px - 80;
          const cw = 162, ch = 54;

          // Card bg
          ctx.save();
          ctx.globalAlpha = cardAlpha;
          ctx.fillStyle = "#0a1628";
          roundRect(ctx, cardX, cardY, cw, ch, 4);
          ctx.fill();

          ctx.strokeStyle = pin.color + "66";
          ctx.lineWidth = 1;
          roundRect(ctx, cardX, cardY, cw, ch, 4);
          ctx.stroke();

          // Status dot
          ctx.beginPath();
          ctx.arc(cardX + 10, cardY + 12, 3, 0, Math.PI * 2);
          ctx.fillStyle = pin.color;
          ctx.fill();

          // Status text
          ctx.fillStyle = pin.color;
          ctx.font = `600 8px 'Outfit', sans-serif`;
          ctx.letterSpacing = "0.08em";
          ctx.fillText(pin.status, cardX + 18, cardY + 14);

          // Label
          ctx.fillStyle = "rgba(224,242,254,0.85)";
          ctx.font = `500 10px 'Outfit', sans-serif`;
          ctx.letterSpacing = "0";
          ctx.fillText(pin.label, cardX + 8, cardY + 30);

          // User badge
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          roundRect(ctx, cardX + 8, cardY + 36, 30, 12, 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = `500 7px 'Outfit', sans-serif`;
          ctx.fillText(pin.user, cardX + 12, cardY + 45);

          // Connector line to pin
          ctx.strokeStyle = pin.color + "44";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(px, py - 10);
          ctx.lineTo(px, cardY + ch);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.restore();
        }
      });

      // ── Scanning line ──
      const scanY = ((t * 0.3) % 1) * h;
      const scanGrad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60);
      scanGrad.addColorStop(0, "rgba(255,255,255,0)");
      scanGrad.addColorStop(0.5, "rgba(255,255,255,0.06)");
      scanGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 60, w, 120);

      // ── HUD overlays ──
      // Top-left: coordinates
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `400 9px 'Outfit', sans-serif`;
      ctx.letterSpacing = "0.05em";
      const mx = ((Math.sin(t * 0.3) + 1) / 2 * 100).toFixed(1);
      const my = ((Math.cos(t * 0.25) + 1) / 2 * 100).toFixed(1);
      ctx.fillText(`X: ${mx}m  Y: ${my}m`, 12, h - 20);

      // Top-right: task count
      ctx.textAlign = "right";
      ctx.fillText(`${pins.length} TÂCHES ACTIVES`, w - 12, h - 20);
      ctx.textAlign = "left";

      // Bounding box corners (full plan)
      const margin = { x: w * 0.04, y: h * 0.04 };
      const padW = w - margin.x * 2, padH = h - margin.y * 2;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      const bcLen = 20;
      [
        [margin.x, margin.y],
        [margin.x + padW, margin.y],
        [margin.x, margin.y + padH],
        [margin.x + padW, margin.y + padH],
      ].forEach(([bx, by], bi) => {
        ctx.beginPath();
        const bdx = bi % 2 === 0 ? 1 : -1;
        const bdy = bi < 2 ? 1 : -1;
        ctx.moveTo(bx + bdx * bcLen, by);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx, by + bdy * bcLen);
        ctx.stroke();
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ─── Main page ─── */
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

  const C = {
    bg:     "#060810",
    bg2:    "#0a0d16",
    bg3:    "#0e1220",
    cyan:   "#ffffff",
    cyanDim:"rgba(255,255,255,0.6)",
    cyanFaint:"rgba(255,255,255,0.08)",
    text:   "#e0f2fe",
    muted:  "rgba(224,242,254,0.42)",
    border: "rgba(255,255,255,0.1)",
    border2:"rgba(255,255,255,0.18)",
  };

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

        /* Eyebrow */
        .eyebrow {
          font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 400;
          letter-spacing: 0.2em; text-transform: uppercase; color: #ffffff;
        }

        /* Cyan glow line */
        .cyan-line { height: 1px; background: linear-gradient(90deg, transparent, #ffffff 30%, #ffffff 70%, transparent); }

        /* Tech grid background */
        .tech-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Buttons */
        .btn-p {
          display: inline-flex; align-items: center; gap: 8px;
          background: #ffffff; color: #060810;
          font-family: 'Outfit', sans-serif; font-weight: 500;
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          padding: 13px 28px; border: none; border-radius: 2px;
          cursor: pointer; transition: all 0.2s ease; text-decoration: none;
          position: relative; overflow: hidden;
        }
        .btn-p::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0; transition: opacity 0.2s;
        }
        .btn-p:hover { box-shadow: 0 0 24px rgba(255,255,255,0.45), 0 0 48px rgba(255,255,255,0.15); transform: translateY(-1px); }
        .btn-p:hover::after { opacity: 1; }
        .btn-p:active { transform: translateY(0); }

        .btn-g {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: #e0f2fe;
          font-family: 'Outfit', sans-serif; font-weight: 400;
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          padding: 12px 28px; border: 1px solid rgba(255,255,255,0.25); border-radius: 2px;
          cursor: pointer; transition: all 0.2s ease;
        }
        .btn-g:hover { border-color: rgba(255,255,255,0.6); box-shadow: 0 0 12px rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }

        /* Feature tab */
        .feat-tab {
          padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: pointer; transition: all 0.2s ease; position: relative;
          padding-left: 0;
        }
        .feat-tab::before {
          content: ''; position: absolute; left: -20px; top: 50%;
          transform: translateY(-50%); width: 2px; height: 0;
          background: #ffffff; transition: height 0.3s ease;
          box-shadow: 0 0 8px #ffffff;
        }
        .feat-tab.active::before { height: 60%; }
        .feat-tab:hover { padding-left: 4px; }

        /* Stat card */
        .stat-card {
          padding: 36px; border: 1px solid rgba(255,255,255,0.1);
          background: #0a0d16; position: relative; overflow: hidden;
          transition: all 0.3s ease;
        }
        .stat-card::after {
          content: ''; position: absolute; bottom: 0; left: 0;
          height: 1px; width: 24%; background: #ffffff;
          box-shadow: 0 0 8px #ffffff;
          transition: width 0.6s ease;
        }
        .stat-card:hover::after { width: 100%; }
        .stat-card:hover { border-color: rgba(255,255,255,0.25); }

        /* Nav link */
        .nav-link {
          position: relative; text-decoration: none;
          font-family: 'Outfit', sans-serif; font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(224,242,254,0.45);
          transition: color 0.2s;
        }
        .nav-link:hover { color: #e0f2fe; }
        .nav-link::after {
          content: ''; position: absolute; bottom: -3px; left: 0;
          width: 0; height: 1px; background: #ffffff;
          box-shadow: 0 0 4px #ffffff;
          transition: width 0.3s ease;
        }
        .nav-link:hover::after { width: 100%; }

        /* Ornament divider */
        .ornament { display: flex; align-items: center; gap: 20px; }
        .ornament::before, .ornament::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.12); }

        /* Glow text */
        .glow-white {
          color: #ffffff;
          text-shadow: 0 0 20px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.2);
        }

        /* Animations */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOnly { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes scan {
          from { transform: translateY(-100%); }
          to   { transform: translateY(100vh); }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #060810; }
        ::-webkit-scrollbar-thumb { background: #ffffff; border-radius: 2px; }

        /* Responsive */
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
          .hp { padding: 0 20px !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg }}>

        {/* ══════════ HEADER */}
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
              width: 30, height: 30, background: C.cyan, borderRadius: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 12px rgba(255,255,255,0.5)",
            }}>
              <Image src="/logo_blanc.png" alt="ZaynSpace" width={18} height={18} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: C.text, letterSpacing: "-0.01em" }}>zaynspace</span>
          </Link>

          <nav className="desktop-only" style={{ display: "flex", gap: 36, marginLeft: 56, flex: 1 }}>
            {["Fonctionnalités","Témoignages","Tarifs"].map(l => (
              <a key={l} href="#" className="nav-link">{l}</a>
            ))}
          </nav>

          <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 24, marginLeft: "auto" }}>
            {/* Live indicator */}
           
            <Link href={loginUrl} className="nav-link" style={{ color: "rgba(224,242,254,0.45)" }}>Connexion</Link>
            <a href="#" className="btn-p" style={{ padding: "9px 20px" }}>Essai gratuit</a>
          </div>

          <button onClick={() => setMenuOpen(true)} className="mobile-only"
            style={{ marginLeft: "auto", background: "none", border: "none", color: C.text, cursor: "pointer" }}>
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
            <div className="cyan-line" />
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
              {["Fonctionnalités","Témoignages","Tarifs"].map(l => (
                <a key={l} href="#" style={{ fontSize: 32, fontWeight: 500, color: C.text, textDecoration: "none", letterSpacing: "-0.01em" }}>{l}</a>
              ))}
            </nav>
            <a href="#" className="btn-p" style={{ justifyContent: "center" }}>Commencer</a>
          </div>
        )}

        {/* ══════════ HERO */}
        <section style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          paddingTop: 68,
          position: "relative",
          overflow: "hidden",
          gap: 0,
        }}>
          {/* Tech grid bg */}
          <div className="tech-grid" style={{ position: "absolute", inset: 0 }} />

          {/* Ambient glow */}
          <div style={{
            position: "absolute", top: "40%", right: "35%",
            width: 600, height: 600,
            background: "radial-gradient(ellipse, rgba(255,255,255,0.05) 0%, transparent 65%)",
            transform: "translate(50%,-50%)", pointerEvents: "none",
          }} />

          {/* Left: text content */}
          <div style={{ padding: "80px 48px 80px 48px", position: "relative", zIndex: 2 }} className="hp">

            {/* Status badge */}
			{/* 
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border2}`,
              borderRadius: 2, padding: "6px 14px", marginBottom: 32,
              opacity: 0, animation: "0.7s ease 0.1s forwards slideUp",
            }}>
             <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 5px rgba(255,255,255,0.4)`, animation: "blink 1.5s step-end infinite" }} />
              <span className="eyebrow" style={{ fontSize: 9 }}>Nouveau · Documentation par IA</span>
           
			  </div>
*/}
            <h1 style={{
              fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 700,
              lineHeight: 1.05, letterSpacing: "-0.03em",
              color: C.text, marginBottom: 6,
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.2s forwards slideUp",
            }}>
              Le chantier,
            </h1>
            <h1 className="glow-white" style={{
              fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 700,
              lineHeight: 1.05, letterSpacing: "-0.03em",
              marginBottom: 28,
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.32s forwards slideUp",
            }}>
              sous contrôle.
            </h1>

            <div className="cyan-line" style={{
              width: 48, marginBottom: 28,
              opacity: 0, animation: "0.5s ease 0.44s forwards fadeOnly",
            }} />

            <p style={{
              fontSize: 16, color: C.muted,
              lineHeight: 1.8, marginBottom: 40, fontWeight: 300, maxWidth: 420,
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.5s forwards slideUp",
            }}>
              Relevez les tâches sur plan, associez photos et localisations, suivez l'avancement en temps réel. La plateforme de gestion de chantier la plus précise du marché.
            </p>

            <div style={{
              display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40,
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.62s forwards slideUp",
            }}>
              <a href="#" className="btn-p">Commencer gratuitement <ArrowUpRight size={13} /></a>
              <a href="#" className="btn-g">Voir la démo</a>
            </div>

            {/* Trust indicators */}
            <div style={{
              display: "flex", gap: 24, flexWrap: "wrap",
              opacity: 0, animation: "0.9s cubic-bezier(0.16,1,0.3,1) 0.74s forwards slideUp",
            }}>
              {["Pas de carte bancaire","14 jours offerts","Annulation libre"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.06em" }}>
                  <CheckCircle2 size={11} color={C.cyan} /> {t}
                </span>
              ))}
            </div>

            {/* Mini stats */}
            <div style={{
              display: "flex", gap: 32, marginTop: 48, paddingTop: 32,
              borderTop: `1px solid ${C.border}`,
              opacity: 0, animation: "0.9s ease 0.9s forwards slideUp",
            }}>
              {[["2.4k+","projets actifs"],["98%","satisfaction"],["3×","plus rapide"]].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.08em" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: animated blueprint */}
          <div style={{
            position: "relative", height: "100vh",
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)",
            borderLeft: `1px solid ${C.border}`,
            opacity: 0, animation: "1s ease 0.4s forwards fadeOnly",
          }} className="desktop-only">
            {/* Corner decoration */}
            <div style={{
              position: "absolute", top: 20, right: 20,
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px",
              background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
              borderRadius: 2,
            }}>
              <Wifi size={10} color={C.cyan} />
              <span className="eyebrow" style={{ fontSize: 8 }}>PLAN EN DIRECT</span>
            </div>

            <BlueprintHero />

            {/* Bottom HUD */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "12px 20px",
              borderTop: `1px solid ${C.border}`,
              background: "rgba(6,8,16,0.7)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <span className="eyebrow" style={{ fontSize: 8 }}>ZAYNSPACE · BÂTIMENT A · R+1</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                {[["5","tâches"],["3","en cours"],["2","terminées"]].map(([n, l]) => (
                  <span key={l} style={{ fontSize: 9, color: C.muted, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.06em" }}>
                    <span style={{ color: C.cyan, fontWeight: 600 }}>{n} </span>{l}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: simple grid indicator */}
          <div className="mobile-only" style={{
            flexDirection: "column", alignItems: "center",
            padding: "0 24px 60px",
          }}>
            <div style={{
              width: "100%", aspectRatio: "4/3",
              border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden",
              position: "relative",
            }}>
              <BlueprintHero />
            </div>
          </div>
        </section>

        {/* ══════════ STATS */}
        <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
            {[
              { n: 2400, s: "+", label: "Projets actifs",     sub: "sur la plateforme" },
              { n: 98,   s: "%", label: "Satisfaction client", sub: "équipes B2B" },
              { n: 3,    s: "×", label: "Plus rapide",         sub: "qu'une gestion papier" },
            ].map(({ n, s, label, sub }, i) => (
              <FadeIn key={label} delay={i * 80}>
                <div className="stat-card" style={{
                  borderRadius: 0, borderTop: "none", borderBottom: "none",
                  borderLeft: i > 0 ? `1px solid ${C.border}` : "none", borderRight: "none",
                }}>
                  <div style={{ fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 700, color: C.text, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
                    <Counter end={n} suffix={s} />
                  </div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.06em" }}>{sub}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ══════════ FEATURES */}
        <section style={{ padding: "100px 24px", background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>

            <div className="desktop-only" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
              <FadeIn>
                <span className="eyebrow" style={{ display: "block", marginBottom: 20 }}>Fonctionnalités</span>
                <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 52 }}>
                  Conçu pour les équipes<br />
                  <span className="glow-white">qui construisent.</span>
                </h2>
                <div style={{ paddingLeft: 20 }}>
                  {features.map((f, i) => (
                    <div key={f.title} className={`feat-tab ${activeFeature === i ? "active" : ""}`} onClick={() => setActiveFeature(i)}>
                      <div style={{
                        fontSize: 13, fontWeight: activeFeature === i ? 500 : 400,
                        color: activeFeature === i ? C.text : C.muted,
                        transition: "color 0.2s",
                      }}>{f.title}</div>
                    </div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn delay={100}>
                <div style={{
                  background: C.bg3, border: `1px solid ${C.border2}`,
                  borderRadius: 4, padding: "40px",
                  position: "sticky", top: 88, minHeight: 260,
                }}>
                  {(() => { const Icon = features[activeFeature].icon; return (
                    <div style={{
                      width: 44, height: 44, background: C.cyanFaint, border: `1px solid ${C.border2}`,
                      borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
                    }}>
                      <Icon size={20} color={C.cyan} />
                    </div>
                  ); })()}
                  <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 14, color: C.text }}>
                    {features[activeFeature].title}
                  </h3>
                  <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, fontWeight: 300 }}>
                    {features[activeFeature].desc}
                  </p>
                  <a href="#" className="eyebrow" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginTop: 28, textDecoration: "none",
                  }}>
                    En savoir plus <ArrowUpRight size={10} />
                  </a>
                </div>
              </FadeIn>
            </div>

            {/* Mobile cards */}
            <div className="mobile-only" style={{ flexDirection: "column", gap: 14 }}>
              <span className="eyebrow" style={{ display: "block", marginBottom: 14 }}>Fonctionnalités</span>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 32 }}>
                Conçu pour les équipes <span className="glow-white">qui construisent.</span>
              </h2>
              {features.map(f => { const Icon = f.icon; return (
                <div key={f.title} style={{ padding: 22, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 2 }}>
                  <Icon size={18} color={C.cyan} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{f.title}</div>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.75, fontWeight: 300 }}>{f.desc}</p>
                </div>
              ); })}
            </div>
          </div>
        </section>

        {/* ══════════ HOW IT WORKS */}
        <section style={{ padding: "100px 24px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <FadeIn>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <span className="eyebrow" style={{ display: "block", marginBottom: 16 }}>Mise en place</span>
                <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 700, letterSpacing: "-0.025em" }}>
                  Opérationnel en <span className="glow-white">5 minutes.</span>
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
                <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 24, marginBottom: 44, alignItems: "start" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: `1px solid ${C.border2}`,
                    background: C.cyanFaint,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontFamily: "'Outfit',sans-serif", color: C.cyan, fontWeight: 500,
                  }}>{n}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: C.text }}>{title}</div>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, fontWeight: 300 }}>{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ══════════ TESTIMONIAL */}
        <section style={{ padding: "100px 24px", background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <FadeIn>
              <div style={{ background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 4, padding: "52px 48px", position: "relative", overflow: "hidden" }}>
                {/* Glow corner */}
                <div style={{
                  position: "absolute", top: 0, left: 0, width: 200, height: 200,
                  background: "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 70%)",
                  pointerEvents: "none",
                }} />
                <div style={{ display: "flex", gap: 3, marginBottom: 24 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: C.cyan, fontSize: 14 }}>★</span>)}
                </div>
                <blockquote style={{
                  fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 400, lineHeight: 1.6,
                  letterSpacing: "-0.01em", color: C.text, marginBottom: 36, maxWidth: 620,
                }}>
                  "ZaynSpace a transformé notre façon de gérer les chantiers. La documentation nous prend trois fois moins de temps, et nos équipes sont enfin parfaitement alignées."
                </blockquote>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.cyan}, rgba(255,255,255,0.5))`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: C.bg, fontFamily: "'Outfit',sans-serif",
                  }}>CS</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Chris Surrey</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.06em" }}>Architecte Senior · IKON Architects</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ══════════ CTA */}
        <section style={{ padding: "120px 24px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <FadeIn>
              <div className="ornament" style={{ marginBottom: 48 }}>
                <span className="eyebrow">Commencez dès aujourd'hui</span>
              </div>

              <h2 style={{
                fontSize: "clamp(32px, 6vw, 72px)", fontWeight: 700,
                letterSpacing: "-0.035em", lineHeight: 1.0, marginBottom: 24,
              }}>
                Prêt à optimiser<br />
                <span className="glow-white">vos chantiers ?</span>
              </h2>

              <div className="cyan-line" style={{ width: 48, margin: "0 auto 28px" }} />

              <p style={{ fontSize: 15, color: C.muted, marginBottom: 44, fontWeight: 300, lineHeight: 1.8, maxWidth: 400, margin: "0 auto 44px" }}>
                Rejoignez des milliers de professionnels de la construction qui font confiance à ZaynSpace.
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
                <a href="#" className="btn-p" style={{ padding: "15px 40px", fontSize: 12 }}>
                  Commencer maintenant <ArrowUpRight size={14} />
                </a>
                <a href="#" className="btn-g" style={{ padding: "14px 40px", fontSize: 12 }}>Voir la démo</a>
              </div>

              <p style={{ fontSize: 10, color: C.muted, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.08em" }}>
                Pas de carte bancaire · 14 jours offerts · Annulation à tout moment
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ══════════ FOOTER */}
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px 48px", background: C.bg2 }} className="hp">
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{ width: 26, height: 26, background: C.cyan, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 8px rgba(255,255,255,0.4)` }}>
                <Image src="/logo_blanc.png" alt="ZaynSpace" width={15} height={15} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>zaynspace</span>
            </Link>

            <div style={{ display: "flex", gap: 28 }}>
              {[{ l:"Confidentialité",h:"/privacy"},{ l:"CGU",h:"/terms"},{ l:"Twitter",h:"#"},{ l:"GitHub",h:"#"}].map(({ l, h }) => (
                <a key={l} href={h} className="nav-link">{l}</a>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.cyan, animation: "blink 1.5s step-end infinite", boxShadow: `0 0 5px rgba(255,255,255,0.4)` }} />
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.06em" }}>© {new Date().getFullYear()} ZAYNSPACE</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}