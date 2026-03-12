import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mic, Shield, Heart, Sparkles, ChevronDown, Check, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CrisisFooter from "@/components/CrisisFooter";
import landingHero from "@/assets/landing-hero.jpg";
import preludeLogo from "@/assets/prelude-logo.png";
import PreludeBrand from "@/components/PreludeBrand";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/redirect-cancelled-by-user") {
        toast.error(`Sign-in failed: ${error.code || error.message}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <motion.div
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <img src={preludeLogo} alt="Prelude" className="h-10 w-10 rounded-full object-cover flex-shrink-0 shadow-soft" />
            <PreludeBrand size="lg" />
          </motion.div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex rounded-full px-5"
              onClick={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Sign In
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="rounded-full px-5"
              onClick={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Get Started
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section ref={heroRef} className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden">
        <motion.div className="absolute inset-0 z-0" style={{ y: heroY, scale: heroScale }}>
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
            <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 rounded-full bg-sage-light text-primary border-0 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              AI-Powered Therapy Prep
            </Badge>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight text-foreground mb-6"
          >
            Walk into therapy
            <br />
            <motion.span
              className="text-primary inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              knowing what to say
            </motion.span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl text-muted-foreground/80 leading-relaxed mb-10 max-w-lg mx-auto font-body"
          >
            A 10-minute voice conversation before each session. Surface what matters. Arrive prepared.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="lg"
              className="gap-2 px-8 group shadow-glow"
              onClick={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Start Your First Session
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="soft" size="lg" className="px-8" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              See How It Works
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={fadeUp}
            custom={4}
            className="mt-10 flex items-center justify-center gap-2 text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {["😊", "🧘", "💆", "🌱"].map((emoji, i) => (
                <motion.div
                  key={i}
                  className="h-8 w-8 rounded-full bg-sage-light border-2 border-background flex items-center justify-center text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                >
                  {emoji}
                </motion.div>
              ))}
            </div>
            <span className="text-xs ml-2">Loved by 500+ therapy-goers</span>
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
      <section id="how-it-works" className="py-24 px-6 bg-card/50">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="mb-4 text-xs uppercase tracking-widest text-primary border-primary/30">
                How it works
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl md:text-4xl font-semibold text-foreground">
              Every session counts more
            </motion.h2>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-3 gap-6"
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
                step: "01",
              },
              {
                icon: Heart,
                title: "Surface what matters",
                desc: "Your voice reveals what your mind might skip. Prelude catches the emotional weight you'd otherwise forget.",
                step: "02",
              },
              {
                icon: Shield,
                title: "Own your brief",
                desc: "Get a written summary in your own words. Review it, edit it, and walk into therapy holding it.",
                step: "03",
              },
            ].map((item, i) => (
              <motion.div key={item.title} variants={scaleIn} custom={i}>
                <Card className="h-full text-center border-border/40 bg-background shadow-soft hover:shadow-lifted hover:-translate-y-1.5 transition-all duration-500 group cursor-default rounded-2xl">
                  <CardHeader className="pb-4">
                    <div className="mx-auto relative">
                      <div className="h-14 w-14 rounded-2xl bg-sage-light flex items-center justify-center mb-2 group-hover:rotate-0 rotate-3 transition-transform duration-500">
                        <item.icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="absolute -top-2 -right-2 text-[10px] font-mono font-bold text-muted-foreground/40">{item.step}</span>
                    </div>
                    <CardTitle className="font-display text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">{item.desc}</CardDescription>
                  </CardContent>
                </Card>
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
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08 }}
              >
                <Star className="h-4 w-4 fill-primary text-primary" />
              </motion.div>
            ))}
          </div>
          <blockquote className="font-display text-2xl md:text-3xl italic text-foreground/80 leading-snug">
            "Prelude doesn't replace therapy. It clears the fog so that when you sit down with your therapist, you already know what you need to say."
          </blockquote>
          <Separator className="w-16 mx-auto mt-8 mb-4" />
          <p className="text-sm text-muted-foreground">— Sarah K., Prelude user</p>
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
            <motion.div variants={scaleIn} custom={0}>
              <Card className="h-full shadow-soft hover:shadow-lifted transition-all duration-300 border-border/60 rounded-2xl">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Free</CardTitle>
                  <CardDescription>Try Prelude</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-3xl font-display font-bold text-foreground">$0<span className="text-base font-normal text-muted-foreground">/month</span></div>
                  <ul className="space-y-3 text-sm text-foreground/80">
                    {["1 prep session per month", "Full brief generated", "30-day history"].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full rounded-full" onClick={handleSignIn} disabled={signingIn}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={scaleIn} custom={1}>
              <Card className="h-full shadow-glow hover:shadow-lifted transition-all duration-300 border-2 border-primary relative overflow-hidden rounded-2xl">
                <motion.div
                  className="absolute -top-px left-1/2 -translate-x-1/2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Badge className="rounded-b-full rounded-t-none px-4 py-1 bg-primary text-primary-foreground border-0">
                    Most popular
                  </Badge>
                </motion.div>
                <CardHeader className="pt-10">
                  <CardTitle className="font-display text-lg">Pro</CardTitle>
                  <CardDescription>Every session counts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-3xl font-display font-bold text-foreground">$14<span className="text-base font-normal text-muted-foreground">/month</span></div>
                  <ul className="space-y-3 text-sm text-foreground/80">
                    {[
                      "Unlimited prep sessions",
                      "Pattern tracking across weeks",
                      "Emotional trend chart",
                      "Full session history",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button variant="hero" className="w-full" onClick={handleSignIn} disabled={signingIn}>
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <motion.div
          className="container mx-auto max-w-xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Ready to make therapy count?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Your first session is free. No credit card required. Just your voice and 10 minutes.
          </p>
          <Button variant="hero" size="lg" className="gap-2 group shadow-glow" onClick={handleSignIn} disabled={signingIn}>
            Start Your First Session
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
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
