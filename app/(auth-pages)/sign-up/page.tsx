import { Lexend } from 'next/font/google';

// Initialize Lexend font (assuming local setup)
const lexend = Lexend({ subsets: ['latin'] });

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  // Handles displaying a final message after a successful action (like email confirmation link sent)
  if ("message" in searchParams) {
    return (
      <div className={`flex min-h-screen w-screen overflow-hidden ${lexend.className} items-center justify-center bg-gray-50 p-4`}>
        {/* Card for the message display */}
        <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-xl border border-gray-200">
          <FormMessage message={searchParams} />
          {/* Optional: Add a link back to sign-in */}
          <Link 
            href="/sign-in" 
            className="block mt-4 text-center text-teal-600 font-semibold hover:text-teal-700 underline transition duration-150"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Renders the main Sign Up form
  return (
    // FULL-WIDTH CONTAINER: Apply Lexend font
    <div className={`flex min-h-screen w-screen overflow-hidden ${lexend.className}`}> 
      
      {/* 1. BRANDING/LOGO SIDE (Left Half) - White Background */}
      <div className="hidden lg:flex flex-col w-1/2 bg-white items-center justify-center p-16 border-r border-gray-100">
        <div className="text-center">
          {/* Logo - Adjust size/className as needed */}
          <img 
            src="/logo.png" 
            alt="Company Logo" 
            className="w-56 h-auto mx-auto mb-6" 
          />
          <h2 className="text-5xl font-extrabold text-gray-900 leading-tight">
            Start Your Journey Today
          </h2>
          <p className="text-gray-600 mt-4 text-lg">
            Create an account in seconds and unlock all features.
          </p>
        </div>
      </div>

      {/* 2. SIGN-UP FORM SIDE (Right Half) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gray-50">
        <> 
          <form 
            className="flex flex-col w-full max-w-md p-8 bg-white rounded-lg shadow-xl border border-gray-200 m-8"
          >
            {/* Logo for smaller screens */}
            <div className="mb-8 lg:hidden flex justify-center">
              <img 
                src="/logo.png" 
                alt="Company Logo" 
                className="w-32 h-auto"
              />
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sign Up</h1>
            <p className="text-md text-gray-600 mb-8">
              Already have an account?{" "}
              <Link 
                className="text-teal-600 font-semibold hover:text-teal-700 transition duration-150 underline" 
                href="/sign-in"
              >
                Sign in
              </Link>
            </p>

            <div className="flex flex-col gap-5">
              
              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input 
                  name="email" 
                  placeholder="you@example.com" 
                  required 
                  className="mt-1 block w-full border-gray-300 focus:border-teal-500 focus:ring-teal-500 rounded-md shadow-sm"
                />
              </div>

              {/* Password Field */}
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <Input
                  type="password"
                  name="password"
                  placeholder="Create your password"
                  minLength={6}
                  required
                  className="mt-1 block w-full border-gray-300 focus:border-teal-500 focus:ring-teal-500 rounded-md shadow-sm"
                />
              </div>

              {/* Submit Button - Teal Styling */}
              <SubmitButton 
                formAction={signUpAction} 
                pendingText="Signing up..."
                className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-md hover:bg-teal-600 transition duration-150 mt-4 shadow-lg"
              >
                Sign up
              </SubmitButton>

              {/* Form Message */}
              <FormMessage message={searchParams} />
            </div>
          </form>
         
        </>
      </div>
    </div>
  );
}