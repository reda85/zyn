"use client";

import React, { useState } from "react";
import { 
  Image as ImageIcon, Layout, Settings, FileText, Eye, 
  Users, AlignLeft, Plus, Trash2, MessageSquare, Grid, Upload 
} from "lucide-react";
import { Outfit } from 'next/font/google';
import clsx from 'clsx';

const outfit = Outfit({ subsets: ['latin'], display: 'swap' });

export default function TemplateBuilder() {
  const [config, setConfig] = useState({
    primaryColor: "#111827", // Gray-900 instead of blue
    reportTitle: "RAPPORT DE CHANTIER",
    // Page 1
    showCompanyLogo: true,
    showClientLogo: true,
    showProjectPhoto: true,
    projectPhotoSize: "medium",
    projectImageSrc: null,
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
    gridImages: {},
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
    <div className={clsx("flex h-screen bg-gray-100 text-gray-900", outfit.className)}>
      
      {/* --- PANNEAU DE CONTRÔLE (GAUCHE) --- */}
      <aside className="w-96 bg-white border-r border-gray-200 flex flex-col shadow-lg z-20">
        <div className="p-6 border-b bg-gray-900 text-white">
          <h1 className="text-lg font-semibold flex items-center gap-2 leading-6">
            <Settings className="w-5 h-5 text-gray-400" /> Report Generator
          </h1>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Design & En-tête */}
          <section className="space-y-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Configuration Globale</h3>
            <input 
              type="text" 
              value={config.reportTitle} 
              onChange={(e) => setConfig({...config, reportTitle: e.target.value})}
              className="w-full p-2.5 border border-gray-200 rounded-lg font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
            <div className="flex items-center gap-4">
               <input 
                 type="color" 
                 value={config.primaryColor} 
                 onChange={(e) => setConfig({...config, primaryColor: e.target.value})} 
                 className="w-12 h-10 cursor-pointer rounded border border-gray-200" 
               />
               <span className="text-sm text-gray-600 font-medium">Couleur du thème</span>
            </div>
          </section>

          {/* Page 1 : Photo & Taille */}
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Photo de Couverture</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input 
                  type="checkbox" 
                  checked={config.showProjectPhoto} 
                  onChange={(e) => setConfig({...config, showProjectPhoto: e.target.checked})}
                  className="rounded border-gray-300"
                /> 
                Afficher la photo
              </label>
              
              {config.showProjectPhoto && (
                <>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleMainImageUpload} 
                    className="text-xs w-full border border-gray-200 p-2 rounded-lg bg-gray-50" 
                  />
                  <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                    {["small", "medium", "full"].map((s) => (
                      <button 
                        key={s} 
                        onClick={() => setConfig({...config, projectPhotoSize: s})} 
                        className={clsx(
                          "flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors",
                          config.projectPhotoSize === s 
                            ? "bg-white shadow-sm text-gray-900" 
                            : "text-gray-500 hover:text-gray-900"
                        )}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Résumé & Participants */}
          <section className="pt-4 border-t border-gray-200 space-y-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contenu Page 1</h3>
            <textarea 
              value={config.summaryText} 
              onChange={(e) => setConfig({...config, summaryText: e.target.value})} 
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm h-20 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none" 
              placeholder="Résumé..."
            />
            <button 
              onClick={addParticipant} 
              className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors"
            >
              + Ajouter participant
            </button>
          </section>

          {/* Page 2 : Remarques & Grille */}
          <section className="pt-4 border-t border-gray-200 space-y-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contenu Page 2</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Grille Photos</span>
              <select 
                value={config.gridCount} 
                onChange={(e) => setConfig({...config, gridCount: parseInt(e.target.value)})} 
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                {[2, 4, 6].map(n => <option key={n} value={n}>{n} emplacements</option>)}
              </select>
            </div>
            <textarea 
              value={config.remarks} 
              onChange={(e) => setConfig({...config, remarks: e.target.value})} 
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm h-24 font-mono focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none" 
              placeholder="Remarques techniques..."
            />
          </section>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-sm shadow-sm hover:bg-gray-800 transition-colors">
            Exporter en PDF
          </button>
        </div>
      </aside>

      {/* --- ZONE DE PREVIEW --- */}
      <main className="flex-1 overflow-y-auto p-12 space-y-12 flex flex-col items-center bg-gray-100">
        
        {/* PAGE 1 */}
        <div className="relative bg-white shadow-lg w-[210mm] h-[297mm] p-[25mm] flex flex-col shrink-0 overflow-hidden">
          <div className="flex justify-between items-start mb-16">
            <div className="w-32 h-12 bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 font-medium">Logo Entreprise</div>
            <div className="w-32 h-12 bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 font-medium">Logo Client</div>
          </div>

          <div className="border-l-[12px] pl-8 mb-12" style={{ borderColor: config.primaryColor }}>
            <h1 className="text-6xl font-bold mb-4 tracking-tight leading-none" style={{ color: config.primaryColor }}>
              {config.reportTitle}
            </h1>
            <p className="text-2xl text-gray-400 font-normal">{config.projectInfo.name}</p>
          </div>

          {config.showProjectPhoto && (
            <div className="flex flex-col items-center mb-10">
              <div className={clsx(
                photoSizeMap[config.projectPhotoSize],
                "relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-md flex items-center justify-center"
              )}>
                {config.projectImageSrc ? (
                  <img src={config.projectImageSrc} className="w-full h-full object-cover" alt="Projet" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-400 font-medium mt-2">Photo de garde</p>
                  </div>
                )}
              </div>
              <p className="mt-4 text-xs text-gray-500 font-medium">{config.projectInfo.location} — {config.projectInfo.date}</p>
            </div>
          )}

          {config.showSummary && (
            <div className="mt-8 bg-gray-50 p-6 rounded-lg border-l-4" style={{ borderLeftColor: config.primaryColor }}>
              <h4 className="text-xs font-semibold uppercase mb-2 tracking-wider" style={{ color: config.primaryColor }}>
                Résumé Exécutif
              </h4>
              <p className="text-gray-700 leading-relaxed text-sm">"{config.summaryText}"</p>
            </div>
          )}

          {config.showParticipants && (
            <div className="mt-8">
              <h4 className="text-xs font-semibold uppercase mb-4 tracking-wider text-gray-500">Équipe Projet</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {config.participants.map((p, i) => (
                  <div key={i} className="border-b border-gray-200 pb-2">
                    <p className="text-sm font-semibold text-gray-900">{p.name || "..."}</p>
                    <p className="text-xs text-gray-500 font-medium">{p.role || "..."}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-gray-200 flex justify-between text-xs text-gray-400 font-medium">
            <span>{config.projectInfo.clientName}</span>
            <span>Page 01</span>
          </div>
        </div>

        {/* PAGE 2 */}
        <div className="relative bg-white shadow-lg w-[210mm] h-[297mm] p-[25mm] flex flex-col shrink-0 overflow-hidden">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-2xl font-semibold" style={{ color: config.primaryColor }}>Détails & Galerie</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {config.showRemarks && (
            <div className="mb-12">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-4 tracking-wider">Observations de terrain</h3>
              <div className="bg-gray-50 p-8 rounded-lg text-sm text-gray-700 leading-relaxed whitespace-pre-line border border-gray-200">
                {config.remarks}
              </div>
            </div>
          )}

          {config.showPhotoGrid && (
            <div className="flex-1">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-6 tracking-wider">Galerie de photos détaillées</h3>
              <div className={clsx(
                "grid gap-6",
                config.gridCount === 2 ? 'grid-cols-1' : 'grid-cols-2'
              )}>
                {Array.from({ length: config.gridCount }).map((_, i) => (
                  <label 
                    key={i} 
                    className="aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-gray-400 transition-all overflow-hidden relative group"
                  >
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGridImageUpload(e, i)} />
                    {config.gridImages[i] ? (
                      <img src={config.gridImages[i]} className="w-full h-full object-cover" alt="Detail" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-300 group-hover:text-gray-600 transition-colors" />
                        <span className="text-xs text-gray-400 font-medium mt-2">Upload Photo {i+1}</span>
                      </>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-gray-200 flex justify-between text-xs text-gray-400 font-medium">
            <span>Rapport Technique — {config.projectInfo.name}</span>
            <span>Page 02</span>
          </div>
        </div>

      </main>
    </div>
  );
}