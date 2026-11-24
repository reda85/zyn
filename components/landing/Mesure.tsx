"use client";
import Script from "next/script";

const ID = process.env.NEXT_PUBLIC_UMAMI_ID;
// Par défaut, relayé par notre domaine (next.config.js) : voir la réécriture /mesure/.
const SCRIPT = process.env.NEXT_PUBLIC_UMAMI_SCRIPT ?? "/mesure/script.js";
const HOTE = process.env.NEXT_PUBLIC_UMAMI_SCRIPT ? undefined : "/mesure";
// Les prévisualisations Vercel et le poste de développement ne sont pas comptés.
const DOMAINES = process.env.NEXT_PUBLIC_UMAMI_DOMAINES ?? "zaynspace.com,www.zaynspace.com";

/**
 * Mesure d'audience sans cookie (Umami) des pages publiques : accueil,
 * confidentialité, conditions, inscription. Jamais dans l'application connectée.
 * Les clics sur les boutons portent data-umami-event (clic-essai, clic-demo).
 */
export function Mesure() {
  if (!ID) return null;
  return <Script src={SCRIPT} data-website-id={ID} data-domains={DOMAINES} data-host-url={HOTE} strategy="afterInteractive" />;
}
