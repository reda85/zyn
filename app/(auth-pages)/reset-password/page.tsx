import Image from "next/image";
import { resetPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type SearchParams = {
  error?: string;
  success?: string;
};

export default function ResetPassword({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="flex min-h-screen w-screen overflow-hidden bg-background font-sans">

      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-muted/30 items-center justify-center p-16 border-r border-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl mix-blend-multiply animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000" />

        <div className="text-center relative z-10 max-w-lg">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/20">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
          </div>
          <h2 className="text-5xl font-bold text-foreground leading-tight font-heading mb-6">
            Réinitialisez votre mot de passe
          </h2>
          <p className="text-muted-foreground text-xl leading-relaxed font-sans">
            Choisissez un nouveau mot de passe sécurisé pour accéder à votre compte.
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background relative">
        <div className="w-full max-w-md p-8 m-8">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={24} height={24} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-3 font-heading">
              Nouveau mot de passe
            </h1>
            <p className="text-muted-foreground">
              Modifiez votre mot de passe ci-dessous.
            </p>
          </div>

          {/* Error message */}
          {searchParams?.error && (
            <div className="mb-6 w-full bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg">
              {searchParams.error}
            </div>
          )}

          {/* Success message */}
          {searchParams?.success && (
            <div className="mb-6 w-full bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg">
              {searchParams.success}
            </div>
          )}

          <form className="space-y-6">
            <div className="space-y-4">

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Nouveau mot de passe
                </Label>
                <Input
                  type="password"
                  name="password"
                  placeholder="Nouveau mot de passe"
                  required
                  className="w-full bg-background border-input focus:ring-primary"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirmer le mot de passe
                </Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirmer le mot de passe"
                  required
                  className="w-full bg-background border-input focus:ring-primary"
                />
              </div>

            </div>

            <SubmitButton
              formAction={resetPasswordAction}
              pendingText="Mise à jour..."
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
            >
              Réinitialiser le mot de passe
            </SubmitButton>

            {searchParams?.error && (
              <FormMessage message={{ error: searchParams.error }} />
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link
              href="/sign-in"
              className="text-primary font-medium hover:text-primary/80 transition-colors underline underline-offset-4"
            >
              Retour à la connexion
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}