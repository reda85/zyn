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
  'bg-violet-600','bg-blue-600','bg-emerald-600',
  'bg-amber-600','bg-rose-600','bg-cyan-600','bg-indigo-600',
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

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const SendIcon     = () => <Send size={18} />;
const PlusIcon     = () => <Plus size={18} strokeWidth={2.5} />;
const UsersIcon    = () => <Users size={17} />;
const XIcon        = () => <X size={16} strokeWidth={2.5} />;
const SearchIcon   = () => <Search size={15} />;
const UserPlusIcon = () => <UserPlus size={16} />;
const MsgIcon      = () => <MessageSquare size={20} />;

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
      const { data } = await supabase
        .from('pdf_pins')
        .select('category_id, status_id')
        .eq('id', item.item_id)
        .single();
      if (data) setPinData(data);
    };
    fetchPin();
  }, [item.item_id, item.item_type]);

  const handleClick = () => {
    if (item.item_type === 'pin') {
      window.open(`/${organizationId}/projects/${projectId}/tasks#pin-${item.item_id}`, '_blank');
    } else if (item.item_type === 'plan') {
      window.open(`/${organizationId}/projects/${projectId}/${item.item_id}`, '_blank');
    }
  };

  // For plans, show simple card
  if (item.item_type === 'plan') {
    return (
      <div
        onClick={handleClick}
        className={`flex items-center gap-2 mt-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
          isOwn ? 'bg-card/20' : 'bg-primary/5 text-primary'
        }`}
      >
        <span>🗺</span>
        <span>{item.label ?? item.item_id}</span>
      </div>
    );
  }

  // For pins, show circle with category icon + status color
  if (!pinData) return null;

  const statusColor = statuses.find(s => s.id === pinData.status_id)?.color || '#9CA3AF';
  const catIconKey = categories.find(c => c.id === pinData.category_id)?.icon || 'unassigned';
  const CategoryIcon = categoriesPinIcons[catIconKey];

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-2 mt-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
        isOwn ? 'bg-card/20' : 'bg-secondary/30'
      }`}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: statusColor }}
      >
        {CategoryIcon && <div className="w-3 h-3 text-white">{CategoryIcon}</div>}
      </div>
      <span className={isOwn ? 'text-white' : 'text-stone-900'}>{item.label ?? item.item_id}</span>
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
  
  const [groups, setGroups]           = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages]       = useState([]);
  const [unread, setUnread]           = useState({});
  const [lastMsgs, setLastMsgs]       = useState({});
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [loadingGroups, setLoadingGroups]   = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  
  // NEW: Image & linking state
  const [pendingImages, setPendingImages] = useState([]);
  const [pendingLinked, setPendingLinked] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const fileInputRef = useRef(null);

  const bottomRef  = useRef(null);
  const channelRef = useRef(null);
  const inputRef   = useRef(null);
  const channelsUnreadRef = useRef([]);

  // ── Fetch project ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id,created_at,name,plans(id,name)')
        .is('plans.deleted_at', null)
        .eq('id', projectId)
        .single();
      if (data) setProject(data);
    };
    if (projectId) fetchProject();
  }, [projectId]);

  // ── Load groups ───────────────────────────────────────────────────────────
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

      // Init last messages
      const lm = {};
      gs.forEach(g => {
        const arr = g.discussions_messages ?? [];
        if (arr.length) lm[g.id] = arr[arr.length - 1];
      });
      setLastMsgs(lm);

      // Unread counts
      const counts = {};
      await Promise.all(gs.map(async g => {
        const { data: n } = await supabase.rpc('get_discussion_unread', { p_group_id: g.id });
        counts[g.id] = n ?? 0;
      }));
      setUnread(counts);

      // Subscribe for live unread updates
      channelsUnreadRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsUnreadRef.current = gs.map(g =>
        supabase.channel(`unread_web:${g.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'discussions_messages', filter: `group_id=eq.${g.id}` },
            (payload) => {
              setLastMsgs(prev => ({ ...prev, [g.id]: { content: payload.new.content, created_at: payload.new.created_at } }));
              if (payload.new.user_id !== user?.id) {
                setUnread(prev => ({ ...prev, [g.id]: (prev[g.id] ?? 0) + 1 }));
              }
            })
          .subscribe()
      );
    } finally {
      setLoadingGroups(false);
    }
  }, [projectId, user?.id]);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => () => channelsUnreadRef.current.forEach(ch => supabase.removeChannel(ch)), []);

  // ── Select group ──────────────────────────────────────────────────────────
  const selectGroup = useCallback(async (group) => {
    setActiveGroup(group);
    setShowMembers(false);
    setPendingImages([]);
    setPendingLinked([]);
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('discussions_messages')
        .select('*, members(auth_id, name, avatar_url), discussions_attachments(*), discussions_linked_items(*)')
        .eq('group_id', group.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);
      setMessages(data ?? []);
      await supabase.rpc('mark_discussion_read', { p_group_id: group.id });
      setUnread(prev => ({ ...prev, [group.id]: 0 }));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!activeGroup) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`chat_web:${activeGroup.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'discussions_messages',
        filter: `group_id=eq.${activeGroup.id}`,
      }, async (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, { ...payload.new, members: null, discussions_attachments: [], discussions_linked_items: [] }];
        });
        const { data } = await supabase
          .from('discussions_messages')
          .select('*, members(auth_id, name, avatar_url), discussions_attachments(*), discussions_linked_items(*)')
          .eq('id', payload.new.id).single();
        if (data) setMessages(prev => prev.map(m => m.id === data.id ? data : m));
        await supabase.rpc('mark_discussion_read', { p_group_id: activeGroup.id });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [activeGroup?.id]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0 && pendingLinked.length === 0) || !activeGroup || sending) return;
    setSending(true);
    const content = input.trim();
    const images = [...pendingImages];
    const linked = [...pendingLinked];
    setInput('');
    setPendingImages([]);
    setPendingLinked([]);

    try {
      // Insert message
      const { data: msg, error: msgErr } = await supabase
        .from('discussions_messages')
        .insert({ group_id: activeGroup.id, user_id: user.id, content: content || null })
        .select()
        .single();
      
      if (msgErr) throw msgErr;

      // Upload images
      if (images.length > 0) {
        await Promise.all(images.map(async ({ file }) => {
          const ext = file.name.split('.').pop();
          const path = `${user.id}/${msg.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('discussions')
            .upload(path, file);
          
          if (!uploadErr) {
            const { data: publicUrl } = supabase.storage.from('discussions').getPublicUrl(path);
            await supabase.from('discussions_attachments').insert({
              message_id: msg.id,
              file_url: path,
              file_name: file.name,
              file_type: 'image',
              file_size: file.size,
              public_url: publicUrl.publicUrl,
            });
          }
        }));
      }

      // Insert linked items
      if (linked.length > 0) {
        await supabase.from('discussions_linked_items').insert(
          linked.map(l => ({ message_id: msg.id, item_type: l.item_type, item_id: l.item_id, label: l.label }))
        );
      }
    } catch (e) {
      console.error('Send failed:', e);
      setInput(content);
      setPendingImages(images);
      setPendingLinked(linked);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Image upload & linking handlers ───────────────────────────────────────
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImages(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePendingImage = (idx) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const removePendingLinked = (idx) => {
    setPendingLinked(prev => prev.filter((_, i) => i !== idx));
  };

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={clsx(outfit.className, "flex flex-col h-screen bg-background font-sans overflow-hidden")}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} />
      
      <div className="flex flex-1 overflow-hidden">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-card border-r border-border/50 flex flex-col shadow-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <MsgIcon />
            <span className="font-semibold text-stone-900 text-base tracking-tight">Discussions</span>
            {totalUnread > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-8 h-8 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-colors"
            title="Nouveau groupe"
          >
            <PlusIcon />
          </button>
        </div>

        {/* Group list */}
        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
          {loadingGroups ? (
            <div className="flex flex-col gap-1 p-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-6 text-center text-stone-500">
              <div className="w-12 h-12 rounded-2xl bg-secondary/30 flex items-center justify-center opacity-60"><MsgIcon /></div>
              <p className="text-sm">Aucune discussion</p>
              <button onClick={() => setShowCreate(true)} className="text-xs bg-primary text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
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
                className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-all border-l-[3px] ${
                  isActive
                    ? 'bg-primary/5 border-violet-700'
                    : 'border-transparent hover:bg-secondary/30'
                }`}
              >
                <div className={`w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center text-white font-bold text-sm ${avatarColor(g.id)}`}>
                  {initials(g.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm text-stone-900 truncate">{g.name}</span>
                    {lm && <span className="text-[10px] text-stone-500 shrink-0">{fmtTime(lm.created_at)}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-stone-500 truncate max-w-[150px]">
                      {lm?.content ?? <em className="not-italic text-stone-500">Aucun message</em>}
                    </span>
                    {count > 0 && (
                      <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
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

      {/* ── CHAT AREA ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-secondary/30">
        {!activeGroup ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-stone-500 p-10">
            <div className="w-20 h-20 rounded-3xl bg-secondary/30 flex items-center justify-center opacity-40">
              <MsgIcon />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-stone-900 mb-1">Sélectionnez une discussion</h3>
              <p className="text-sm">Choisissez un groupe ou créez-en un nouveau.</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors">
              + Nouveau groupe
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-card border-b border-border/50 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-xs ${avatarColor(activeGroup.id)}`}>
                  {initials(activeGroup.name)}
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-sm leading-tight">{activeGroup.name}</div>
                  {activeGroup.description && (
                    <div className="text-xs text-stone-500 mt-0.5">{activeGroup.description}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowMembers(v => !v)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  showMembers
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary/30 text-stone-900 hover:bg-secondary/50'
                }`}
              >
                <UsersIcon />
                Membres
              </button>
            </div>

            {/* Messages + input */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-gray-200">
                {loadingMessages ? (
                  <div className="flex flex-col gap-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className="h-11 w-48 rounded-2xl bg-secondary/50 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-stone-500/50 py-20">
                    <MsgIcon />
                    <p className="text-sm">Aucun message. Commencez la conversation !</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isOwn   = msg.user_id === user?.id;
                      const profile = msg.members;
                      const prevMsg = messages[idx - 1];
                      const showMeta = !isOwn && prevMsg?.user_id !== msg.user_id;
                      const images  = (msg.discussions_attachments ?? []).filter(a => a.file_type === 'image');
                      const linked  = msg.discussions_linked_items ?? [];

                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} mb-0.5`}>
                          {/* Avatar */}
                          {!isOwn && (
                            showMeta
                              ? <div className={`w-7 h-7 rounded-[9px] shrink-0 flex items-center justify-center text-white font-bold text-[11px] mb-0.5 ${avatarColor(msg.user_id)}`}>
                                  {initials(profile?.name ?? '?')}
                                </div>
                              : <div className="w-7 shrink-0" />
                          )}

                          {/* Bubble */}
                          <div className={`flex flex-col max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
                            {showMeta && (
                              <span className="text-[11px] font-semibold text-stone-500 mb-1 px-1">
                                {profile?.name ?? 'Inconnu'}
                              </span>
                            )}
                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              isOwn
                                ? 'bg-primary text-white rounded-br-md'
                                : 'bg-card text-stone-900 border border-border/50 rounded-bl-md'
                            }`}>
                              {msg.content && <p className="break-words">{msg.content}</p>}
                              
                              {/* Images */}
                              {images.map((att, i) => (
                                <img
                                  key={i}
                                  src={att.public_url}
                                  alt={att.file_name}
                                  className="mt-2 rounded-lg max-w-xs border border-border/50 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(att.public_url, '_blank')}
                                />
                              ))}

                              {/* Linked items */}
                              {linked.map((l, i) => (
                                <LinkedItem
                                  key={i}
                                  item={l}
                                  isOwn={isOwn}
                                  organizationId={organizationId}
                                  projectId={projectId}
                                />
                              ))}

                              <span className={`block text-[10px] mt-1 ${isOwn ? 'text-violet-200 text-right' : 'text-stone-500'}`}>
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
              <div className="flex flex-col bg-card border-t border-border/50">
                {/* Pending preview */}
                {(pendingImages.length > 0 || pendingLinked.length > 0) && (
                  <div className="px-5 py-3 border-b border-border/50 flex flex-wrap gap-2">
                    {pendingImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.preview} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-border/50" />
                        <button
                          onClick={() => removePendingImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {pendingLinked.map((l, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium group relative">
                        <span>{l.item_type === 'pin' ? '📌' : '🗺'}</span>
                        <span className="max-w-[120px] truncate">{l.label}</span>
                        <button
                          onClick={() => removePendingLinked(i)}
                          className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input controls */}
                <div className="flex items-end gap-3 px-5 py-3.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl bg-secondary/30 hover:bg-secondary/50 text-stone-500 hover:text-stone-900 flex items-center justify-center shrink-0 transition-colors"
                    title="Ajouter une image"
                  >
                    <ImageIcon size={18} />
                  </button>

                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="w-10 h-10 rounded-xl bg-secondary/30 hover:bg-secondary/50 text-stone-500 hover:text-stone-900 flex items-center justify-center shrink-0 transition-colors"
                    title="Lier une tâche ou un plan"
                  >
                    <LinkIcon size={18} />
                  </button>

                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Écrivez un message… (Entrée pour envoyer)"
                    rows={1}
                    className="flex-1 resize-none bg-secondary/30 border border-border/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder-gray-400 outline-none focus:border-primary/50 focus:bg-card transition-colors max-h-28 overflow-y-auto"
                  />
                  
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && pendingImages.length === 0 && pendingLinked.length === 0) || sending}
                    className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── MEMBERS PANEL ─────────────────────────────────────────────────── */}
      {showMembers && activeGroup && (
        <MembersPanel
          group={activeGroup}
          projectId={projectId}
          currentUserId={user?.id}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* ── CREATE MODAL ──────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateGroupModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={(g) => { setShowCreate(false); loadGroups().then(() => selectGroup(g)); }}
        />
      )}

      {/* ── LINK ITEM MODAL ───────────────────────────────────────────────── */}
      {showLinkModal && (
        <LinkItemModal
          projectId={projectId}
          organizationId={organizationId}
          onLink={(item) => {
            setPendingLinked(prev => [...prev, item]);
            setShowLinkModal(false);
          }}
          onClose={() => setShowLinkModal(false)}
        />
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
          const { data } = await supabase
            .from('pdf_pins')
            .select('id, name, pin_number, projects(project_number), pdf_name')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .order('pin_number', { ascending: false })
            .limit(50);
          setItems((data ?? []).map(p => ({
            id: p.id,
            label: `${p.projects?.project_number}-${p.pin_number}: ${p.name || 'Pin sans nom'}`,
            sublabel: p.pdf_name || '',
            type: 'pin',
          })));
        } else {
          const { data } = await supabase
            .from('plans')
            .select('id, name')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(50);
          setItems((data ?? []).map(p => ({
            id: p.id,
            label: p.name,
            type: 'plan',
          })));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [projectId, activeTab]);

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item) => {
    onLink({ item_type: item.type, item_id: item.id, label: item.label });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md rounded-xl border border-border/50 shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h3 className="font-bold text-stone-900 text-base">Lier un élément</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-secondary/30 hover:bg-secondary/50 flex items-center justify-center text-stone-500 transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50 bg-secondary/20">
          <button
            onClick={() => setActiveTab('pin')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'pin'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-stone-500 hover:text-stone-900 hover:bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin size={16} />
              <span>Tâches / Pins</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'plan'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-stone-500 hover:text-stone-900 hover:bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText size={16} />
              <span>Plans</span>
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder={`Rechercher ${activeTab === 'pin' ? 'une tâche' : 'un plan'}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary/30 border border-border/50 rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Items list */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-border/50 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-stone-500">Chargement...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-stone-500">
                Aucun{activeTab === 'pin' ? 'e tâche' : ' plan'} trouvé{activeTab === 'pin' ? 'e' : ''}
              </p>
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                  item.type === 'pin' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-600'
                }`}>
                  {item.type === 'pin' ? <MapPin size={16} /> : <FileText size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-stone-900 truncate">{item.label}</div>
                  {item.sublabel && (
                    <div className="text-xs text-stone-500 truncate mt-0.5">{item.sublabel}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function MembersPanel({ group, projectId, currentUserId, onClose }) {
  const [members, setMembers]           = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [isAdmin, setIsAdmin]           = useState(false);
  const timer = useRef(null);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('discussions_members')
      .select('*, members(auth_id, name, email, avatar_url)')
      .eq('group_id', group.id);
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
      const { data } = await supabase.from('members_projects')
        .select('member_id, members(id, auth_id, name, email, avatar_url)')
        .eq('project_id', projectId).limit(50);
      let results = (data ?? [])
        .map(r => ({ auth_id: r.members?.auth_id, name: r.members?.name, email: r.members?.email }))
        .filter(u => u.auth_id && !excludeIds.includes(u.auth_id));
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
    <aside className="w-64 shrink-0 bg-card border-l border-border/50 flex flex-col shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
        <span className="font-bold text-stone-900 text-sm">Membres</span>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-secondary/30 hover:bg-secondary/50 flex items-center justify-center text-stone-500 transition-colors">
          <XIcon />
        </button>
      </div>

      {isAdmin && (
        <div className="px-3 py-3 border-b border-border/50">
          <div className="flex items-center gap-2 bg-secondary/30 border border-border/50 rounded-xl px-3 py-2">
            <SearchIcon />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
              placeholder="Inviter…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searching && <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-violet-700 rounded-full animate-spin" />}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
              {searchResults.map(u => (
                <div key={u.auth_id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-[10px] ${avatarColor(u.auth_id)}`}>
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-stone-900 truncate">{u.name}</div>
                    <div className="text-[10px] text-stone-500 truncate">{u.email}</div>
                  </div>
                  <button onClick={() => addMember(u.auth_id)} className="w-6 h-6 rounded-lg bg-primary/10 hover:bg-violet-200 text-primary flex items-center justify-center transition-colors shrink-0">
                    <UserPlusIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
          {members.length} membre{members.length !== 1 ? 's' : ''}
        </div>
        {members.map(m => {
          const p = m.members ?? {};
          const isSelf = m.user_id === currentUserId;
          return (
            <div key={m.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary/30 group">
              <div className={`w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center text-white font-bold text-xs ${avatarColor(m.user_id)}`}>
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-stone-900 truncate">{p.name ?? 'Inconnu'}</span>
                  {m.role === 'admin' && <span title="Admin">👑</span>}
                  {isSelf && <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">Vous</span>}
                </div>
                <div className="text-[11px] text-stone-500 truncate">{p.email}</div>
              </div>
              {isAdmin && !isSelf && (
                <button
                  onClick={() => removeMember(m.user_id)}
                  className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-stone-500/50 flex items-center justify-center transition-all"
                >
                  <XIcon />
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
      const { data, error: err } = await supabase.rpc('create_discussion_group', {
        p_project_id: projectId,
        p_name: name.trim(),
        p_description: desc.trim() || null,
      });
      if (err) throw err;
      onCreated(data);
    } catch (e) { setError(e.message); setCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-[420px] max-w-[95vw] shadow-2xl overflow-hidden animate-[fadeUp_0.2s_ease]"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeUp 0.2s ease' }}
      >
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px) scale(.97) } to { opacity:1; transform:none } }`}</style>

        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h2 className="font-bold text-stone-900 text-base">Nouveau groupe</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary/30 hover:bg-secondary/50 flex items-center justify-center text-stone-500 transition-colors">
            <XIcon />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Nom du groupe *</label>
            <input
              autoFocus
              className="w-full border border-border/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 bg-secondary/30 outline-none focus:border-primary/50 focus:bg-card transition-colors"
              placeholder="Ex : Équipe technique"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">Description (optionnel)</label>
            <textarea
              className="w-full border border-border/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 bg-secondary/30 outline-none focus:border-primary/50 focus:bg-card transition-colors resize-none"
              placeholder="À quoi sert ce groupe ?"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-stone-900 bg-secondary/30 hover:bg-secondary/50 rounded-xl transition-colors">
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {creating ? 'Création…' : 'Créer le groupe'}
          </button>
        </div>
      </div>
    </div>
  );
}