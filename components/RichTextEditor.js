'use client'

import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextAlign } from '@tiptap/extension-text-align'
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight,
  Table as TableIcon, Trash2, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import './RichTextEditor.css'

const ToolbarButton = ({ onClick, active, disabled, children, title }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); onClick() }}
    disabled={disabled}
    title={title}
    className={clsx(
      'w-7 h-7 flex items-center justify-center rounded transition-all',
      active ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100 text-neutral-600',
      disabled && 'opacity-30 cursor-not-allowed',
    )}
  >
    {children}
  </button>
)

const Divider = () => <div className="w-px h-5 bg-neutral-200 mx-0.5" />

const HeadingDropdown = ({ editor }) => {
  const [open, setOpen] = React.useState(false)

  const items = [
    { label: 'Paragraphe', action: () => editor.chain().focus().setParagraph().run(), active: editor.isActive('paragraph') },
    { label: 'Titre 1',    action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), icon: Heading1 },
    { label: 'Titre 2',    action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), icon: Heading2 },
    { label: 'Titre 3',    action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), icon: Heading3 },
  ]

  const current = items.find(i => i.active)?.label || 'Paragraphe'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen(o => !o) }}
        className="h-7 px-2 flex items-center gap-1 rounded hover:bg-neutral-100 text-[12px] text-neutral-600"
      >
        {current}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
            {items.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={(e) => { e.preventDefault(); item.action(); setOpen(false) }}
                className={clsx(
                  'w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-neutral-50',
                  item.active && 'bg-neutral-100 font-medium',
                )}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const TableControls = ({ editor }) => {
  const [open, setOpen] = React.useState(false)
  const inTable = editor.isActive('table')

  if (!inTable) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen(o => !o) }}
        className="h-7 px-2 flex items-center gap-1 rounded hover:bg-neutral-100 text-[12px] bg-neutral-900 text-white"
      >
        Tableau
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px]">
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-neutral-50">Colonne avant</button>
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-neutral-50">Colonne après</button>
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-red-50 text-red-600">Supprimer colonne</button>
            <div className="h-px bg-neutral-200 my-1" />
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-neutral-50">Ligne avant</button>
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-neutral-50">Ligne après</button>
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-red-50 text-red-600">Supprimer ligne</button>
            <div className="h-px bg-neutral-200 my-1" />
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeaderRow().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-neutral-50">Basculer en-tête</button>
            <button type="button" onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); setOpen(false) }} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />Supprimer le tableau</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function RichTextEditor({ content, onChange, placeholder = 'Commencez à écrire...', minHeight = 150 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'rte-table' } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON())
    },
    editorProps: {
      attributes: { class: 'rte-content focus:outline-none' },
    },
    // TipTap v3 requires this for SSR / Next.js compatibility
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    const currentContent = JSON.stringify(editor.getJSON())
    const newContent = JSON.stringify(content || { type: 'doc', content: [{ type: 'paragraph' }] })
    if (currentContent !== newContent) {
      editor.commands.setContent(content || { type: 'doc', content: [{ type: 'paragraph' }] }, false)
    }
  }, [content, editor])

  useEffect(() => {
  if (!editor) return
  console.log('=== TipTap Diagnostic ===')
  console.log('Extensions loaded:', editor.extensionManager.extensions.map(e => e.name))
  console.log('Has insertTable command?', typeof editor.commands.insertTable === 'function')
  console.log('All commands:', Object.keys(editor.commands).sort())
}, [editor])

  if (!editor) return null

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-neutral-200 bg-neutral-50 flex-wrap">
        <HeadingDropdown editor={editor} />
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}      title="Gras"><Bold className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}    title="Italique"><Italic className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Souligné"><UnderlineIcon className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Liste à puces"><List className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Liste numérotée"><ListOrdered className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()}   active={editor.isActive({ textAlign: 'left' })}   title="Aligner à gauche"><AlignLeft className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrer"><AlignCenter className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()}  active={editor.isActive({ textAlign: 'right' })}  title="Aligner à droite"><AlignRight className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
       <ToolbarButton
  onClick={() => {
    console.log('=== Table Insert Click ===')
    console.log('Editor focused?', editor.isFocused)
    console.log('Current selection:', editor.state.selection)
    console.log('Document type:', editor.state.doc.type.name)
    console.log('isActive table?', editor.isActive('table'))

    const result = editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    console.log('Insert result:', result)
    console.log('Document after:', editor.state.doc.toJSON())
  }}
  disabled={editor.isActive('table')}
  title="Insérer un tableau"
>
  <TableIcon className="w-3.5 h-3.5" />
</ToolbarButton>
        <TableControls editor={editor} />
      </div>

      <div className="px-3 py-2.5" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

     
    </div>
  )
}