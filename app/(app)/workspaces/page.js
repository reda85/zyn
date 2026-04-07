'use client';
import { useRouter } from "next/navigation";
import { useEffect, use } from "react";
import { useUserData } from "@/hooks/useUserData";

export default function Workspaces({params}) {
    const {organizationId} = params;
    const { user, organization, isLoading } = useUserData(organizationId);
    const router = useRouter();
    
    useEffect(() => {
        if (isLoading) return;
        if (!user?.id) return;
        if (!organization?.id) return;
        router.push(`${organization.id}/projects/`);
    }, [isLoading, user?.id, organization?.id, router]);

    if (isLoading) {
        return <LoadingScreen message="Chargement du projet..." />;
    }

    if (!user?.id) {
        return (
            <ErrorScreen
                title="Session expirée"
                message="Votre session a expiré ou vous n'êtes pas connecté."
                action={{ label: "Se connecter", href: "/sign-in" }}
            />
        );
    }

    if (!organization?.id) {
        return (
            <ErrorScreen
                title="Organisation introuvable"
                message={`Aucune organisation trouvée pour l'identifiant "${organizationId}". Vous n'y avez peut-être pas accès.`}
                action={{ label: "Retour à l'accueil", href: "/" }}
            />
        );
    }

    return <LoadingScreen message={`Redirection vers votre espace de travail...`} />;
}

function LoadingScreen({ message }) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center font-sans">
            <div className="text-center">
                <div className="mb-8 flex justify-center">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
                        <span className="text-primary-foreground font-bold text-3xl font-heading">z</span>
                    </div>
                </div>
                <h2 className="text-2xl font-bold font-heading text-foreground mb-3 opacity-0 animate-fadeInUp">
                    {message}
                </h2>
                <p className="text-muted-foreground opacity-0 animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                    Veuillez patienter
                </p>
                <div className="mt-8 w-64 mx-auto">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite]"></div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes loading {
                    0% { width: 0%; margin-left: 0%; }
                    50% { width: 75%; margin-left: 0%; }
                    100% { width: 0%; margin-left: 100%; }
                }
            `}</style>
        </div>
    );
}

function ErrorScreen({ title, message, action }) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center font-sans">
            <div className="text-center max-w-md px-6">
                <div className="mb-8 flex justify-center">
                    <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center">
                        <span className="text-destructive font-bold text-3xl font-heading">!</span>
                    </div>
                </div>
                <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
                    {title}
                </h2>
                <p className="text-muted-foreground mb-8">
                    {message}
                </p>
                {action && (
                    
                    <a
                        href={action.href}
                        className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                        {action.label}
                    </a>
                )}
            </div>
        </div>
    );
}