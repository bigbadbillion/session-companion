import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, Shield, Heart, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import CrisisFooter from "@/components/CrisisFooter";
import landingHero from "@/assets/landing-hero.jpg";
import preludeLogo from "@/assets/prelude-logo.png";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const Landing = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={preludeLogo} alt="Prelude" className="h-9 w-9 rounded-lg" />
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
      </motion.header>

      {/* Hero */}
      <section ref={heroRef} className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden">
        <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
          <img src={landingHero} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
        </motion.div>
        <motion.div
          className="relative z-10 max-w-2xl text-center"
          style={{ opacity: heroOpacity }}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp} custom={0} className="mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-sage-light px-3 py-1.5 rounded-full">
              <Sparkles className="h-3 w-3" />
              AI-Powered Therapy Prep
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-foreground mb-6"
          >
            Walk into therapy
            <br />
            <span className="text-primary">knowing what to say</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto font-body"
          >
            A 10-minute voice conversation before each session. Surface what matters. Arrive prepared.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button variant="hero" size="lg" className="gap-2 px-8 group">
                Start Your First Session
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="soft" size="lg" className="px-8">
                See How It Works
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-card/50">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-semibold text-foreground">
              Every session counts more
            </motion.h2>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
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
                className="flex flex-col items-center text-center p-8 rounded-2xl bg-background shadow-soft border border-border/50 hover:shadow-lifted hover:-translate-y-1 transition-all duration-300"
                variants={fadeUp}
                custom={i}
              >
                <div className="h-14 w-14 rounded-2xl bg-sage-light flex items-center justify-center mb-5 rotate-3 hover:rotate-0 transition-transform duration-300">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quote section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sage-light/30 via-transparent to-accent/20" />
        <motion.div
          className="container mx-auto max-w-2xl text-center relative z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="font-display text-6xl text-primary/20 mb-4">"</div>
          <blockquote className="font-display text-2xl md:text-3xl italic text-foreground/80 leading-relaxed -mt-8">
            Prelude doesn't replace therapy. It clears the fog so that when you sit down with your therapist, you already know what you need to say.
          </blockquote>
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-card/50">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Simple, honest pricing
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
              Less than a tenth of one therapy session to make all of them better.
            </motion.p>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-2 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} custom={0} className="rounded-2xl border border-border bg-background p-8 shadow-soft hover:shadow-lifted transition-shadow duration-300">
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
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="rounded-2xl border-2 border-primary bg-background p-8 shadow-glow relative hover:shadow-lifted transition-shadow duration-300">
              <motion.div
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                Most popular
              </motion.div>
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
            </motion.div>
          </motion.div>
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
