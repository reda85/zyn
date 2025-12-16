import Image from "next/image";
import { signInAction } from "../../../app/actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import Link from "next/link";

const translateError = (error?: string) => {
  if (!error) return null;

  const map: Record<string, string> = {
    "Invalid login credentials": "Email ou mot de passe incorrect.",
    "Invalid email or password": "Email ou mot de passe incorrect.",
    "Email not confirmed": "Veuillez confirmer votre adresse email avant de vous connecter.",
    "Email not found": "Cet email n’existe pas dans notre système.",
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
      "Le service d’authentification est momentanément indisponible.",
    "Unexpected error occurred":
      "Une erreur inattendue s’est produite. Veuillez réessayer.",
  };

  return map[error] ?? "Une erreur s’est produite. Veuillez réessayer.";
};

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex min-h-screen w-screen overflow-hidden bg-background font-sans">

      {/* 1. BRANDING/LOGO SIDE (Left Half) */}
      <div className="hidden lg:flex flex-col w-1/2 bg-muted/30 items-center justify-center p-16 border-r border-border relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>

        <div className="text-center relative z-10 max-w-lg">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/20">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
          </div>
          <h2 className="text-5xl font-bold text-foreground leading-tight font-heading mb-6">
            Suivez vos chantiers en toute simplicité
          </h2>
          <p className="text-muted-foreground text-xl leading-relaxed font-sans">
            Connectez-vous pour accéder à votre tableau de bord et gérer vos projets efficacement.
          </p>
        </div>
      </div>

      {/* 2. SIGN-IN FORM SIDE (Right Half) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background relative">
        <div className="w-full max-w-md p-8 m-8">
          {/* Logo for smaller screens */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={24} height={24} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-3 font-heading">Bienvenue à Zaynspace</h1>
            <p className="text-muted-foreground">
              Vous n'avez pas de compte ?{" "}
              <Link
                className="text-primary font-medium hover:text-primary/80 transition-colors underline underline-offset-4"
                href="/sign-up"
              >
                Se connecter
              </Link>
            </p>
          </div>
 {searchParams?.error && (
            <div className="mb-6 w-full bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg">
              {translateError(searchParams.error)}
            </div>
          )}
          <form className="space-y-6">
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                <Input
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="w-full bg-background border-input focus:ring-primary"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">Mot de passe</Label>
                  <Link
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
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
                  className="w-full bg-background border-input focus:ring-primary"
                />
              </div>
            </div>

            {/* Submit Button */}
            <SubmitButton
              pendingText="Connexion..."
              formAction={signInAction}
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
            >
              Se connecter
            </SubmitButton>

            {/* Form Message */}
            <FormMessage message={searchParams} />
          </form>
        </div>
      </div>
    </div>
  );
}