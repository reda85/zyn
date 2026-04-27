'use client'

import { useEffect, useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, X, User, Loader2 } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useAtom } from 'jotai'
import { selectedProjectAtom } from '@/store/atoms'
import { useParams, useRouter } from 'next/navigation'
import { Lexend } from 'next/font/google'
import clsx from 'clsx'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' })

const PROJECT_TYPES = [
  'Architecture',
  'Construction',
  'Paysagisme',
  'Rénovation',
  'Autre'
]

export default function ProjectDetails() {
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState({ picture: false, logo: false })  // ── NEW
  const [uploadError, setUploadError] = useState(null)                          // ── NEW
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const { projectId } = useParams()
  const router = useRouter()
  const pictureInputRef = useRef(null)
  const logoInputRef = useRef(null)                                             // ── NEW

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) return
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (projectError) throw projectError
        setProject(projectData)

        const { data: membersData, error: membersError } = await supabase
          .from('members_projects')
          .select(`*, members ( id, email, name, avatar_url )`)
          .eq('project_id', projectId)

        if (membersError) throw membersError
        setMembers(membersData || [])
      } catch (error) {
        console.error('Error fetching project details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectDetails()
  }, [projectId])

  const handleSave = async () => {
    if (!project) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name:            project.name,
          address:         project.address,
          type:            project.type,
          picture_url:     project.picture_url,
          client_logo_url: project.client_logo_url,   // ── NEW
        })
        .eq('id', projectId)

      if (error) throw error

      if (selectedProject?.id === projectId) {
        setSelectedProject(project)
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving project:', error)
      setUploadError('Erreur lors de l\'enregistrement: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    setIsEditing(false)
    setUploadError(null)
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    if (projectData) setProject(projectData)
  }

  // ── Generic upload handler — used for both picture and logo ─────────────────
  const uploadToStorage = async (file, kind) => {
    if (!file || !isEditing) return

    setUploadError(null)
    setUploading(prev => ({ ...prev, [kind]: true }))

    try {
      // File validation
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Le fichier ne doit pas dépasser 10 MB')
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image')
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const folder  = kind === 'picture' ? 'project-pictures' : 'client-logos'
      const fileName = `${projectId}-${kind}-${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Upload to bucket "projects" (must exist & be public)
      const { error: uploadError } = await supabase.storage
        .from('projects')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('projects')
        .getPublicUrl(filePath)

      // Update local state — actual DB write happens on Save
      const fieldKey = kind === 'picture' ? 'picture_url' : 'client_logo_url'
      setProject(prev => ({ ...prev, [fieldKey]: publicUrl }))
    } catch (error) {
      console.error(`Error uploading ${kind}:`, error)
      setUploadError(`Erreur upload (${kind === 'picture' ? 'image' : 'logo'}): ${error.message}`)
    } finally {
      setUploading(prev => ({ ...prev, [kind]: false }))
    }
  }

  const handlePictureUpload = (e) => uploadToStorage(e.target.files?.[0], 'picture')
  const handleLogoUpload    = (e) => uploadToStorage(e.target.files?.[0], 'logo')

  const handleRemovePicture = () => {
    if (isEditing) setProject({ ...project, picture_url: null })
  }

  const handleRemoveLogo = () => {
    if (isEditing) setProject({ ...project, client_logo_url: null })
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background font-sans">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
              <span className="text-primary-foreground font-bold text-3xl font-heading">z</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold font-heading text-foreground mb-3">Chargement...</h2>
          <p className="text-muted-foreground">Veuillez patienter</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background font-sans">
        <div className="text-center">
          <p className="text-muted-foreground">Projet non trouvé</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx("min-h-screen bg-background font-sans", lexend.className)}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-4xl font-bold font-heading text-foreground mb-4">Détails du projet</h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            Gérez les informations principales de votre projet et visualisez les membres de l'équipe.
          </p>
        </div>

        {/* Error banner */}
        {uploadError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start justify-between gap-4">
            <p className="text-sm text-destructive font-medium">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="text-destructive hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Project Details */}
        <div className="space-y-6">
          {/* Action Buttons */}
          {!isEditing ? (
            <div className="flex justify-end">
              <Button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
              >
                Modifier
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="px-6 py-2.5 border-border/50 rounded-full font-medium hover:bg-secondary/80 transition-all"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploading.picture || uploading.logo}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          )}

          {/* Project Image */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-foreground mb-3">
              Image du projet
            </label>

            {project.picture_url ? (
              <div className="relative group">
                <img
                  src={project.picture_url}
                  alt={project.name}
                  className="w-full h-64 object-cover rounded-xl border border-border/50"
                />
                {isEditing && (
                  <>
                    <button
                      onClick={handleRemovePicture}
                      className="absolute top-3 right-3 p-2 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => pictureInputRef.current?.click()}
                      disabled={uploading.picture}
                      className="absolute bottom-3 right-3 px-3 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 disabled:opacity-100"
                    >
                      {uploading.picture ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Remplacer
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div
                onClick={() => isEditing && !uploading.picture && pictureInputRef.current?.click()}
                className={clsx(
                  "w-full h-64 border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center transition-all",
                  isEditing && !uploading.picture
                    ? "cursor-pointer hover:border-primary/50 hover:bg-secondary/30"
                    : "cursor-not-allowed opacity-60"
                )}
              >
                {uploading.picture ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary mb-3 animate-spin" />
                    <p className="text-muted-foreground font-medium">Téléchargement…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">
                      {isEditing ? 'Cliquez pour télécharger une image' : 'Aucune image'}
                    </p>
                    {isEditing && (
                      <p className="text-sm text-muted-foreground/70 mt-1">PNG, JPG jusqu'à 10MB</p>
                    )}
                  </>
                )}
              </div>
            )}

            <input
              ref={pictureInputRef}
              type="file"
              accept="image/*"
              onChange={handlePictureUpload}
              className="hidden"
              disabled={!isEditing}
            />
          </div>

          {/* Client Logo */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-foreground mb-3">
              Logo du client
            </label>
            <p className="text-sm text-muted-foreground mb-4">
              Apparaîtra sur la page de couverture des rapports en haut à droite.
            </p>

            {project.client_logo_url ? (
              <div className="relative group inline-block">
                <div className="bg-white border border-border/50 rounded-xl p-6 flex items-center justify-center" style={{ minWidth: 200, minHeight: 120 }}>
                  <img
                    src={project.client_logo_url}
                    alt="Logo client"
                    className="max-h-24 max-w-[200px] object-contain"
                  />
                </div>
                {isEditing && (
                  <>
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploading.logo}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5"
                    >
                      {uploading.logo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      Remplacer
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div
                onClick={() => isEditing && !uploading.logo && logoInputRef.current?.click()}
                className={clsx(
                  "w-full max-w-md h-32 border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center transition-all",
                  isEditing && !uploading.logo
                    ? "cursor-pointer hover:border-primary/50 hover:bg-secondary/30"
                    : "cursor-not-allowed opacity-60"
                )}
              >
                {uploading.logo ? (
                  <>
                    <Loader2 className="w-8 h-8 text-primary mb-2 animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Téléchargement…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {isEditing ? 'Cliquez pour télécharger le logo' : 'Aucun logo'}
                    </p>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground/70 mt-1">PNG transparent recommandé</p>
                    )}
                  </>
                )}
              </div>
            )}

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={!isEditing}
            />
          </div>

          {/* Project Name */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-foreground mb-3">Nom du projet</label>
            {isEditing ? (
              <Input
                value={project.name || ''}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                className="border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 font-medium"
                placeholder="Entrez le nom du projet"
              />
            ) : (
              <p className="text-foreground font-medium py-2">{project.name || '-'}</p>
            )}
          </div>

          {/* Project Address */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-foreground mb-3">Adresse</label>
            {isEditing ? (
              <Input
                value={project.address || ''}
                onChange={(e) => setProject({ ...project, address: e.target.value })}
                className="border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 font-medium"
                placeholder="Entrez l'adresse du projet"
              />
            ) : (
              <p className="text-foreground font-medium py-2">{project.address || '-'}</p>
            )}
          </div>

          {/* Project Type */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-foreground mb-3">Type de projet</label>
            {isEditing ? (
              <select
                value={project.type || ''}
                onChange={(e) => setProject({ ...project, type: e.target.value })}
                className="w-full px-4 py-2 border border-border/50 rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 font-medium text-foreground outline-none transition-all"
              >
                <option value="">Sélectionnez un type</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            ) : (
              <p className="text-foreground font-medium py-2">{project.type || '-'}</p>
            )}
          </div>

          {/* Project Members */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold font-heading text-foreground mb-4">
              Membres de l'équipe
            </h2>
            {members.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun membre dans ce projet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 bg-background/60 border border-border/50 rounded-xl"
                  >
                    {member.members?.avatar_url ? (
                      <img
                        src={member.members.avatar_url}
                        alt={member.members.name || member.members.email}
                        className="w-12 h-12 rounded-full object-cover border-2 border-border/50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-border/50 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {member.members?.name || member.members?.email || 'Utilisateur'}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.role || 'Membre'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}