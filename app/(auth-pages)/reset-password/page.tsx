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

      {/* 1. BRANDING / LEFT SIDE */}
      <div className="hidden lg:flex flex-col w-1/2 bg-muted/30 items-center justify-center p-16 border-r border-border relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl mix-blend-multiply animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000" />

        <div className="relative z-10 text-center max-w-lg">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/20">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
          </div>
          <h2 className="text-5xl font-bold text-foreground leading-tight font-heading mb-6">
            Réinitialisez votre mot de passe
          </h2>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Choisissez un nouveau mot de passe sécurisé pour accéder à votre compte.
          </p>
        </div>
      </div>

      {/* 2. FORM / RIGHT SIDE */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background relative">
        <div className="w-full max-w-md p-8 m-8">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={24} height={24} />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-3 font-heading">
              Nouveau mot de passe
            </h1>
            <p className="text-muted-foreground">
            Modifiez votre mot de passe 
             
            </p>
          </div>

          {/* Messages */}
          {(searchParams?.error || searchParams?.success) && (
            <FormMessage message={searchParams as Message} />
          )}

          {/* Form */}
          <form className="space-y-6">
            <div className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
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
                <Label className="text-sm font-medium text-foreground">
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

            {/* Submit */}
            <SubmitButton
              formAction={resetPasswordAction}
              pendingText="Mise à jour..."
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
            >
              Réinitialiser le mot de passe
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
