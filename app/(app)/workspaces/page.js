'use client';
import { useRouter } from "next/navigation";
import { useEffect, use } from "react";
import { useUserData } from "@/hooks/useUserData";
import { GeistSans } from 'geist/font/sans';
import clsx from "clsx";
import Image from "next/image";

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

    return <LoadingScreen message="Redirection vers votre espace de travail..." />;
}

function LoadingScreen({ message }) {
    return (
        <div className={clsx("flex h-screen w-full items-center justify-center bg-[#fafaf9]", GeistSans.className)}>
            <div className="text-center">
                <div className="mb-6 flex justify-center">
                    <div className="w-12 h-12 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center animate-pulse">
                        <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
                    </div>
                </div>
                <h2 className="text-[17px] font-medium text-[#050505] mb-2">
                    Chargement...
                </h2>
                <p className="text-[13px] text-[#8a8a84]">
                    {message}
                </p>
                <div className="mt-8 w-64 mx-auto">
                    <div className="h-1 bg-[#eeeeec] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0d0d0c] w-0 animate-[loading_1.5s_ease-in-out_infinite]"></div>
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
        <div className={clsx("min-h-screen bg-[#fafaf9] flex items-center justify-center", GeistSans.className)}>
            <div className="text-center max-w-md px-6">
                <div className="mb-6 flex justify-center">
                    <div className="w-12 h-12 bg-[#fde8e8] rounded-[4px] flex items-center justify-center">
                        <span className="text-[#dc2626] font-medium text-xl">!</span>
                    </div>
                </div>
                <h2 className="text-[17px] font-medium text-[#050505] mb-2">
                    {title}
                </h2>
                <p className="text-[13px] text-[#8a8a84] mb-8 leading-relaxed">
                    {message}
                </p>
                {action && (
                    
                    <a
                        href={action.href}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-[4px] bg-[#0d0d0c] text-white font-medium text-[13px] hover:bg-[#1a1a18] transition-colors"
                    >
                        {action.label}
                    </a>
                )}
            </div>
        </div>
    );
}