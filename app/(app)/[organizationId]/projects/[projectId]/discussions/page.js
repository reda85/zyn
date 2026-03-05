'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Plus, Users, X, Search, UserPlus, MessageSquare, Image as ImageIcon, Link as LinkIcon, MapPin, FileText } from 'lucide-react';
import { Outfit } from 'next/font/google';
import NavBar from '@/components/NavBar';
import { useAtom } from 'jotai';
import { selectedProjectAtom, categoriesAtom, statusesAtom } from '@/store/atoms';
import { categoriesPinIcons } from '@/utils/categories';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/utils/supabase/client';
import clsx from 'clsx';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-violet-500','bg-blue-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-cyan-500','bg-indigo-500',
];

const avatarColor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const initials = (name = '') => {
  const p = name.trim().split(' ').filter(Boolean);
  if (!p.length) return '?';
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const fmtFull = (iso) => iso
  ? new Date(iso).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
  : '';

// ─────────────────────────────────────────────────────────────────────────────
// LINKED ITEM COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function LinkedItem({ item, isOwn, organizationId, projectId }) {
  const [categories] = useAtom(categoriesAtom);
  const [statuses] = useAtom(statusesAtom);
  const [pinData, setPinData] = useState(null);

  useEffect(() => {
    if (item.item_type !== 'pin') return;
    const fetchPin = async () => {
      const { data } = await supabase.from('pdf_pins').select('category_id, status_id').eq('id', item.item_id).single();
      if (data) setPinData(data);
    };
    fetchPin();
  }, [item.item_id, item.item_type]);

  const handleClick = () => {
    if (item.item_type === 'pin') window.open(`/${organizationId}/projects/${projectId}/tasks#pin-${item.item_id}`, '_blank');
    else if (item.item_type === 'plan') window.open(`/${organizationId}/projects/${projectId}/${item.item_id}`, '_blank');
  };

  if (item.item_type === 'plan') {
    return (
      <div onClick={handleClick} className={`flex items-center gap-2 mt-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? 'bg-white/10' : 'bg-gray-100 text-[#374151]'}`}>
        <span>🗺</span>
        <span>{item.label ?? item.item_id}</span>
      </div>
    );
  }

  if (!pinData) return null;
  const statusColor = statuses.find(s => s.id === pinData.status_id)?.color || '#9CA3AF';
  const catIconKey = categories.find(c => c.id === pinData.category_id)?.icon || 'unassigned';
  const CategoryIcon = categoriesPinIcons[catIconKey];

  return (
    <div onClick={handleClick} className={`flex items-center gap-2 mt-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? 'bg-white/10' : 'bg-gray-100 text-[#374151]'}`}>
      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: statusColor }}>
        {CategoryIcon && <div className="w-2.5 h-2.5 text-white">{CategoryIcon}</div>}
      </div>
      <span>{item.label ?? item.item_id}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function DiscussionsPage({ params }) {
  const { projectId, organizationId } = params;
  const { user, profile } = useUserData();
  const [project, setProject] = useAtom(selectedProjectAtom);

  const [groups, setGroups]                     = useState([]);
  const [activeGroup, setActiveGroup]           = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [unread, setUnread]                     = useState({});
  const [lastMsgs, setLastMsgs]                 = useState({});
  const [input, setInput]                       = useState('');
  const [sending, setSending]                   = useState(false);
  const [loadingGroups, setLoadingGroups]       = useState(true);
  const [loadingMessages, setLoadingMessages]   = useState(false);
  const [showCreate, setShowCreate]             = useState(false);
  const [showMembers, setShowMembers]           = useState(false);
  const [pendingImages, setPendingImages]       = useState([]);
  const [pendingLinked, setPendingLinked]       = useState([]);
  const [showLinkModal, setShowLinkModal]       = useState(false);
  const fileInputRef   = useRef(null);
  const bottomRef      = useRef(null);
  const channelRef     = useRef(null);
  const inputRef       = useRef(null);
  const channelsUnreadRef = useRef([]);

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name,plans(id,name)').is('plans.deleted_at', null).eq('id', projectId).single();
      if (data) setProject(data);
    };
    if (projectId) fetchProject();
  }, [projectId]);

  const loadGroups = useCallback(async () => {
    if (!projectId || !user) return;
    setLoadingGroups(true);
    try {
      const { data } = await supabase
        .from('discussions_groups')
        .select('*, discussions_members!inner(user_id, role, last_read_at), discussions_messages(id, created_at, content)')
        .eq('project_id', projectId)
        .eq('discussions_members.user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      const gs = data ?? [];
      setGroups(gs);
      const lm = {};
      gs.forEach(g => { const arr = g.discussions_messages ?? []; if (arr.length) lm[g.id] = arr[arr.length - 1]; });
      setLastMsgs(lm);
      const counts = {};
      await Promise.all(gs.map(async g => { const { data: n } = await supabase.rpc('get_discussion_unread', { p_group_id: g.id }); counts[g.id] = n ?? 0; }));
      setUnread(counts);
      channelsUnreadRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsUnreadRef.current = gs.map(g =>
        supabase.channel(`unread_web:${g.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'discussions_messages', filter: `group_id=eq.${g.id}` },
            (payload) => {
              setLastMsgs(prev => ({ ...prev, [g.id]: { content: payload.new.content, created_at: payload.new.created_at } }));
              if (payload.new.user_id !== user?.id) setUnread(prev => ({ ...prev, [g.id]: (prev[g.id] ?? 0) + 1 }));
            })
          .subscribe()
      );
    } finally { setLoadingGroups(false); }
  }, [projectId, user?.id]);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => () => channelsUnreadRef.current.forEach(ch => supabase.removeChannel(ch)), []);

  const selectGroup = useCallback(async (group) => {
    setActiveGroup(group); setShowMembers(false); setPendingImages([]); setPendingLinked([]);
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('discussions_messages')
        .select('*, members(auth_id, name, avatar_url), discussions_attachments(*), discussions_linked_items(*)')
        .eq('group_id', group.id).eq('is_deleted', false).order('created_at', { ascending: true }).limit(50);
      setMessages(data ?? []);
      await supabase.rpc('mark_discussion_read', { p_group_id: group.id });
      setUnread(prev => ({ ...prev, [group.id]: 0 }));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80);
    } finally { setLoadingMessages(false); }
  }, []);

  useEffect(() => {
    if (!activeGroup) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`chat_web:${activeGroup.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'discussions_messages', filter: `group_id=eq.${activeGroup.id}` },
        async (payload) => {
          setMessages(prev => { if (prev.find(m => m.id === payload.new.id)) return prev; return [...prev, { ...payload.new, members: null, discussions_attachments: [], discussions_linked_items: [] }]; });
          const { data } = await supabase.from('discussions_messages').select('*, members(auth_id, name, avatar_url), discussions_attachments(*), discussions_linked_items(*)').eq('id', payload.new.id).single();
          if (data) setMessages(prev => prev.map(m => m.id === data.id ? data : m));
          await supabase.rpc('mark_discussion_read', { p_group_id: activeGroup.id });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        })
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [activeGroup?.id]);

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0 && pendingLinked.length === 0) || !activeGroup || sending) return;
    setSending(true);
    const content = input.trim(), images = [...pendingImages], linked = [...pendingLinked];
    setInput(''); setPendingImages([]); setPendingLinked([]);
    try {
      const { data: msg, error: msgErr } = await supabase.from('discussions_messages').insert({ group_id: activeGroup.id, user_id: user.id, content: content || null }).select().single();
      if (msgErr) throw msgErr;
      if (images.length > 0) {
        await Promise.all(images.map(async ({ file }) => {
          const ext = file.name.split('.').pop();
          const path = `${user.id}/${msg.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('discussions').upload(path, file);
          if (!uploadErr) {
            const { data: publicUrl } = supabase.storage.from('discussions').getPublicUrl(path);
            await supabase.from('discussions_attachments').insert({ message_id: msg.id, file_url: path, file_name: file.name, file_type: 'image', file_size: file.size, public_url: publicUrl.publicUrl });
          }
        }));
      }
      if (linked.length > 0) await supabase.from('discussions_linked_items').insert(linked.map(l => ({ message_id: msg.id, item_type: l.item_type, item_id: l.item_id, label: l.label })));
    } catch (e) { console.error('Send failed:', e); setInput(content); setPendingImages(images); setPendingLinked(linked); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => setPendingImages(prev => [...prev, { file, preview: reader.result }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <div className={clsx(outfit.className, "flex flex-col h-screen bg-[#f9fafb] overflow-hidden")}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} />

      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-[#6b7280]" />
              <span className="text-[13px] font-semibold text-[#111827]">Discussions</span>
              {totalUnread > 0 && (
                <span className="bg-[#111827] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-2 py-1.5 bg-[#111827] text-white rounded-lg text-[12px] font-medium hover:bg-[#1f2937] transition-colors"
              title="Nouveau groupe"
            >
              <Plus size={13} strokeWidth={2.5} />
              Nouveau
            </button>
          </div>

          {/* Group list */}
          <div className="flex-1 overflow-y-auto">
            {loadingGroups ? (
              <div className="flex flex-col gap-1 p-3">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
                <MessageSquare size={28} className="text-gray-300" />
                <p className="text-[12px] text-[#9ca3af]">Aucune discussion</p>
                <button onClick={() => setShowCreate(true)} className="text-[12px] bg-[#111827] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#1f2937] transition-colors">
                  Créer un groupe
                </button>
              </div>
            ) : groups.map(g => {
              const count = unread[g.id] ?? 0;
              const lm = lastMsgs[g.id];
              const isActive = activeGroup?.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => selectGroup(g)}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-3 text-left transition-all border-l-2",
                    isActive ? 'bg-[#f9fafb] border-[#111827]' : 'border-transparent hover:bg-[#f9fafb]'
                  )}
                >
                  <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-[11px] ${avatarColor(g.id)}`}>
                    {initials(g.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-medium text-[#111827] truncate">{g.name}</span>
                      {lm && <span className="text-[10px] text-[#9ca3af] shrink-0">{fmtTime(lm.created_at)}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-[#9ca3af] truncate max-w-[130px]">
                        {lm?.content ?? <em className="not-italic">Aucun message</em>}
                      </span>
                      {count > 0 && (
                        <span className="bg-[#111827] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shrink-0">
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── CHAT AREA ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#f9fafb]">
          {!activeGroup ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10">
              <MessageSquare size={32} className="text-gray-300" />
              <div className="text-center">
                <p className="text-[13px] font-medium text-[#374151] mb-1">Sélectionnez une discussion</p>
                <p className="text-[12px] text-[#9ca3af]">Choisissez un groupe ou créez-en un nouveau.</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] text-white rounded-lg text-[13px] font-medium hover:bg-[#1f2937] transition-colors">
                <Plus size={13} />
                Nouveau groupe
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[11px] ${avatarColor(activeGroup.id)}`}>
                    {initials(activeGroup.name)}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827]">{activeGroup.name}</p>
                    {activeGroup.description && <p className="text-[11px] text-[#9ca3af]">{activeGroup.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => setShowMembers(v => !v)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                    showMembers ? 'bg-[#111827] text-white' : 'bg-white border border-gray-200 text-[#374151] hover:bg-gray-50'
                  )}
                >
                  <Users size={13} />
                  Membres
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
                  {loadingMessages ? (
                    <div className="flex flex-col gap-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                          <div className="h-10 w-44 rounded-xl bg-gray-200 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16">
                      <MessageSquare size={24} className="text-gray-300" />
                      <p className="text-[12px] text-[#9ca3af]">Aucun message. Commencez la conversation !</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isOwn     = msg.user_id === user?.id;
                        const msgProfile = msg.members;
                        const prevMsg   = messages[idx - 1];
                        const showMeta  = !isOwn && prevMsg?.user_id !== msg.user_id;
                        const images    = (msg.discussions_attachments ?? []).filter(a => a.file_type === 'image');
                        const linked    = msg.discussions_linked_items ?? [];

                        return (
                          <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} mb-0.5`}>
                            {!isOwn && (
                              showMeta
                                ? <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-[10px] mb-0.5 ${avatarColor(msg.user_id)}`}>
                                    {initials(msgProfile?.name ?? '?')}
                                  </div>
                                : <div className="w-6 shrink-0" />
                            )}
                            <div className={`flex flex-col max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
                              {showMeta && (
                                <span className="text-[11px] font-medium text-[#9ca3af] mb-1 px-1">{msgProfile?.name ?? 'Inconnu'}</span>
                              )}
                              <div className={clsx(
                                "px-3 py-2 rounded-xl text-[13px] leading-relaxed",
                                isOwn
                                  ? 'bg-[#111827] text-white rounded-br-sm'
                                  : 'bg-white text-[#111827] border border-gray-200 rounded-bl-sm shadow-sm'
                              )}>
                                {msg.content && <p className="break-words">{msg.content}</p>}
                                {images.map((att, i) => (
                                  <img key={i} src={att.public_url} alt={att.file_name}
                                    className="mt-2 rounded-lg max-w-xs border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(att.public_url, '_blank')} />
                                ))}
                                {linked.map((l, i) => (
                                  <LinkedItem key={i} item={l} isOwn={isOwn} organizationId={organizationId} projectId={projectId} />
                                ))}
                                <span className={`block text-[10px] mt-1 ${isOwn ? 'text-gray-400 text-right' : 'text-[#9ca3af]'}`}>
                                  {fmtFull(msg.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </>
                  )}
                </div>

                {/* Input bar */}
                <div className="flex flex-col bg-white border-t border-gray-200">
                  {(pendingImages.length > 0 || pendingLinked.length > 0) && (
                    <div className="px-4 py-2.5 border-b border-gray-200 flex flex-wrap gap-2">
                      {pendingImages.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img.preview} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                          <button onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {pendingLinked.map((l, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-200 text-[#374151] rounded-lg text-[11px] font-medium group relative">
                          <span>{l.item_type === 'pin' ? '📌' : '🗺'}</span>
                          <span className="max-w-[100px] truncate">{l.label}</span>
                          <button onClick={() => setPendingLinked(prev => prev.filter((_, idx) => idx !== i))}
                            className="ml-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-2 px-4 py-3">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[#9ca3af] hover:text-[#374151] flex items-center justify-center shrink-0 transition-colors">
                      <ImageIcon size={15} />
                    </button>
                    <button onClick={() => setShowLinkModal(true)}
                      className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[#9ca3af] hover:text-[#374151] flex items-center justify-center shrink-0 transition-colors">
                      <LinkIcon size={15} />
                    </button>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Écrivez un message… (Entrée pour envoyer)"
                      rows={1}
                      className="flex-1 resize-none bg-[#f9fafb] border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-colors max-h-28 overflow-y-auto"
                    />
                    <button
                      onClick={handleSend}
                      disabled={(!input.trim() && pendingImages.length === 0 && pendingLinked.length === 0) || sending}
                      className="w-8 h-8 rounded-lg bg-[#111827] hover:bg-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* ── MEMBERS PANEL ── */}
        {showMembers && activeGroup && (
          <MembersPanel group={activeGroup} projectId={projectId} currentUserId={user?.id} onClose={() => setShowMembers(false)} />
        )}

        {/* ── CREATE MODAL ── */}
        {showCreate && (
          <CreateGroupModal projectId={projectId} onClose={() => setShowCreate(false)} onCreated={(g) => { setShowCreate(false); loadGroups().then(() => selectGroup(g)); }} />
        )}

        {/* ── LINK ITEM MODAL ── */}
        {showLinkModal && (
          <LinkItemModal projectId={projectId} organizationId={organizationId}
            onLink={(item) => { setPendingLinked(prev => [...prev, item]); setShowLinkModal(false); }}
            onClose={() => setShowLinkModal(false)} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LINK ITEM MODAL
// ─────────────────────────────────────────────────────────────────────────────
function LinkItemModal({ projectId, organizationId, onLink, onClose }) {
  const [activeTab, setActiveTab] = useState('pin');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const fetchItems = async () => {
      setLoading(true);
      try {
        if (activeTab === 'pin') {
          const { data } = await supabase.from('pdf_pins').select('id, name, pin_number, projects(project_number), pdf_name').eq('project_id', projectId).is('deleted_at', null).order('pin_number', { ascending: false }).limit(50);
          setItems((data ?? []).map(p => ({ id: p.id, label: `${p.projects?.project_number}-${p.pin_number}: ${p.name || 'Pin sans nom'}`, sublabel: p.pdf_name || '', type: 'pin' })));
        } else {
          const { data } = await supabase.from('plans').select('id, name').eq('project_id', projectId).is('deleted_at', null).order('created_at', { ascending: false }).limit(50);
          setItems((data ?? []).map(p => ({ id: p.id, label: p.name, type: 'plan' })));
        }
      } finally { setLoading(false); }
    };
    fetchItems();
  }, [projectId, activeTab]);

  const filtered = items.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#111827]">Lier un élément</h3>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] transition-colors"><X size={16} /></button>
        </div>

        {/* Tabs — pill style */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 shadow-sm p-1 w-fit">
            {[
              { id: 'pin', label: 'Tâches / Pins', icon: <MapPin size={13} /> },
              { id: 'plan', label: 'Plans', icon: <FileText size={13} /> },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                  activeTab === t.id ? 'bg-stone-200 text-[#111827]' : 'text-[#6b7280] hover:text-[#374151] hover:bg-stone-100'
                )}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
            <input type="text" placeholder={`Rechercher ${activeTab === 'pin' ? 'une tâche' : 'un plan'}…`} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-[#f9fafb] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all"
              autoFocus />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border-t border-gray-200">
          {loading ? (
            <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-gray-200 border-t-[#111827] rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center"><p className="text-[12px] text-[#9ca3af]">Aucun élément trouvé</p></div>
          ) : filtered.map(item => (
            <button key={item.id} onClick={() => { onLink({ item_type: item.type, item_id: item.id, label: item.label }); onClose(); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#f9fafb] transition-colors text-left border-b border-gray-100 last:border-0">
              <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-gray-100 border border-gray-200 text-[#6b7280]">
                {item.type === 'pin' ? <MapPin size={13} /> : <FileText size={13} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111827] truncate">{item.label}</p>
                {item.sublabel && <p className="text-[11px] text-[#9ca3af] truncate">{item.sublabel}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function MembersPanel({ group, projectId, currentUserId, onClose }) {
  const [members, setMembers]             = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [isAdmin, setIsAdmin]             = useState(false);
  const timer = useRef(null);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('discussions_members').select('*, members(auth_id, name, email, avatar_url)').eq('group_id', group.id);
    setMembers(data ?? []);
    setIsAdmin(data?.find(m => m.user_id === currentUserId)?.role === 'admin');
  }, [group.id, currentUserId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const { data: ex } = await supabase.from('discussions_members').select('user_id').eq('group_id', group.id);
      const excludeIds = (ex ?? []).map(m => m.user_id);
      const { data } = await supabase.from('members_projects').select('member_id, members(id, auth_id, name, email, avatar_url)').eq('project_id', projectId).limit(50);
      let results = (data ?? []).map(r => ({ auth_id: r.members?.auth_id, name: r.members?.name, email: r.members?.email })).filter(u => u.auth_id && !excludeIds.includes(u.auth_id));
      const q = searchQuery.toLowerCase();
      results = results.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
      setSearchResults(results);
      setSearching(false);
    }, 300);
  }, [searchQuery]);

  const addMember = async (authId) => {
    await supabase.from('discussions_members').insert({ group_id: group.id, user_id: authId, role: 'member' });
    setSearchResults(p => p.filter(u => u.auth_id !== authId));
    setSearchQuery('');
    loadMembers();
  };

  const removeMember = async (userId) => {
    await supabase.from('discussions_members').delete().eq('group_id', group.id).eq('user_id', userId);
    setMembers(p => p.filter(m => m.user_id !== userId));
  };

  return (
    <aside className="w-56 shrink-0 bg-white border-l border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
        <span className="text-[13px] font-semibold text-[#111827]">Membres</span>
        <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] transition-colors"><X size={15} /></button>
      </div>

      {isAdmin && (
        <div className="px-3 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Search size={13} className="text-[#9ca3af]" />
            <input className="flex-1 bg-transparent text-[12px] text-[#111827] outline-none placeholder:text-[#9ca3af]" placeholder="Inviter…"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searching && <div className="w-3 h-3 border-2 border-gray-200 border-t-[#111827] rounded-full animate-spin" />}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 max-h-36 overflow-y-auto">
              {searchResults.map(u => (
                <div key={u.auth_id} className="flex items-center gap-2 p-2 rounded-lg bg-[#f9fafb] border border-gray-200">
                  <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-[9px] ${avatarColor(u.auth_id)}`}>
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[#111827] truncate">{u.name}</p>
                    <p className="text-[10px] text-[#9ca3af] truncate">{u.email}</p>
                  </div>
                  <button onClick={() => addMember(u.auth_id)} className="w-6 h-6 rounded-lg bg-[#111827] hover:bg-[#1f2937] text-white flex items-center justify-center transition-colors shrink-0">
                    <UserPlus size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-[11px] font-medium text-[#6b7280] uppercase tracking-wider">
          {members.length} membre{members.length !== 1 ? 's' : ''}
        </div>
        {members.map(m => {
          const p = m.members ?? {};
          const isSelf = m.user_id === currentUserId;
          return (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-[#f9fafb] group">
              <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-[10px] ${avatarColor(m.user_id)}`}>
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[12px] font-medium text-[#111827] truncate">{p.name ?? 'Inconnu'}</span>
                  {m.role === 'admin' && <span title="Admin" className="text-[10px]">👑</span>}
                  {isSelf && <span className="text-[9px] bg-gray-100 text-[#6b7280] font-medium px-1.5 py-0.5 rounded-full border border-gray-200">Vous</span>}
                </div>
                <p className="text-[10px] text-[#9ca3af] truncate">{p.email}</p>
              </div>
              {isAdmin && !isSelf && (
                <button onClick={() => removeMember(m.user_id)}
                  className="w-5 h-5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#9ca3af] flex items-center justify-center transition-all">
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE GROUP MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CreateGroupModal({ projectId, onClose, onCreated }) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    setCreating(true); setError('');
    try {
      const { data, error: err } = await supabase.rpc('create_discussion_group', { p_project_id: projectId, p_name: name.trim(), p_description: desc.trim() || null });
      if (err) throw err;
      onCreated(data);
    } catch (e) { setError(e.message); setCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl w-[400px] max-w-[95vw] border border-gray-200 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-[14px] font-semibold text-[#111827]">Nouveau groupe</h2>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-[#6b7280] uppercase tracking-wider mb-1.5">Nom du groupe *</label>
            <input autoFocus
              className="w-full rounded-lg border border-gray-200 bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all"
              placeholder="Ex : Équipe technique"
              value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#6b7280] uppercase tracking-wider mb-1.5">Description <span className="normal-case font-normal text-[#9ca3af]">(optionnel)</span></label>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all resize-none"
              placeholder="À quoi sert ce groupe ?"
              value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
          </div>
          {error && <p className="text-[12px] text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-3 py-2 text-[13px] text-[#374151] rounded-lg hover:bg-gray-100 transition-colors font-medium">Annuler</button>
          <button onClick={handleCreate} disabled={creating || !name.trim()}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#111827] hover:bg-[#1f2937] disabled:opacity-40 rounded-lg transition-colors">
            {creating ? 'Création…' : 'Créer le groupe'}
          </button>
        </div>
      </div>
    </div>
  );
}