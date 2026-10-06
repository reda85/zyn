import Image from "next/image";
import { signInAction } from "../../../app/actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";

type SearchParams = {
  error?: string;
  success?: string;
};

const translateError = (error?: string) => {
  if (!error) return null;

  const map: Record<string, string> = {
    "Invalid login credentials": "Email ou mot de passe incorrect.",
    "Invalid email or password": "Email ou mot de passe incorrect.",
    "Email not confirmed": "Veuillez confirmer votre adresse email avant de vous connecter.",
    "Email not found": "Cet email n'existe pas dans notre système.",
    "User not found": "Cet utilisateur n'existe pas.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
    "Invalid refresh token": "Votre session a expiré. Veuillez vous reconnecter.",
    "Token expired": "Votre lien ou code a expiré.",
    "OTP expired": "Le code de vérification a expiré.",
    "OTP code invalid": "Le code de vérification est invalide.",
    "Rate limit exceeded": "Trop de tentatives. Veuillez réessayer dans quelques instants.",
    "Over request limit": "Vous avez réalisé trop de demandes. Veuillez patienter.",
    "Service unavailable":
      "Le service d'authentification est momentanément indisponible.",
    "Unexpected error occurred":
      "Une erreur inattendue s'est produite. Veuillez réessayer.",
  };

  return map[error] ?? "Une erreur s'est produite. Veuillez réessayer.";
};

export default async function Login({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className={`flex min-h-screen w-screen overflow-hidden bg-[#fafaf9] ${GeistSans.className}`}>

      {/* 1. BRANDING SIDE (Left Half) */}
      <div className="hidden lg:flex flex-col w-1/2 bg-white items-center justify-center p-16 border-r border-[#e5e5e2] relative overflow-hidden">
        <div className="text-center relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center mx-auto mb-8">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={40} height={40} />
          </div>
          <h2 className="text-[40px] font-medium text-[#050505] leading-tight tracking-[-0.02em] mb-6">
            Suivez vos chantiers en toute simplicité
          </h2>
          <p className="text-[#666660] text-[17px] leading-relaxed">
            Connectez-vous pour accéder à votre tableau de bord et gérer vos projets efficacement.
          </p>
        </div>
      </div>

      {/* 2. SIGN-IN FORM SIDE (Right Half) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-[#fafaf9] relative">
        <div className="w-full max-w-md p-8 m-8">
          {/* Logo for smaller screens */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-11 h-11 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center">
              <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={22} height={22} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-[24px] font-medium text-[#050505] mb-3 tracking-[-0.011em]">Bienvenue à Zaynspace</h1>
            <p className="text-[#8a8a84] text-[13px]">
              Vous n'avez pas de compte ?{" "}
              <Link
                className="text-[#2f5ee0] font-medium hover:text-[#264dc2] transition-colors underline underline-offset-4"
                href="/sign-up"
              >
                Se connecter
              </Link>
            </p>
          </div>

          {searchParams?.error && (
            <div className="mb-6 w-full bg-[#fde8e8] border border-[#f5c6c6] text-[#9c1b1b] px-4 py-3 rounded-[4px] text-[13px]">
              {translateError(searchParams.error)}
            </div>
          )}

          <form className="space-y-6">
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-medium text-[#0d0d0c]">Email</Label>
                <Input
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="w-full h-9 bg-white border-[#e5e5e2] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] focus:ring-0"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[13px] font-medium text-[#0d0d0c]">Mot de passe</Label>
                  <Link
                    className="text-[12px] text-[#8a8a84] hover:text-[#2f5ee0] transition-colors"
                    href="/forgot-password"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input
                  type="password"
                  name="password"
                  placeholder="Votre mot de passe"
                  required
                  className="w-full h-9 bg-white border-[#e5e5e2] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] focus:ring-0"
                />
              </div>
            </div>

            {/* Submit Button */}
            <SubmitButton
              pendingText="Connexion..."
              formAction={signInAction}
              className="w-full bg-[#0d0d0c] text-white font-medium py-2.5 px-4 rounded-[4px] text-[13px] hover:bg-[#1a1a18] transition-colors"
            >
              Se connecter
            </SubmitButton>

            {/* Form Message */}
            {searchParams?.error && (
              <FormMessage
                message={{ error: searchParams.error }}
              />
            )}
          </form>
        </div>
      </div>
    </div>
  );
}