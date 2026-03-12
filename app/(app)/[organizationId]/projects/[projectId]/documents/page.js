'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { selectedProjectAtom } from '@/store/atoms';
import NavBar from '@/components/NavBar';
import { supabase } from '@/utils/supabase/client';
import {
  Search, X, ArrowUpDown, Plus, Upload, Folder, FolderOpen,
  FileText, Image, File, Eye, RotateCcw, Trash2, Pencil,
  ExternalLink, Info, Check, ChevronRight, UploadCloud,
} from 'lucide-react';
import { Dialog as HDialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import clsx from 'clsx';
import { Outfit } from 'next/font/google';
import { useUserData } from '@/hooks/useUserData';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const STORAGE_BUCKET = 'documents';

// ── Helpers ───────────────────────────────────────────────────
function fileTypeFromMime(mime = '') {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (['word','excel','spreadsheet','presentation','powerpoint','officedocument'].some(k => mime.includes(k))) return 'office';
  return 'unknown';
}
function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} Ko`;
  return `${(b/1048576).toFixed(1)} Mo`;
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function sanitizeFileName(name) {
  const accentRe = new RegExp('[\u0300-\u036f]', 'g');
  return name.normalize('NFD').replace(accentRe, '').replace(/\s/g, '_').replace(/[^\w.\-]/g, '_');
}
function storagePath(userId, documentId, fileName) {
  return `${userId}/${documentId}/${Date.now()}_${sanitizeFileName(fileName)}`;
}
function getSorted(docs, field, dir) {
  const DATES = ['updated_at', 'created_at'];
  return [...docs].sort((a, b) => {
    let va = DATES.includes(field) ? (a[field] ? new Date(a[field]).getTime() : 0) : (a[field] || '').toLowerCase();
    let vb = DATES.includes(field) ? (b[field] ? new Date(b[field]).getTime() : 0) : (b[field] || '').toLowerCase();
    if (!va && !vb) return 0; if (!va) return 1; if (!vb) return -1;
    const cmp = va > vb ? 1 : va < vb ? -1 : 0;
    return dir === 'desc' ? -cmp : cmp;
  });
}

// ── Services ──────────────────────────────────────────────────
const folderService = {
  async listByProject(projectId) {
    const { data, error } = await supabase.from('folders').select('*').eq('project_id', projectId).order('name');
    if (error) throw error; return data ?? [];
  },
  async create({ project_id, parent_id, name }) {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.from('folders')
      .insert({ project_id, parent_id: parent_id ?? null, name, created_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return data;
  },
  async rename(id, name) {
    const { data, error } = await supabase.from('folders')
      .update({ name, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error; return data;
  },
  async remove(id) {
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) throw error;
  },
};

const documentService = {
  async listByProject(projectId, folderId) {
    let q = supabase.from('documents').select('*').eq('project_id', projectId).order('updated_at', { ascending: false });
    if (folderId === null) q = q.is('folder_id', null);
    else if (folderId !== undefined) q = q.eq('folder_id', folderId);
    const { data: docs, error } = await q;
    if (error) throw error; if (!docs?.length) return [];
    const ids = docs.map(d => d.current_version_id).filter(Boolean);
    let map = {};
    if (ids.length) {
      const { data: vs } = await supabase.from('document_versions').select('*').in('id', ids);
      (vs ?? []).forEach(v => { map[v.id] = v; });
    }
    return docs.map(d => ({ ...d, current_version: map[d.current_version_id] ?? null }));
  },
  async getWithVersions(documentId) {
    const { data: doc, error } = await supabase.from('documents').select('*').eq('id', documentId).single();
    if (error) throw error;
    const { data: versions } = await supabase.from('document_versions').select('*')
      .eq('document_id', documentId).order('version_number', { ascending: false });
    const all = versions ?? [];
    return { ...doc, current_version: all.find(v => v.id === doc.current_version_id) ?? all[0] ?? null, versions: all };
  },
  async getDownloadUrl(path) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
    if (error) throw error; return data.signedUrl;
  },
  async restoreVersion(documentId, versionId) {
    const { data, error } = await supabase.from('documents')
      .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
      .eq('id', documentId).select().single();
    if (error) throw error; return data;
  },
  async remove(documentId) {
    const { data: vs } = await supabase.from('document_versions').select('storage_path').eq('document_id', documentId);
    if (vs?.length) await supabase.storage.from(STORAGE_BUCKET).remove(vs.map(v => v.storage_path));
    const { error } = await supabase.from('documents').delete().eq('id', documentId);
    if (error) throw error;
  },
  async uploadFile({ file, projectId, folderId, name, description, changeNotes, onProgress, userId }) {
    if (!userId) throw new Error('Non authentifié');
    const { data: { session } } = await supabase.auth.getSession();
    const { data: doc, error: e1 } = await supabase.from('documents').insert({
      project_id: projectId, folder_id: folderId ?? null, name,
      description: description ?? null, mime_type: file.type,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).select().single();
    if (e1) throw e1;
    const path = storagePath(userId, doc.id, file.name);
    onProgress?.(30);
    const { error: e2 } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
    if (e2) throw e2;
    onProgress?.(70);
    const { data: version, error: e3 } = await supabase.from('document_versions').insert({
      document_id: doc.id, version_number: 1, storage_path: path,
      file_size: file.size, change_notes: changeNotes ?? null, created_at: new Date().toISOString(),
    }).select().single();
    if (e3) throw e3;
    await supabase.from('documents').update({ current_version_id: version.id }).eq('id', doc.id);
    onProgress?.(100);
    return { ...doc, current_version: version, current_version_id: version.id };
  },
  async uploadNewVersion({ documentId, file, changeNotes, onProgress, userId }) {
    if (!userId) throw new Error('Non authentifié');
    const { data: vs } = await supabase.from('document_versions').select('version_number')
      .eq('document_id', documentId).order('version_number', { ascending: false }).limit(1);
    const next = (vs?.[0]?.version_number ?? 0) + 1;
    const path = storagePath(userId, documentId, file.name);
    onProgress?.(30);
    const { error: e1 } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
    if (e1) throw e1;
    onProgress?.(70);
    const { data: version, error: e2 } = await supabase.from('document_versions').insert({
      document_id: documentId, version_number: next, storage_path: path,
      file_size: file.size, change_notes: changeNotes ?? null, created_at: new Date().toISOString(),
    }).select().single();
    if (e2) throw e2;
    await supabase.from('documents').update({ current_version_id: version.id, updated_at: new Date().toISOString() }).eq('id', documentId);
    onProgress?.(100);
    return version;
  },
};

// ── FileIcon ───────────────────────────────────────────────────
function FileIcon({ mimeType, size = 'md' }) {
  const type = fileTypeFromMime(mimeType);
  const cfg = {
    pdf:     { label: 'PDF', cls: 'text-red-500 bg-red-50 border border-red-100' },
    image:   { label: 'IMG', cls: 'text-violet-500 bg-violet-50 border border-violet-100' },
    office:  { label: 'DOC', cls: 'text-blue-500 bg-blue-50 border border-blue-100' },
    unknown: { label: 'FIC', cls: 'text-neutral-500 bg-neutral-100 border border-neutral-200' },
  }[type];
  const sz = {
    sm: 'w-8 h-8 text-[9px] rounded-lg',
    md: 'w-9 h-9 text-[10px] rounded-lg',
    lg: 'w-12 h-12 text-xs rounded-xl',
  }[size];
  return (
    <div className={`${sz} ${cfg.cls} flex items-center justify-center font-extrabold flex-shrink-0 tracking-wide`}>
      {cfg.label}
    </div>
  );
}

// ── Dialog (Headless UI) ──────────────────────────────────────
function Dialog({ open, onClose, title, children, size = 'md' }) {
  const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' }[size];
  return (
    <Transition show={open} as={Fragment}>
      <HDialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/20" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className={`w-full ${maxW} bg-white rounded-xl border border-neutral-200 shadow-xl flex flex-col max-h-[90vh]`}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
                <DialogTitle className="text-base font-semibold text-neutral-900">{title}</DialogTitle>
                <button onClick={onClose} className="p-1 rounded-md hover:bg-neutral-100 transition-colors">
                  <X size={16} className="text-neutral-400" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </HDialog>
    </Transition>
  );
}

// ── UploadDialog ───────────────────────────────────────────────
function UploadDialog({ open, onClose, onSubmit, mode = 'new', documentName }) {
  const [file, setFile]               = useState(null);
  const [description, setDescription] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [loading, setLoading]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [error, setError]             = useState(null);
  const [dragging, setDragging]       = useState(false);
  const inputRef = useRef();

  const reset = () => { setFile(null); setDescription(''); setChangeNotes(''); setLoading(false); setProgress(0); setError(null); };
  const handleClose = () => { reset(); onClose(); };
  const handleSubmit = async () => {
    if (!file) { setError('Veuillez sélectionner un fichier.'); return; }
    setLoading(true); setError(null);
    try { await onSubmit({ file, description, changeNotes, onProgress: setProgress }); handleClose(); }
    catch (e) { setError(e.message ?? "Échec de l'upload."); setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} title={mode === 'new' ? 'Ajouter un document' : 'Nouvelle version'}>
      {mode === 'version' && documentName && (
        <p className="text-[12px] text-neutral-400 -mt-1 mb-3">{documentName}</p>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError(null); } }}
        className={clsx(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4",
          file ? 'border-neutral-400 bg-neutral-50' : dragging ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
        )}
      >
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(null); } }} />
        {file ? (
          <div>
            <div className="mb-2 flex justify-center"><FileText size={28} className="text-neutral-600" /></div>
            <p className="text-[13px] font-semibold text-neutral-900">{file.name}</p>
            <p className="text-[11px] text-neutral-400 mt-1">{formatBytes(file.size)}</p>
            <button onClick={e => { e.stopPropagation(); setFile(null); }}
              className="mt-2 text-[12px] text-neutral-400 hover:text-neutral-900 transition-colors">Changer de fichier</button>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex justify-center"><UploadCloud size={32} className="text-neutral-300" /></div>
            <p className="text-[13px] font-semibold text-neutral-900">Glissez un fichier ou cliquez</p>
            <p className="text-[11px] text-neutral-400 mt-1">PDF, Word, Excel, PowerPoint, Images</p>
          </div>
        )}
      </div>

      {mode === 'new' && (
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
            Description <span className="font-normal normal-case text-neutral-300">(optionnel)</span>
          </label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez brièvement ce document…"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 transition-colors" />
        </div>
      )}

      <div className="mb-4">
        <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
          Notes {mode === 'new' && <span className="font-normal normal-case text-neutral-300">(optionnel)</span>}
        </label>
        <textarea value={changeNotes} onChange={e => setChangeNotes(e.target.value)}
          placeholder={mode === 'new' ? 'ex. Première version' : 'ex. Mise à jour section 3…'} rows={3}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 transition-colors resize-none" />
      </div>

      {loading && (
        <div className="mb-4">
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-900 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Upload… {progress}%</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4">
          <p className="text-[12px] text-red-600 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
        <button onClick={handleClose}
          className="px-4 py-2 rounded-lg text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">
          Annuler
        </button>
        <button onClick={handleSubmit} disabled={!file || loading}
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-40 transition-colors">
          {loading ? 'Upload…' : mode === 'new' ? 'Uploader' : 'Enregistrer'}
        </button>
      </div>
    </Dialog>
  );
}

// ── ViewerDialog ───────────────────────────────────────────────
function ViewerDialog({ open, doc, onClose, onUploadVersion, onVersionRestored }) {
  const [tab, setTab]                       = useState('preview');
  const [previewUrl, setPreviewUrl]         = useState(null);
  const [loadingUrl, setLoadingUrl]         = useState(false);
  const [fullDoc, setFullDoc]               = useState(null);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [restoringId, setRestoringId]       = useState(null);

  useEffect(() => {
    if (!open || !doc) return;
    setTab('preview'); setPreviewVersion(null); setPreviewUrl(null);
    loadPreview(doc.current_version); loadFull();
  }, [open, doc?.id]);

  async function loadPreview(version) {
    const v = version ?? doc?.current_version;
    if (!v?.storage_path) return;
    setLoadingUrl(true);
    try { setPreviewUrl(await documentService.getDownloadUrl(v.storage_path)); }
    catch (e) { console.error(e); } finally { setLoadingUrl(false); }
  }
  async function loadFull() {
    try { setFullDoc(await documentService.getWithVersions(doc.id)); } catch (e) { console.error(e); }
  }
  async function handleRestore(version) {
    setRestoringId(version.id);
    try {
      await documentService.restoreVersion(doc.id, version.id);
      setFullDoc(await documentService.getWithVersions(doc.id));
      onVersionRestored?.();
    } catch (e) { console.error(e); } finally { setRestoringId(null); }
  }

  const d = fullDoc ?? doc;
  const currentVersionId = fullDoc?.current_version_id ?? doc?.current_version_id;
  const versions = fullDoc?.versions ?? [];
  const isPDF = doc?.mime_type === 'application/pdf';
  const isImage = doc?.mime_type?.startsWith('image/');

  return (
    <Dialog open={open} onClose={onClose} title={doc?.name ?? ''} size="lg">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-neutral-100">
        <FileIcon mimeType={doc?.mime_type} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-neutral-900 truncate">{doc?.name}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            v{d?.current_version?.version_number ?? 1} · {formatBytes(d?.current_version?.file_size)} · {formatDate(d?.updated_at)}
          </p>
        </div>
        <button onClick={() => { onClose(); onUploadVersion(doc); }}
          className="flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-600 text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors flex-shrink-0">
          <UploadCloud size={13} />
          <span>Nouvelle version</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5 mb-4 w-fit">
        {[
          { id: 'preview',  label: previewVersion ? `Aperçu v${previewVersion.version_number}` : 'Aperçu' },
          { id: 'versions', label: `Versions (${versions.length || 1})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-[13px] font-medium transition-all',
              tab === t.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'preview' && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-center min-h-96">
          {loadingUrl ? <p className="text-[13px] text-neutral-400">Chargement…</p>
          : !previewUrl ? <p className="text-[13px] text-neutral-400">Aperçu non disponible</p>
          : isImage ? <img src={previewUrl} alt={doc?.name} className="max-w-full max-h-[540px] rounded-lg object-contain" />
          : isPDF ? <iframe src={previewUrl} title={doc?.name} className="w-full h-[540px] border-0 rounded-lg" />
          : (
            <div className="text-center p-10">
              <FileIcon mimeType={doc?.mime_type} size="lg" />
              <p className="mt-4 text-[13px] font-semibold text-neutral-900">{doc?.name}</p>
              <p className="mt-1 text-[11px] text-neutral-400">Aperçu non disponible pour ce type de fichier.</p>
              <a href={previewUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 mt-4 bg-neutral-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium no-underline hover:bg-neutral-800 transition-colors">
                <ExternalLink size={13} />
                <span>Ouvrir</span>
              </a>
            </div>
          )}
        </div>
      )}

      {tab === 'versions' && (
        <div className="flex flex-col gap-2">
          {[...versions].sort((a, b) => b.version_number - a.version_number).map(v => {
            const isCurrent = v.id === currentVersionId;
            return (
              <div key={v.id} className={clsx(
                "rounded-lg border p-4",
                isCurrent ? 'bg-neutral-50 border-neutral-300' : 'bg-white border-neutral-200'
              )}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[13px] font-semibold text-neutral-900">v{v.version_number}</span>
                  {isCurrent && (
                    <span className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">Actuelle</span>
                  )}
                  <span className="ml-auto text-[11px] text-neutral-400">{formatDate(v.created_at)}</span>
                </div>
                {v.change_notes && <p className="text-[12px] text-neutral-600 mb-1.5 leading-relaxed">{v.change_notes}</p>}
                <p className="text-[11px] text-neutral-400 mb-3">{formatBytes(v.file_size)}</p>
                <div className="flex gap-2 pt-3 border-t border-neutral-100">
                  <button onClick={() => { setPreviewVersion(v); setTab('preview'); loadPreview(v); }}
                    className="flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-600 text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors">
                    <Eye size={12} />
                    <span>Aperçu</span>
                  </button>
                  {!isCurrent && (
                    <button onClick={() => handleRestore(v)} disabled={!!restoringId}
                      className="flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-600 text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50">
                      {restoringId === v.id
                        ? <><RotateCcw size={12} className="animate-spin" /><span>Restauration…</span></>
                        : <><RotateCcw size={12} /><span>Restaurer</span></>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

// ── SortDialog ─────────────────────────────────────────────────
const SORT_FIELDS = [
  { key: 'name',       label: 'Nom',                 isDate: false },
  { key: 'updated_at', label: 'Dernière mise à jour', isDate: true  },
  { key: 'created_at', label: 'Date de création',     isDate: true  },
];

function SortDialog({ open, onClose, sortField, sortDir, onSelect }) {
  return (
    <Dialog open={open} onClose={onClose} title="Trier par…" size="sm">
      <div className="flex flex-col gap-0.5">
        {SORT_FIELDS.map(field => (
          <div key={field.key}>
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mt-4 mb-2">{field.label}</p>
            {[
              { dir: 'asc',  label: field.isDate ? 'Du plus ancien au plus récent' : 'A → Z' },
              { dir: 'desc', label: field.isDate ? 'Du plus récent au plus ancien' : 'Z → A' },
            ].map(opt => {
              const active = sortField === field.key && sortDir === opt.dir;
              return (
                <button key={opt.dir} onClick={() => { onSelect(field.key, opt.dir); onClose(); }}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] mb-1 border transition-colors text-left",
                    active
                      ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  )}>
                  <span>{opt.label}</span>
                  {active && <Check size={14} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

// ── RenameFolderDialog ─────────────────────────────────────────
function RenameFolderDialog({ folder, onClose, onRename }) {
  const [name, setName] = useState('');
  useEffect(() => { setName(folder?.name ?? ''); }, [folder]);
  const submit = async () => { if (!name.trim()) return; await onRename(folder.id, name.trim()); onClose(); };
  return (
    <Dialog open={!!folder} onClose={onClose} title="Renommer le dossier" size="sm">
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 focus:outline-none focus:border-neutral-400 transition-colors mb-4" />
      <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
        <button onClick={onClose}
          className="px-4 py-2 rounded-lg text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">
          Annuler
        </button>
        <button onClick={submit}
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-[13px] font-medium hover:bg-neutral-800 transition-colors">
          Renommer
        </button>
      </div>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function DocumentsPage({ params }) {
  const { projectId, organizationId } = params;
  const { user, profile } = useUserData();
  const [project, setProject] = useAtom(selectedProjectAtom);

  const [folders, setFolders]           = useState([]);
  const [documents, setDocuments]       = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs]   = useState([]);
  const [search, setSearch]             = useState('');
  const [sortField, setSortField]       = useState('name');
  const [sortDir, setSortDir]           = useState('asc');
  const [viewerDoc, setViewerDoc]       = useState(null);
  const [uploadOpen, setUploadOpen]     = useState(false);
  const [uploadMode, setUploadMode]     = useState('new');
  const [versionTarget, setVersionTarget] = useState(null);
  const [sortOpen, setSortOpen]         = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [contextMenu, setContextMenu]   = useState(null);
  const [uploads, setUploads]           = useState([]);

  const isReady = !!user?.id;

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name').eq('id', projectId).single();
      if (data) setProject(data);
    };
    if (projectId) fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e) => {
      const menu = document.getElementById('context-menu');
      if (menu && !menu.contains(e.target)) setContextMenu(null);
    };
    setTimeout(() => { document.addEventListener('click', handleClickOutside); }, 10);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [foldersData, docsData, allDocsData] = await Promise.all([
        folderService.listByProject(projectId),
        documentService.listByProject(projectId, currentFolderId),
        documentService.listByProject(projectId, undefined),
      ]);
      setFolders(foldersData); setDocuments(docsData); setAllDocuments(allDocsData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [projectId, currentFolderId]);

  useEffect(() => { load(); }, [load]);

  const subfolders = folders.filter(f => (f.parent_id ?? null) === currentFolderId);
  const filteredDocs = getSorted(
    search ? allDocuments.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase())) : documents,
    sortField, sortDir,
  );

  const openFolder = (folder) => { setCurrentFolderId(folder.id); setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]); };
  const goToBreadcrumb = (id) => {
    if (id === null) { setBreadcrumbs([]); setCurrentFolderId(null); }
    else { setBreadcrumbs(prev => { const idx = prev.findIndex(b => b.id === id); return prev.slice(0, idx + 1); }); setCurrentFolderId(id); }
  };

  const handleUpload = async (params) => {
    if (!user?.id) { alert('Vous devez être connecté pour uploader un document'); return; }
    const name = params.file.name;
    setUploads(prev => [...prev, { name, progress: 0 }]);
    const updP = p => setUploads(prev => prev.map(u => u.name === name ? { ...u, progress: p } : u));
    try {
      if (uploadMode === 'new') {
        const doc = await documentService.uploadFile({ ...params, projectId, folderId: currentFolderId, name, userId: user.id, onProgress: updP });
        setDocuments(prev => [doc, ...prev]); setAllDocuments(prev => [doc, ...prev]);
      } else if (versionTarget) {
        await documentService.uploadNewVersion({ ...params, documentId: versionTarget.id, userId: user.id, onProgress: updP });
        await load();
      }
      setUploads(prev => prev.map(u => u.name === name ? { ...u, progress: 100, done: true } : u));
      setTimeout(() => setUploads(prev => prev.filter(u => u.name !== name)), 2500);
    } catch (e) {
      setUploads(prev => prev.map(u => u.name === name ? { ...u, error: e.message } : u));
      throw e;
    }
  };

  const openVersionUpload = (doc) => { setVersionTarget(doc); setUploadMode('version'); setUploadOpen(true); };

  const handleCreateFolder = async () => {
    if (!user?.id) { alert('Vous devez être connecté pour créer un dossier'); return; }
    if (!newFolderName.trim()) return;
    try {
      const f = await folderService.create({ project_id: projectId, parent_id: currentFolderId, name: newFolderName.trim() });
      setFolders(prev => [...prev, f]); setNewFolderName(''); setNewFolderOpen(false);
    } catch (e) { alert(`Erreur: ${e.message}`); }
  };

  const handleRenameFolder = async (id, name) => {
    const updated = await folderService.rename(id, name);
    setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
  };

  const handleDeleteFolder = async (id) => {
    if (!confirm('Supprimer ce dossier ?')) return;
    await folderService.remove(id); setFolders(prev => prev.filter(f => f.id !== id));
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm('Supprimer ce document et toutes ses versions ?')) return;
    await documentService.remove(id);
    setDocuments(prev => prev.filter(d => d.id !== id)); setAllDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className={clsx(outfit.className, "min-h-screen bg-neutral-50")}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} />

      <div className="px-8 pt-6 pb-10 max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Documents</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {search
                ? `${filteredDocs.length} résultat${filteredDocs.length > 1 ? 's' : ''} pour "${search}"`
                : `${subfolders.length + filteredDocs.length} élément${(subfolders.length + filteredDocs.length) > 1 ? 's' : ''} au total`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-48 rounded-lg border border-neutral-200 bg-white pl-8 pr-8 py-[7px] text-[13px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-900 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={() => setSortOpen(true)}
              className="flex items-center gap-1.5 px-3 py-[7px] bg-white border border-neutral-200 text-neutral-600 rounded-lg text-[13px] font-medium hover:bg-neutral-50 transition-colors"
            >
              <ArrowUpDown size={14} />
              Trier
            </button>

            {!search && (
              <button
                onClick={() => setNewFolderOpen(true)}
                className="flex items-center gap-1.5 px-3 py-[7px] bg-white border border-neutral-200 text-neutral-600 rounded-lg text-[13px] font-medium hover:bg-neutral-50 transition-colors"
              >
                <Folder size={14} />
                Nouveau dossier
              </button>
            )}

            <button
              onClick={() => { setUploadMode('new'); setUploadOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-[7px] bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors"
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">

          {/* Upload progress */}
          {uploads.length > 0 && (
            <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 space-y-2">
              {uploads.map(u => (
                <div key={u.name} className="flex items-center gap-3">
                  <FileText size={13} className="text-neutral-400 flex-shrink-0" />
                  <span className="text-[12px] font-medium text-neutral-600 flex-1 truncate">{u.name}</span>
                  {u.error
                    ? <span className="text-[11px] text-red-500">Erreur</span>
                    : u.done
                      ? <span className="flex items-center gap-1 text-[11px] text-neutral-900 font-medium"><Check size={11} />Terminé</span>
                      : (
                        <div className="w-24 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div className="h-full bg-neutral-900 rounded-full transition-all duration-300" style={{ width: `${u.progress}%` }} />
                        </div>
                      )}
                </div>
              ))}
            </div>
          )}

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="px-4 py-2.5 border-b border-neutral-200 flex items-center gap-1 text-[12px]">
              <button onClick={() => goToBreadcrumb(null)} className="text-neutral-400 hover:text-neutral-900 font-medium transition-colors">Documents</button>
              {breadcrumbs.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1">
                  <ChevronRight size={13} className="text-neutral-300" />
                  <button onClick={() => goToBreadcrumb(b.id)}
                    className={clsx("font-medium transition-colors hover:text-neutral-900", i === breadcrumbs.length - 1 ? "text-neutral-900" : "text-neutral-400")}>
                    {b.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <p className="text-[13px] text-neutral-400">Chargement…</p>
            </div>
          ) : (
            <div className="p-4">

              {/* New folder inline */}
              {!search && newFolderOpen && (
                <div className="flex gap-2 items-center bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 mb-3">
                  <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setNewFolderOpen(false); }}
                    placeholder="Nom du dossier…"
                    className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-[13px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-400 transition-colors" />
                  <button onClick={handleCreateFolder}
                    className="px-3 py-1.5 bg-neutral-900 text-white text-[12px] font-medium rounded-lg hover:bg-neutral-800 transition-colors">
                    Créer
                  </button>
                  <button onClick={() => setNewFolderOpen(false)}
                    className="text-[12px] text-neutral-400 hover:text-neutral-900 transition-colors px-1">
                    Annuler
                  </button>
                </div>
              )}

              {/* Empty state */}
              {subfolders.length === 0 && filteredDocs.length === 0 && !newFolderOpen ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText size={32} className="text-neutral-200 mb-3" />
                  <p className="text-[13px] font-medium text-neutral-900 mb-1">
                    {search ? 'Aucun résultat' : 'Aucun élément'}
                  </p>
                  <p className="text-[12px] text-neutral-400 mb-5 max-w-xs">
                    {search ? `Aucun fichier ne correspond à "${search}"` : 'Créez un dossier ou uploadez un document'}
                  </p>
                  {!search && (
                    <div className="flex gap-2">
                      <button onClick={() => setNewFolderOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-neutral-200 text-neutral-600 rounded-lg text-[13px] font-medium hover:bg-neutral-50 transition-colors">
                        <Folder size={13} />
                        Nouveau dossier
                      </button>
                      <button onClick={() => { setUploadMode('new'); setUploadOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 transition-colors">
                        <Plus size={13} />
                        Ajouter un document
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">

                  {/* Folders */}
                  {!search && subfolders.map((folder, i) => (
                    <div
                      key={`folder-${folder.id}`}
                      onClick={() => openFolder(folder)}
                      className={clsx(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors group",
                        (i < subfolders.length - 1 || filteredDocs.length > 0) && "border-b border-neutral-200"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                        <Folder size={15} className="text-neutral-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 truncate">{folder.name}</p>
                        <p className="text-[11px] text-neutral-400">Dossier</p>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setRenameTarget(folder)}
                          className="w-7 h-7 rounded-md hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteFolder(folder.id)}
                          className="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <ChevronRight size={15} className="text-neutral-300 flex-shrink-0" />
                    </div>
                  ))}

                  {/* Documents */}
                  {filteredDocs.map((doc, i) => {
                    const isLast = i === filteredDocs.length - 1;
                    const version = doc.current_version;
                    return (
                      <div
                        key={`doc-${doc.id}`}
                        onClick={() => setViewerDoc(doc)}
                        className={clsx(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors group",
                          !isLast && "border-b border-neutral-200"
                        )}
                      >
                        <FileIcon mimeType={doc.mime_type} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-neutral-900 truncate">{doc.name}</p>
                          {doc.description && (
                            <p className="text-[11px] text-neutral-400 truncate">{doc.description}</p>
                          )}
                          <p className="text-[11px] text-neutral-300 mt-0.5">
                            {formatBytes(version?.file_size)} · {formatDate(doc.updated_at)}
                          </p>
                        </div>

                        <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md flex-shrink-0">
                          v{version?.version_number ?? 1}
                        </span>

                        <button
                          onClick={e => { e.stopPropagation(); e.preventDefault(); setContextMenu({ doc, x: e.clientX, y: e.clientY }); }}
                          className="w-7 h-7 rounded-md hover:bg-neutral-100 flex items-center justify-center text-neutral-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          id="context-menu"
          className="fixed bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden min-w-[180px]"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 196), top: Math.min(contextMenu.y, window.innerHeight - 90), zIndex: 9999 }}
        >
          <button
            onClick={e => { e.stopPropagation(); setContextMenu(null); openVersionUpload(contextMenu.doc); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-neutral-600 hover:bg-neutral-50 transition-colors text-left"
          >
            <UploadCloud size={13} className="text-neutral-400" />
            Nouvelle version
          </button>
          <div className="h-px bg-neutral-100" />
          <button
            onClick={e => { e.stopPropagation(); const d = contextMenu.doc; setContextMenu(null); handleDeleteDocument(d.id); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        </div>
      )}

      <UploadDialog open={uploadOpen} mode={uploadMode} documentName={versionTarget?.name}
        onClose={() => { setUploadOpen(false); setVersionTarget(null); }} onSubmit={handleUpload} />
      <ViewerDialog open={!!viewerDoc} doc={viewerDoc} onClose={() => setViewerDoc(null)}
        onUploadVersion={doc => { setViewerDoc(null); openVersionUpload(doc); }} onVersionRestored={load} />
      <SortDialog open={sortOpen} onClose={() => setSortOpen(false)}
        sortField={sortField} sortDir={sortDir} onSelect={(f, d) => { setSortField(f); setSortDir(d); }} />
      <RenameFolderDialog folder={renameTarget} onClose={() => setRenameTarget(null)} onRename={handleRenameFolder} />
    </div>
  );
}