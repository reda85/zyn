import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx,js}",
    "./components/**/*.{ts,tsx,js}",
    "./app/**/*.{ts,tsx,js}",
    "./src/**/*.{ts,tsx,js}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
  outfit: ["var(--font-outfit)"],
  lexend: ["var(--font-lexend)"],
  sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
  geist: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
  mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
},
      colors: {
        // Palette ZaynSpace : papier calque, encre, mine de crayon, bleu de tirage.
        papier: 'var(--zs-papier)',
        encre: { DEFAULT: 'var(--zs-encre)', survol: 'var(--zs-encre-survol)' },
        mine: { DEFAULT: 'var(--zs-mine)', clair: 'var(--zs-mine-clair)' },
        trait: 'var(--zs-trait)',
        filet: { DEFAULT: 'var(--zs-filet)', fort: 'var(--zs-filet-fort)' },
        voile: 'var(--zs-voile)',
        survol: 'var(--zs-survol)',
        tirage: { DEFAULT: 'var(--zs-tirage)', fonce: 'var(--zs-tirage-fonce)', clair: 'var(--zs-tirage-clair)', pale: 'var(--zs-tirage-pale)' },
        alerte: { DEFAULT: 'var(--zs-alerte)', clair: 'var(--zs-alerte-clair)', pale: 'var(--zs-alerte-pale)' },
        valide: { DEFAULT: 'var(--zs-valide)', clair: 'var(--zs-valide-clair)', pale: 'var(--zs-valide-pale)' },
        'muted-foreground': 'hsl(var(--muted-foreground))', 
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      // Ombre douce des cartes de l'application mobile.
      boxShadow: {
        carte: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px -2px rgba(16, 24, 40, 0.06)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;