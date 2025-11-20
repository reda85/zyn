import { signInAction } from "../../../app/actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import Link from "next/link";

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
            <span className="text-primary-foreground font-bold text-4xl font-heading">z</span>
          </div>
          <h2 className="text-5xl font-bold text-foreground leading-tight font-heading mb-6">
            Seamless Access to Your Account
          </h2>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Dive back into your personalized experience and manage your projects with ease.
          </p>
        </div>
      </div>

      {/* 2. SIGN-IN FORM SIDE (Right Half) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background relative">
        <div className="w-full max-w-md p-8 m-8">
          {/* Logo for smaller screens */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-2xl font-heading">z</span>
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-3 font-heading">Welcome back</h1>
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link
                className="text-primary font-medium hover:text-primary/80 transition-colors underline underline-offset-4"
                href="/sign-up"
              >
                Sign up
              </Link>
            </p>
          </div>

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
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                  <Link
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    href="/forgot-password"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  type="password"
                  name="password"
                  placeholder="Your password"
                  required
                  className="w-full bg-background border-input focus:ring-primary"
                />
              </div>
            </div>

            {/* Submit Button */}
            <SubmitButton
              pendingText="Signing In..."
              formAction={signInAction}
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
            >
              Sign in
            </SubmitButton>

            {/* Form Message */}
            <FormMessage message={searchParams} />
          </form>
        </div>
      </div>
    </div>
  );
}