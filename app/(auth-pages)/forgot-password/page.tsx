import Image from "next/image";
import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className={`flex min-h-screen w-screen overflow-hidden bg-[#fafaf9] ${GeistSans.className}`}>

      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-white items-center justify-center p-16 border-r border-[#e5e5e2] relative overflow-hidden">
        <div className="text-center relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center mx-auto mb-8">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={40} height={40} />
          </div>
          <h2 className="text-[40px] font-medium text-[#050505] leading-tight tracking-[-0.02em] mb-6">
            Mot de passe oublié ?
          </h2>
          <p className="text-[#666660] text-[17px] leading-relaxed">
            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-[#fafaf9] relative">
        <div className="w-full max-w-md p-8 m-8">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-11 h-11 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center">
              <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={22} height={22} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-[24px] font-medium text-[#050505] mb-3 tracking-[-0.011em]">
              Réinitialiser le mot de passe
            </h1>
            <p className="text-[#8a8a84] text-[13px]">
              Vous vous souvenez de votre mot de passe ?{" "}
              <Link
                className="text-[#2f5ee0] font-medium hover:text-[#264dc2] transition-colors underline underline-offset-4"
                href="/sign-in"
              >
                Se connecter
              </Link>
            </p>
          </div>

          <form className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-medium text-[#0d0d0c]">
                  Email
                </Label>
                <Input
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="w-full h-9 bg-white border-[#e5e5e2] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0d0d0c] focus:ring-0"
                />
              </div>
            </div>

            <SubmitButton
              pendingText="Envoi en cours..."
              formAction={forgotPasswordAction}
              className="w-full bg-[#0d0d0c] text-white font-medium py-2.5 px-4 rounded-[4px] text-[13px] hover:bg-[#1a1a18] transition-colors"
            >
              Envoyer le lien
            </SubmitButton>

            <FormMessage message={searchParams} />
          </form>

          <p className="text-center text-[13px] text-[#8a8a84] mt-6">
            <Link
              href="/sign-in"
              className="text-[#2f5ee0] font-medium hover:text-[#264dc2] transition-colors underline underline-offset-4"
            >
              Retour à la connexion
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}