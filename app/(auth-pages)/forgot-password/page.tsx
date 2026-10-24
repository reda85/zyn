import Image from "next/image";
import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { outfit } from '@/lib/fonts';

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-papier ${outfit.className}`}>

      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-col w-1/2 h-full bg-white items-center justify-center p-16 border-r border-filet shrink-0">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 bg-encre rounded-[8px] flex items-center justify-center mx-auto mb-8">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={40} height={40} />
          </div>
          <h2 className="text-[40px] font-medium text-encre leading-tight tracking-[-0.02em] mb-6">
            Mot de passe oublié ?
          </h2>
          <p className="text-mine text-[17px] leading-relaxed">
            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex w-full lg:w-1/2 h-full items-center justify-center overflow-y-auto">
        <div className="w-full max-w-md px-8 py-12">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-11 h-11 bg-encre rounded-[8px] flex items-center justify-center">
              <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={22} height={22} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-[24px] font-medium text-encre mb-3 tracking-[-0.011em]">
              Réinitialiser le mot de passe
            </h1>
            <p className="text-mine-clair text-[14px]">
              Vous vous souvenez de votre mot de passe ?{" "}
              <Link
                className="text-tirage font-medium hover:text-tirage-fonce transition-colors underline underline-offset-4"
                href="/sign-in"
              >
                Se connecter
              </Link>
            </p>
          </div>

          <form className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[14px] font-medium text-encre">
                  Email
                </Label>
                <Input
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="w-full h-9 bg-white border-filet rounded-[8px] text-[14px] focus:outline-none focus:border-encre focus:ring-0"
                />
              </div>
            </div>

            <SubmitButton
              pendingText="Envoi en cours..."
              formAction={forgotPasswordAction}
              className="w-full flex items-center justify-center gap-2 bg-encre text-white font-medium py-2.5 px-4 rounded-[8px] text-[14px] hover:bg-encre-survol transition-colors"
            >
              Envoyer le lien
            </SubmitButton>

            <FormMessage message={searchParams} />
          </form>

          <p className="text-center text-[14px] text-mine-clair mt-6">
            <Link
              href="/sign-in"
              className="text-tirage font-medium hover:text-tirage-fonce transition-colors underline underline-offset-4"
            >
              Retour à la connexion
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}