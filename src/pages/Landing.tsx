import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import CrisisFooter from "@/components/CrisisFooter";
import heroBg from "@/assets/hero-bg.jpg";

const Landing = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-sm font-semibold">P</span>
            </div>
            <span className="font-display text-xl font-semibold text-foreground">Prelude</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="hero" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>
        <motion.div
          className="relative z-10 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-foreground mb-6">
            Walk into therapy
            <br />
            <span className="text-primary">knowing what to say</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto font-body">
            A 10-minute voice conversation before each session. Surface what matters. Arrive prepared.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button variant="hero" size="lg" className="gap-2 px-8">
                Start Your First Session
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="soft" size="lg" className="px-8">
                See How It Works
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-card/50">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            className="font-display text-3xl md:text-4xl font-semibold text-center mb-16 text-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Every session counts more
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Mic,
                title: "Speak freely",
                desc: "Talk through your week for 10 minutes. Prelude listens, reflects, and asks thoughtful questions.",
              },
              {
                icon: Heart,
                title: "Surface what matters",
                desc: "Your voice reveals what your mind might skip. Prelude catches the emotional weight you'd otherwise forget.",
              },
              {
                icon: Shield,
                title: "Own your brief",
                desc: "Get a written summary in your own words. Review it, edit it, and walk into therapy holding it.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-background shadow-soft"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <div className="h-12 w-12 rounded-full bg-sage-light flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote section */}
      <section className="py-20 px-6">
        <motion.div
          className="container mx-auto max-w-2xl text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <blockquote className="font-display text-2xl md:text-3xl italic text-foreground/80 leading-relaxed">
            "Prelude doesn't replace therapy. It clears the fog so that when you sit down with your therapist, you already know what you need to say."
          </blockquote>
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-card/50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4 text-foreground">
            Simple, honest pricing
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Less than a tenth of one therapy session to make all of them better.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-background p-8 shadow-soft">
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">Free</h3>
              <p className="text-muted-foreground text-sm mb-6">Try Prelude</p>
              <div className="text-3xl font-display font-bold text-foreground mb-6">$0<span className="text-base font-normal text-muted-foreground">/month</span></div>
              <ul className="space-y-3 text-sm text-foreground/80 mb-8">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> 1 prep session per month</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Full brief generated</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> 30-day history</li>
              </ul>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full rounded-full">Get Started</Button>
              </Link>
            </div>
            <div className="rounded-2xl border-2 border-primary bg-background p-8 shadow-glow relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                Most popular
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">Pro</h3>
              <p className="text-muted-foreground text-sm mb-6">Every session counts</p>
              <div className="text-3xl font-display font-bold text-foreground mb-6">$14<span className="text-base font-normal text-muted-foreground">/month</span></div>
              <ul className="space-y-3 text-sm text-foreground/80 mb-8">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Unlimited prep sessions</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Pattern tracking across weeks</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Emotional trend chart</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Full session history</li>
              </ul>
              <Link to="/dashboard">
                <Button variant="hero" className="w-full">Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 px-6 border-t border-border">
        <p className="text-center text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Prelude is a personal wellness tool, not a medical or clinical service. It does not provide therapy, diagnosis, or treatment. If you are experiencing a mental health crisis, please contact the{" "}
          <a href="https://988lifeline.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            988 Suicide &amp; Crisis Lifeline
          </a>{" "}
          — call or text 988.
        </p>
      </section>

      <CrisisFooter />
    </div>
  );
};

export default Landing;
