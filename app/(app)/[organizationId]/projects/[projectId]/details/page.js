'use client'

import { useEffect, useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, X, User, Loader2 } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/data/keys'
import { useParams, useRouter } from 'next/navigation'
import { GeistSans } from 'geist/font/sans';
import clsx from 'clsx'
import Image from 'next/image'

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
  const [uploading, setUploading] = useState({ picture: false, logo: false })
  const [uploadError, setUploadError] = useState(null)
  const queryClient = useQueryClient()
  const { projectId } = useParams()
  const router = useRouter()
  const pictureInputRef = useRef(null)
  const logoInputRef = useRef(null)

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
          client_logo_url: project.client_logo_url,
        })
        .eq('id', projectId)

      if (error) throw error

      // Le nom et les logos sont affichés ailleurs (barre de navigation, liste des projets).
      queryClient.invalidateQueries({ queryKey: qk.project(projectId) })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
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
      <div className={clsx("flex h-screen w-full items-center justify-center bg-papier", GeistSans.className)}>
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-12 h-12 bg-encre rounded-[8px] flex items-center justify-center animate-pulse">
               <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
            </div>
          </div>
          <h2 className="text-[17px] font-medium text-encre mb-2">Chargement...</h2>
          <p className="text-[14px] text-mine-clair">Veuillez patienter</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className={clsx("flex h-screen w-full items-center justify-center bg-papier", GeistSans.className)}>
        <div className="text-center">
          <p className="text-[14px] text-mine-clair">Projet non trouvé</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx("min-h-screen bg-papier", GeistSans.className)}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 px-3 py-1.5 bg-voile text-mine rounded-[8px] text-[14px] font-medium hover:bg-filet transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre mb-2">Détails du projet</h1>
          <p className="text-[14px] text-mine leading-relaxed max-w-2xl">
            Gérez les informations principales de votre projet et visualisez les membres de l'équipe.
          </p>
        </div>

        {/* Error banner */}
        {uploadError && (
          <div className="mb-6 p-4 bg-alerte-pale border border-alerte-clair rounded-[8px] flex items-start justify-between gap-4">
            <p className="text-[14px] text-alerte font-medium">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="text-alerte hover:opacity-70">
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
                className="px-4 py-2 bg-encre text-white rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors"
              >
                Modifier
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="px-4 py-2 border-filet rounded-[8px] text-[14px] font-medium text-mine hover:bg-survol transition-colors"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploading.picture || uploading.logo}
                className="px-4 py-2 bg-encre text-white rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          )}

          {/* Project Image */}
          <div className="bg-white border border-filet rounded-[12px] p-6 shadow-carte">
            <label className="block text-[14px] font-medium text-encre mb-3">
              Image du projet
            </label>

            {project.picture_url ? (
              <div className="relative group">
                <img
                  src={project.picture_url}
                  alt={project.name}
                  className="w-full h-64 object-cover rounded-[8px] border border-filet"
                />
                {isEditing && (
                  <>
                    <button
                      onClick={handleRemovePicture}
                      className="absolute top-3 right-3 p-2 bg-alerte text-white rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => pictureInputRef.current?.click()}
                      disabled={uploading.picture}
                      className="absolute bottom-3 right-3 px-3 py-2 bg-encre text-white rounded-[6px] text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 disabled:opacity-100"
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
                  "w-full h-64 border-2 border-dashed border-filet rounded-[8px] flex flex-col items-center justify-center transition-colors",
                  isEditing && !uploading.picture
                    ? "cursor-pointer hover:border-filet-fort hover:bg-survol"
                    : "cursor-not-allowed opacity-60"
                )}
              >
                {uploading.picture ? (
                  <>
                    <Loader2 className="w-10 h-10 text-mine-clair mb-3 animate-spin" />
                    <p className="text-[14px] text-mine-clair font-medium">Téléchargement…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-trait mb-3" />
                    <p className="text-[14px] text-mine-clair font-medium">
                      {isEditing ? 'Cliquez pour télécharger une image' : 'Aucune image'}
                    </p>
                    {isEditing && (
                      <p className="text-[12px] text-trait mt-1">PNG, JPG jusqu'à 10MB</p>
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
          <div className="bg-white border border-filet rounded-[12px] p-6 shadow-carte">
            <label className="block text-[14px] font-medium text-encre mb-3">
              Logo du client
            </label>
            <p className="text-[14px] text-mine-clair mb-4">
              Apparaîtra sur la page de couverture des rapports en haut à droite.
            </p>

            {project.client_logo_url ? (
              <div className="relative group inline-block">
                <div className="bg-white border border-filet rounded-[12px] p-6 flex items-center justify-center shadow-carte" style={{ minWidth: 200, minHeight: 120 }}>
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
                      className="absolute top-2 right-2 p-1.5 bg-alerte text-white rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploading.logo}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-encre text-white rounded-[6px] text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
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
                  "w-full max-w-md h-32 border-2 border-dashed border-filet rounded-[8px] flex flex-col items-center justify-center transition-colors",
                  isEditing && !uploading.logo
                    ? "cursor-pointer hover:border-filet-fort hover:bg-survol"
                    : "cursor-not-allowed opacity-60"
                )}
              >
                {uploading.logo ? (
                  <>
                    <Loader2 className="w-7 h-7 text-mine-clair mb-2 animate-spin" />
                    <p className="text-[13px] text-mine-clair font-medium">Téléchargement…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-trait mb-2" />
                    <p className="text-[13px] text-mine-clair font-medium">
                      {isEditing ? 'Cliquez pour télécharger le logo' : 'Aucun logo'}
                    </p>
                    {isEditing && (
                      <p className="text-[12px] text-trait mt-1">PNG transparent recommandé</p>
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
          <div className="bg-white border border-filet rounded-[12px] p-6 shadow-carte">
            <label className="block text-[14px] font-medium text-encre mb-3">Nom du projet</label>
            {isEditing ? (
              <Input
                value={project.name || ''}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                className="border-filet bg-white focus:outline-none focus:border-encre focus:ring-0 font-medium text-[14px]"
                placeholder="Entrez le nom du projet"
              />
            ) : (
              <p className="text-encre font-medium py-2 text-[14px]">{project.name || '-'}</p>
            )}
          </div>

          {/* Project Address */}
          <div className="bg-white border border-filet rounded-[12px] p-6 shadow-carte">
            <label className="block text-[14px] font-medium text-encre mb-3">Adresse</label>
            {isEditing ? (
              <Input
                value={project.address || ''}
                onChange={(e) => setProject({ ...project, address: e.target.value })}
                className="border-filet bg-white focus:outline-none focus:border-encre focus:ring-0 font-medium text-[14px]"
                placeholder="Entrez l'adresse du projet"
              />
            ) : (
              <p className="text-encre font-medium py-2 text-[14px]">{project.address || '-'}</p>
            )}
          </div>

          {/* Project Type */}
          <div className="bg-white border border-filet rounded-[12px] p-6 shadow-carte">
            <label className="block text-[14px] font-medium text-encre mb-3">Type de projet</label>
            {isEditing ? (
              <select
                value={project.type || ''}
                onChange={(e) => setProject({ ...project, type: e.target.value })}
                className="w-full px-3 py-2 border border-filet rounded-[8px] bg-white focus:outline-none focus:border-encre font-medium text-[14px] text-encre transition-colors"
              >
                <option value="">Sélectionnez un type</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            ) : (
              <p className="text-encre font-medium py-2 text-[14px]">{project.type || '-'}</p>
            )}
          </div>

          {/* Project Members */}
          <div className="bg-white border border-filet rounded-[12px] p-6 shadow-carte">
            <h2 className="text-[17px] font-medium text-encre mb-4">
              Membres de l'équipe
            </h2>
            {members.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-10 h-10 text-filet-fort mx-auto mb-3" />
                <p className="text-[14px] text-mine-clair">Aucun membre dans ce projet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-survol border border-filet rounded-[8px]"
                  >
                    {member.members?.avatar_url ? (
                      <img
                        src={member.members.avatar_url}
                        alt={member.members.name || member.members.email}
                        className="w-10 h-10 rounded-full object-cover border border-filet"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-voile border border-filet flex items-center justify-center">
                        <User className="w-5 h-5 text-mine-clair" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-encre text-[14px]">
                        {member.members?.name || member.members?.email || 'Utilisateur'}
                      </p>
                      <p className="text-[13px] text-mine-clair">{member.role || 'Membre'}</p>
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