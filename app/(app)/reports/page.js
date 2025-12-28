"use client";

import React, { useState } from "react";
import { 
  Image as ImageIcon, Layout, Settings, FileText, Eye, 
  Users, AlignLeft, Plus, Trash2, MessageSquare, Grid, Upload 
} from "lucide-react";

export default function TemplateBuilder() {
  const [config, setConfig] = useState({
    primaryColor: "#2563eb",
    reportTitle: "RAPPORT DE CHANTIER",
    // Page 1
    showCompanyLogo: true,
    showClientLogo: true,
    showProjectPhoto: true,
    projectPhotoSize: "medium",
    projectImageSrc: null, // Pour stocker l'image uploadée
    showSummary: true,
    summaryText: "Le projet progresse conformément au planning initial. Les fondations sont terminées.",
    showParticipants: true,
    participants: [
      { name: "Jean Dupont", role: "Architecte" },
      { name: "Marie Curie", role: "Chef de Projet" }
    ],
    // Page 2
    showRemarks: true,
    remarks: "1. Vérifier l'étanchéité du sous-sol.\n2. Livraison des briques prévue mardi prochain.",
    showPhotoGrid: true,
    gridCount: 4,
    gridImages: {}, // Stocke les images de la galerie par index
    // Infos générales
    projectInfo: {
      name: "Rénovation Résidence Horizon",
      location: "Nice, France",
      date: "26 Décembre 2025",
      clientName: "SCI Valrose",
    },
  });

  const photoSizeMap = {
    small: "w-40 h-40",
    medium: "w-2/3 h-64",
    full: "w-full h-80",
  };

  // --- Handlers pour les Images ---
  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setConfig({ ...config, projectImageSrc: URL.createObjectURL(file) });
    }
  };

  const handleGridImageUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      setConfig({
        ...config,
        gridImages: { ...config.gridImages, [index]: URL.createObjectURL(file) }
      });
    }
  };

  // --- Handlers Participants ---
  const addParticipant = () => {
    setConfig({ ...config, participants: [...config.participants, { name: "", role: "" }] });
  };

  const updateParticipant = (index, field, value) => {
    const newParts = [...config.participants];
    newParts[index][field] = value;
    setConfig({ ...config, participants: newParts });
  };

  return (
    <div className="flex h-screen bg-slate-200 text-slate-900 font-sans">
      
      {/* --- PANNEAU DE CONTRÔLE (GAUCHE) --- */}
      <aside className="w-96 bg-white border-r border-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b bg-slate-900 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2 italic">
            <Settings className="w-5 h-5 text-blue-400" /> REPORT GEN
          </h1>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Design & En-tête */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuration Globale</h3>
            <input 
              type="text" 
              value={config.reportTitle} 
              onChange={(e) => setConfig({...config, reportTitle: e.target.value})}
              className="w-full p-2 border rounded font-bold text-sm"
            />
            <div className="flex items-center gap-4">
               <input type="color" value={config.primaryColor} onChange={(e) => setConfig({...config, primaryColor: e.target.value})} className="w-12 h-8 cursor-pointer" />
               <span className="text-xs text-slate-500 font-medium tracking-tight">Couleur du thème</span>
            </div>
          </section>

          {/* Page 1 : Photo & Taille */}
          <section className="pt-4 border-t">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Photo de Couverture</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.showProjectPhoto} onChange={(e) => setConfig({...config, showProjectPhoto: e.target.checked})} /> Afficher la photo</label>
              
              {config.showProjectPhoto && (
                <>
                  <input type="file" accept="image/*" onChange={handleMainImageUpload} className="text-xs w-full border p-1 rounded bg-slate-50" />
                  <div className="flex bg-slate-100 p-1 rounded">
                    {["small", "medium", "full"].map((s) => (
                      <button key={s} onClick={() => setConfig({...config, projectPhotoSize: s})} className={`flex-1 py-1 text-[10px] uppercase font-bold rounded ${config.projectPhotoSize === s ? "bg-white shadow text-blue-600" : "text-slate-400"}`}>{s}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Résumé & Participants */}
          <section className="pt-4 border-t space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contenu Page 1</h3>
            <textarea value={config.summaryText} onChange={(e) => setConfig({...config, summaryText: e.target.value})} className="w-full p-2 border rounded text-xs h-20" placeholder="Résumé..."/>
            <button onClick={addParticipant} className="w-full py-2 border-2 border-dashed rounded text-[10px] font-bold text-slate-400 hover:text-blue-500 hover:border-blue-500">+ AJOUTER PARTICIPANT</button>
          </section>

          {/* Page 2 : Remarques & Grille */}
          <section className="pt-4 border-t space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contenu Page 2</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Grille Photos</span>
              <select value={config.gridCount} onChange={(e) => setConfig({...config, gridCount: parseInt(e.target.value)})} className="text-xs border rounded p-1">
                {[2, 4, 6].map(n => <option key={n} value={n}>{n} emplacements</option>)}
              </select>
            </div>
            <textarea value={config.remarks} onChange={(e) => setConfig({...config, remarks: e.target.value})} className="w-full p-2 border rounded text-xs h-24 font-mono" placeholder="Remarques techniques..."/>
          </section>
        </div>

        <div className="p-6 border-t bg-slate-50">
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest">
            Exporter en PDF
          </button>
        </div>
      </aside>

      {/* --- ZONE DE PREVIEW --- */}
      <main className="flex-1 overflow-y-auto p-12 space-y-12 flex flex-col items-center">
        
        {/* PAGE 1 */}
        <div className="relative bg-white shadow-2xl w-[210mm] h-[297mm] p-[25mm] flex flex-col shrink-0 overflow-hidden">
          <div className="flex justify-between items-start mb-16">
            <div className="w-32 h-12 bg-slate-50 border border-dashed flex items-center justify-center text-[8px] text-slate-400 uppercase">Logo Entreprise</div>
            <div className="w-32 h-12 bg-slate-50 border border-dashed flex items-center justify-center text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Logo Client</div>
          </div>

          <div className="border-l-[12px] pl-8 mb-12" style={{ borderColor: config.primaryColor }}>
            <h1 className="text-6xl font-black mb-4 tracking-tighter uppercase leading-none" style={{ color: config.primaryColor }}>{config.reportTitle}</h1>
            <p className="text-2xl text-slate-400 font-light tracking-tight">{config.projectInfo.name}</p>
          </div>

          {config.showProjectPhoto && (
            <div className="flex flex-col items-center mb-10">
              <div className={`${photoSizeMap[config.projectPhotoSize]} relative group bg-slate-100 rounded-2xl overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center`}>
                {config.projectImageSrc ? (
                  <img src={config.projectImageSrc} className="w-full h-full object-cover" alt="Projet" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-slate-200 mx-auto" />
                    <p className="text-[10px] text-slate-300 font-bold uppercase mt-2">Photo de garde</p>
                  </div>
                )}
              </div>
              <p className="mt-4 text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">{config.projectInfo.location} — {config.projectInfo.date}</p>
            </div>
          )}

          {config.showSummary && (
            <div className="mt-8 bg-slate-50 p-6 rounded-2xl border-l-4" style={{ borderLeftColor: config.primaryColor }}>
              <h4 className="text-[10px] font-black uppercase mb-2 tracking-[0.2em]" style={{ color: config.primaryColor }}>Résumé Exécutif</h4>
              <p className="text-slate-600 leading-relaxed text-xs font-medium italic">"{config.summaryText}"</p>
            </div>
          )}

          {config.showParticipants && (
            <div className="mt-8">
              <h4 className="text-[10px] font-black uppercase mb-4 tracking-[0.2em] text-slate-300">Équipe Projet</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {config.participants.map((p, i) => (
                  <div key={i} className="border-b border-slate-100 pb-2">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{p.name || "..."}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{p.role || "..."}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-6 border-t flex justify-between text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em]">
            <span>{config.projectInfo.clientName}</span>
            <span>Page 01</span>
          </div>
        </div>

        {/* PAGE 2 */}
        <div className="relative bg-white shadow-2xl w-[210mm] h-[297mm] p-[25mm] flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: config.primaryColor }}>Détails & Galerie</h2>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {config.showRemarks && (
            <div className="mb-12">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.2em]">Observations de terrain</h3>
              <div className="bg-slate-50 p-8 rounded-3xl text-sm text-slate-700 leading-loose whitespace-pre-line border border-slate-100">
                {config.remarks}
              </div>
            </div>
          )}

          {config.showPhotoGrid && (
            <div className="flex-1">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-[0.2em]">Galerie de photos détaillées</h3>
              <div className={`grid ${config.gridCount === 2 ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
                {Array.from({ length: config.gridCount }).map((_, i) => (
                  <label key={i} className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-blue-400 transition-all overflow-hidden relative group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGridImageUpload(e, i)} />
                    {config.gridImages[i] ? (
                      <img src={config.gridImages[i]} className="w-full h-full object-cover" alt="Detail" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-200 group-hover:text-blue-400 transition-colors" />
                        <span className="text-[8px] text-slate-300 font-black mt-2 uppercase tracking-widest">Upload Photo {i+1}</span>
                      </>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-6 border-t flex justify-between text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em]">
            <span>Rapport Technique — {config.projectInfo.name}</span>
            <span>Page 02</span>
          </div>
        </div>

      </main>
    </div>
  );
}