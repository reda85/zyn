import clsx from "clsx";
import Link from "next/link";
import { 
	Menu, 
	BarChart3, 
	TrendingUp, 
	ShieldCheck, 
	FileText, 
	Settings, 
	Sparkles, 
	ArrowRight,
	MapPin, 
	User 
} from "lucide-react";

export default function HomePage() {
	return (
		// Ajout de la classe 'dark' pour améliorer le contraste des animations du Hero
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 ">

			{/* Header (inchangé) */}
			<header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
				<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
							<span className="text-primary-foreground font-bold text-lg font-heading">z</span>
						</div>
						<span className="text-xl font-bold tracking-tight font-heading">zynspace</span>
					</div>

					<nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
						<a href="#" className="hover:text-foreground transition-colors">Fonctionnalités</a>
						<a href="#" className="hover:text-foreground transition-colors">Témoignages</a>
						<a href="#" className="hover:text-foreground transition-colors">Tarifs</a>
					</nav>

					<div className="flex items-center space-x-4">
						<Link
							href="/sign-in"
							className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Se connecter
						</Link>
						<button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95">
							Commencer
						</button>
						<button className="md:hidden p-2 text-muted-foreground hover:text-foreground">
							<Menu className="h-5 w-5" />
						</button>
					</div>
				</div>
			</header>

			<main className="pt-32 pb-16">
				{/* Hero Section (Classes de visibilité ajustées) */}
        
{/* Hero Section */}
{/* Hero Section */}
<section className="px-6 mb-32 relative overflow-hidden h-[600px] md:h-[700px] flex flex-col items-center justify-center">
  
  {/* Background animé "Grid & Nodes" */}
  <div className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
    {/* Grille de fond subtile */}
    <div className="absolute inset-0 [background-size:30px_30px] [background-image:linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)]"></div>
    
    {/* Points et lignes animées */}
    <div className="absolute inset-0">
      
      {/* Lignes de connexion */}
      <div className="absolute top-[10%] left-[10%] w-[35%] h-[40%] border-l-[3px] border-t-[3px] border-cyan-500/60 animate-draw-line"></div>
      <div className="absolute top-[30%] right-[8%] w-[37%] h-[40%] border-r-[3px] border-b-[3px] border-purple-500/60 animate-draw-line" style={{ animationDelay: '1s' }}></div>

      {/* Pins Animés (au lieu des points) */}
      <div className="absolute top-[10%] left-[10%] animate-pulse-slow-border">
        <MapPin className="w-6 h-6 text-cyan-400 fill-cyan-400/50 drop-shadow-lg" />
      </div>
      <div className="absolute top-[50%] left-[5%] animate-pulse-slow-border" style={{ animationDelay: '0.5s' }}>
        <MapPin className="w-6 h-6 text-blue-400 fill-blue-400/50 drop-shadow-lg" />
      </div>
      <div className="absolute bottom-[15%] right-[10%] animate-pulse-slow-border" style={{ animationDelay: '1s' }}>
        <MapPin className="w-6 h-6 text-purple-400 fill-purple-400/50 drop-shadow-lg" />
      </div>
      <div className="absolute top-[30%] right-[8%] animate-pulse-slow-border" style={{ animationDelay: '1.5s' }}>
        <MapPin className="w-6 h-6 text-pink-400 fill-pink-400/50 drop-shadow-lg" />
      </div>
      <div className="absolute top-[45%] left-[45%] animate-pulse-slow-border" style={{ animationDelay: '2s' }}>
        <MapPin className="w-6 h-6 text-indigo-400 fill-indigo-400/50 drop-shadow-lg" />
      </div>
    </div>
  </div>

  <div className="max-w-5xl mx-auto text-center relative z-10">
    {/* Badge */}
    <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-secondary-foreground text-xs font-medium mb-8 opacity-0 animate-fadeInUp backdrop-blur-sm">
      <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
      Nouveau : Documentation par IA
    </div>

    {/* Titre */}
    <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight mb-8 text-foreground leading-[1.1] opacity-0 animate-fadeInUp" style={{ animationDelay: '150ms' }}>
      Le suivi de chantier, <br className="hidden md:block" />
      <span className="text-muted-foreground">en toute simplicité.</span>
    </h1>

    {/* Paragraphe */}
    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
      Alignez vos équipes, réduisez les erreurs et augmentez vos marges avec la plateforme de gestion la plus intuitive du marché.
    </p>

    {/* Boutons */}
    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 opacity-0 animate-fadeInUp" style={{ animationDelay: '500ms' }}>
      <button className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-full text-lg font-medium hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20 flex items-center justify-center group active:scale-95">
        Essai gratuit
        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </button>
      <button className="w-full sm:w-auto px-8 py-4 bg-secondary text-secondary-foreground rounded-full text-lg font-medium hover:bg-secondary/80 transition-all hover:shadow-lg hover:shadow-secondary/20 active:scale-95">
        Voir la démo
      </button>
    </div>

    <p className="mt-6 text-sm text-muted-foreground opacity-0 animate-fadeInUp" style={{ animationDelay: '700ms' }}>
      Pas de carte bancaire requise · 14 jours offerts
    </p>
  </div>
</section>
		
				{/* Dashboard Preview (inchangé) */}
				<section className="px-6 mb-32">
					<div className="max-w-6xl mx-auto">
						<div className="relative rounded-2xl border border-border/50 bg-card shadow-2xl shadow-primary/5 overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-300 ring-1 ring-white/10">
							<div className="absolute top-0 w-full h-12 bg-muted/30 border-b border-border/50 flex items-center px-4 space-x-2 backdrop-blur-sm">
								<div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/50"></div>
								<div className="w-3 h-3 rounded-full bg-yellow-400/20 border border-yellow-400/50"></div>
								<div className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/50"></div>
							</div>

							<div className="pt-12 p-8 md:p-12 bg-gradient-to-b from-background to-muted/20">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
									{/* Stats Card */}
									<div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
										<div className="flex items-center justify-between mb-4">
											<h3 className="font-semibold text-sm text-muted-foreground font-heading">État du Projet</h3>
											<BarChart3 className="h-4 w-4 text-muted-foreground" />
										</div>
										<div className="space-y-4">
											<div className="space-y-2">
												<div className="flex justify-between text-sm">
													<span className="font-medium">Fondations</span>
													<span className="text-green-600">100%</span>
												</div>
												<div className="h-2 bg-secondary rounded-full overflow-hidden">
													<div className="h-full bg-primary w-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"></div>
												</div>
											</div>
											<div className="space-y-2">
												<div className="flex justify-between text-sm">
													<span className="font-medium">Charpente</span>
													<span className="text-primary">65%</span>
												</div>
												<div className="h-2 bg-secondary rounded-full overflow-hidden">
													<div className="h-full bg-primary w-[65%] shadow-[0_0_10px_rgba(var(--primary),0.3)]"></div>
												</div>
											</div>
										</div>
									</div>

									{/* Recent Activity */}
									<div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-sm md:col-span-2 hover:shadow-md transition-shadow">
										<div className="flex items-center justify-between mb-4">
											<h3 className="font-semibold text-sm text-muted-foreground font-heading">Mises à jour récentes</h3>
											<div className="flex -space-x-2">
												{[1, 2, 3].map((i) => (
													<div key={i} className="w-6 h-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
														U{i}
													</div>
												))}
											</div>
										</div>
										<div className="space-y-3">
											<div className="flex items-start space-x-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
												<div className="w-2 h-2 mt-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
												<div>
													<p className="text-sm font-medium">Inspection électrique validée</p>
													<p className="text-xs text-muted-foreground">À l'instant · par Sarah M.</p>
												</div>
											</div>
											<div className="flex items-start space-x-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
												<div className="w-2 h-2 mt-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
												<div>
													<p className="text-sm font-medium">Retard livraison toiture</p>
													<p className="text-xs text-muted-foreground">Il y a 2h · par Mike R.</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Features Grid (inchangé) */}
				<section className="px-6 py-24 bg-secondary/20">
					<div className="max-w-7xl mx-auto">
						<div className="text-center mb-16">
							<h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Tout ce qu'il faut pour mieux construire</h2>
							<p className="text-muted-foreground max-w-2xl mx-auto">Des fonctionnalités puissantes dans une interface simple.</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
							{[
								{ icon: TrendingUp, title: "Suivi en temps réel", desc: "Suivez chaque étape au moment où elle se produit." },
								{ icon: ShieldCheck, title: "Protection juridique", desc: "La documentation automatique vous protège." },
								{ icon: FileText, title: "Rapports instantanés", desc: "Générez des PDF complets en un clic." },
								{ icon: Settings, title: "Flux personnalisés", desc: "Adaptez l'outil à vos méthodes de travail." },
							].map((feature, i) => (
								<div key={i} className="bg-background p-6 rounded-xl border border-border/50 hover:border-primary/20 transition-all hover:shadow-lg hover:shadow-primary/5 group hover:-translate-y-1">
									<div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
										<feature.icon className="w-6 h-6" />
									</div>
									<h3 className="text-lg font-semibold font-heading mb-2">{feature.title}</h3>
									<p className="text-muted-foreground text-sm">{feature.desc}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Testimonial (inchangé) */}
				<section className="px-6 py-24">
					<div className="max-w-4xl mx-auto text-center">
						<div className="mb-8">
							<div className="flex justify-center space-x-1 mb-4">
								{[1, 2, 3, 4, 5].map((i) => (
									<Sparkles key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
								))}
							</div>
							<blockquote className="text-2xl md:text-3xl font-medium font-heading leading-relaxed text-foreground">
								"zynspace a transformé notre flux de travail. La documentation nous prend trois fois moins de temps, et nous sommes enfin alignés sur tous nos chantiers."
							</blockquote>
						</div>
						<div className="flex items-center justify-center space-x-4">
							<div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center font-bold text-muted-foreground border border-border">
								CS
							</div>
							<div className="text-left">
								<div className="font-semibold font-heading">Chris Surrey</div>
								<div className="text-sm text-muted-foreground">Architecte Senior, IKON Architects</div>
							</div>
						</div>
					</div>
				</section>

				{/* CTA Section (inchangé) */}
				<section className="px-6 py-24">
					<div className="max-w-5xl mx-auto bg-primary rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary/20">
						<div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
						<div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
						<div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

						<div className="relative z-10">
							<h2 className="text-4xl md:text-5xl font-bold font-heading text-primary-foreground mb-6">
								Prêt à optimiser vos chantiers ?
							</h2>
							<p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
								Rejoignez des milliers de professionnels de la construction qui font confiance à zynspace.
							</p>
							<button className="bg-background text-foreground px-8 py-4 rounded-full text-lg font-bold hover:bg-background/90 transition-all hover:scale-105 hover:shadow-xl active:scale-95">
								Commencer maintenant
							</button>
						</div>
					</div>
				</section>
			</main>

			{/* Footer (inchangé) */}
			<footer className="border-t border-border/40 bg-secondary/20">
				<div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center">
					<div className="flex items-center space-x-2 mb-4 md:mb-0">
						<div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
							<span className="text-primary-foreground font-bold text-xs font-heading">z</span>
						</div>
						<span className="font-bold font-heading">zynspace</span>
					</div>
					<div className="flex space-x-8 text-sm text-muted-foreground">
						<a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
						<a href="#" className="hover:text-foreground transition-colors">CGU</a>
						<a href="#" className="hover:text-foreground transition-colors">Twitter</a>
						<a href="#" className="hover:text-foreground transition-colors">GitHub</a>
					</div>
					<p className="text-sm text-muted-foreground mt-4 md:mt-0">
						&copy; {new Date().getFullYear()} zynspace.
					</p>
				</div>
			</footer>
		</div>
	)
}