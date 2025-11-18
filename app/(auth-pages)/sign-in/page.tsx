import { Lexend } from 'next/font/google';

// Initialize Lexend font (you might have this in your _app.tsx or layout.tsx already)
const lexend = Lexend({ subsets: ['latin'] });

import { signInAction } from "../../../app/actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import Link from "next/link";
// import Image from 'next/image'; // Uncomment if using Next.js Image component

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    // Ensure the container is truly screen-wide and overflow is handled
    <div className={`flex min-h-screen w-screen overflow-hidden ${lexend.className}`}> 
      
      {/* 1. BRANDING/LOGO SIDE (Left Half) */}
      <div className="hidden lg:flex flex-col w-1/2 bg-white items-center justify-center p-16 border-r border-gray-100">
        <div className="text-center">
          {/* Logo - Adjust size/className as needed */}
          <img 
            src="/logo.png" 
            alt="Company Logo" 
            className="w-56 h-auto mx-auto mb-6" 
          />
          <h2 className="text-5xl font-extrabold text-gray-900 leading-tight">
            Seamless Access to Your Account
          </h2>
          <p className="text-gray-600 mt-4 text-lg">
            Dive back into your personalized experience.
          </p>
        </div>
      </div>

      {/* 2. SIGN-IN FORM SIDE (Right Half) - Occupies full space on mobile, half on desktop */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gray-50">
        <form 
          className="flex flex-col w-full max-w-md p-8 bg-white rounded-lg shadow-xl border border-gray-200 m-8" // Added m-8 for safe spacing on small screens
        >
          {/* Logo for smaller screens */}
          <div className="mb-8 lg:hidden flex justify-center">
            <img 
              src="/logo.png" 
              alt="Company Logo" 
              className="w-32 h-auto"
            />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sign In</h1>
          <p className="text-md text-gray-600 mb-8">
            Don't have an account?{" "}
            <Link 
              className="text-teal-600 font-semibold hover:text-teal-700 transition duration-150 underline" 
              href="/sign-up"
            >
              Sign up
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

            {/* Password Field Header (Label + Forgot Link) */}
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <Link
                className="text-xs text-gray-500 hover:text-teal-600 transition duration-150 underline"
                href="/forgot-password"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Password Input */}
            <Input
              type="password"
              name="password"
              placeholder="Your password"
              required
              className="mt-1 block w-full border-gray-300 focus:border-teal-500 focus:ring-teal-500 rounded-md shadow-sm"
            />

            {/* Submit Button - Teal Styling */}
            <SubmitButton 
              pendingText="Signing In..." 
              formAction={signInAction}
              className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-md hover:bg-teal-600 transition duration-150 mt-6 shadow-lg"
            >
              Sign in
            </SubmitButton>

            {/* Form Message */}
            <FormMessage message={searchParams} />
          </div>
        </form>
      </div>
    </div>
  );
}