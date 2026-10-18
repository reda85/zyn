// Clés de cache. Toute donnée rattachée à un projet porte son projectId dans
// la clé : changer de projet ne peut plus réafficher les données du précédent.
export const qk = {
  project: (projectId) => ['project', projectId],
  categories: (projectId) => ['categories', projectId],
  statuses: (projectId) => ['statuses', projectId],
  tags: (projectId) => ['tags', projectId],
  projectMembers: (projectId) => ['project-members', projectId],

  // Toutes les listes de pins commencent par 'pins' : c'est ce préfixe que
  // `usePinsCache` parcourt pour répercuter une modification partout.
  pinsRoot: ['pins'],
  planPins: (planId, scope) => ['pins', 'plan', planId, scope],
  projectPins: (projectId, scope, filters) => ['pins', 'project', projectId, scope, filters],
  pin: (pinId) => ['pin', pinId],

  mediasRoot: (projectId) => ['medias', projectId],
  medias: (projectId, scope, filters) => ['medias', projectId, scope, filters],

  projects: (organizationId, scope) => ['projects', organizationId, scope],
  discussionMessages: (groupId) => ['discussion-messages', groupId],
}
