import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Shield, Loader2, AlertTriangle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CrisisFooter from "@/components/CrisisFooter";
import PreludeBrand from "@/components/PreludeBrand";
import preludeLogo from "@/assets/prelude-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceSession } from "@/hooks/useVoiceSession";

const DISCLAIMER_TEXT =
  "Prelude is a personal wellness tool, not a medical or clinical service. It does not provide therapy, diagnosis, or treatment. If you are experiencing a mental health crisis, please contact the 988 Suicide & Crisis Lifeline — call or text 988.";

const Session = () => {
  const navigate = useNavigate();
  const { user, sendEmailVerificationForCurrentUser, reloadUser } = useAuth();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const isEmailProvider = user?.providerData?.some((p) => p.providerId === "password");
  const needsEmailVerification = isEmailProvider && user && !user.emailVerified;

  const patientName = user?.displayName?.split(" ")[0] ?? "there";

  const session = useVoiceSession({
    patientId: user?.uid,
    patientName,
  });

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const progressPct = Math.min((session.elapsed / 600) * 100, 100);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.transcript.length]);

  const handleStart = async () => {
    await session.startSession();
  };

  const handleEndSession = async () => {
    const brief = await session.endSession();
    if (brief) {
      sessionStorage.setItem("prelude-brief", JSON.stringify(brief));
      navigate("/brief/latest");
    } else {
      navigate("/dashboard");
    }
  };

  // ── Email verification required (email/password sign-ups) ──────────────

  if (needsEmailVerification) {
    const handleResend = async () => {
      setResendLoading(true);
      try {
        await sendEmailVerificationForCurrentUser();
        const { toast } = await import("sonner");
        toast.success("Verification email sent. Check your inbox.");
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        const { toast } = await import("sonner");
        toast.error(err.code === "auth/too-many-requests" ? "Too many attempts. Wait a few minutes." : err.message ?? "Could not send.");
      } finally {
        setResendLoading(false);
      }
    };
    const handleReload = async () => {
      setReloadLoading(true);
      try {
        await reloadUser();
      } finally {
        setReloadLoading(false);
      }
    };
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            className="max-w-lg w-full"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="shadow-lifted border-border/60 rounded-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Verify your email first</CardTitle>
                    <CardDescription>We need to confirm your email before you can start a voice session.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Check your inbox for a verification link from Prelude. Click it, then come back and tap &quot;I&apos;ve verified&quot; to continue.
                </p>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full gap-2" onClick={handleResend} disabled={resendLoading}>
                    {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Resend verification email
                  </Button>
                  <Button variant="hero" className="w-full gap-2" onClick={handleReload} disabled={reloadLoading}>
                    {reloadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    I&apos;ve verified — continue
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard")}>
                    Go back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <CrisisFooter />
      </div>
    );
  }

  // ── Disclaimer screen ──────────────────────────────────────────────────

  if (!disclaimerAccepted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            className="max-w-lg w-full"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="shadow-lifted border-border/60 rounded-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                    <Shield className="h-5 w-5 text-earth" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Before we begin</CardTitle>
                    <CardDescription>Your safety matters most</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-foreground/80 leading-relaxed">{DISCLAIMER_TEXT}</p>
                <div className="space-y-3">
                  <Button variant="hero" className="w-full" onClick={() => setDisclaimerAccepted(true)}>
                    I understand — start session
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard")}>
                    Go back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <CrisisFooter />
      </div>
    );
  }

  // ── Error screen ────────────────────────────────────────────────────────

  if (session.status === "error") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            className="max-w-lg w-full text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {session.errorMessage ?? "An unexpected error occurred. Please try again."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="hero" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                Go Back
              </Button>
            </div>
          </motion.div>
        </div>
        <CrisisFooter />
      </div>
    );
  }

  // ── Brief generation screen ─────────────────────────────────────────────

  if (session.status === "ended" && session.isGeneratingBrief) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="h-16 w-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-6"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </motion.div>
            <h2 className="font-display text-xl font-semibold mb-2">Preparing your brief</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Taking everything we talked about and putting it together for your therapist...
            </p>
          </motion.div>
        </div>
        <CrisisFooter />
      </div>
    );
  }

  // ── Main session UI ─────────────────────────────────────────────────────

  const isActive = session.status === "active";
  const isConnecting = session.status === "connecting";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Session header */}
      <header className="border-b border-border bg-background/90 backdrop-blur-xl px-6 py-3">
        <div className="container mx-auto max-w-3xl flex items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src={preludeLogo} alt="" className="h-8 w-8 rounded-lg object-contain flex-shrink-0" />
            <PreludeBrand size="sm" />
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {/* On mobile: status dot after timer to avoid overlapping "Prelude" (order-3 md:order-1) */}
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 order-3 md:order-1"
              animate={isActive ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <Badge variant="secondary" className="font-normal text-xs order-1 md:order-2">
              {isConnecting
                ? "Connecting..."
                : session.isAgentThinking
                  ? "Reflecting…"
                  : isActive
                    ? "Listening..."
                    : "Ready"}
            </Badge>
            <span className="text-sm text-muted-foreground font-mono order-2 md:order-3">
              {formatTime(session.elapsed)} / 10:00
            </span>
            {(isActive || isConnecting) && (
              <Button variant="ghost" size="sm" onClick={handleEndSession} className="text-muted-foreground order-4">
                <X className="h-4 w-4 mr-1" /> End
              </Button>
            )}
          </div>
        </div>
        <div className="container mx-auto max-w-3xl mt-2">
          <Progress value={progressPct} className="h-1" />
        </div>
      </header>

      {/* Main session area */}
      <div className="flex-1 flex flex-col container mx-auto max-w-3xl px-6 py-8">
        {session.status === "idle" ? (
          /* ── Tap to begin ────────────────────────────────────────── */
          <motion.div
            className="flex-1 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative cursor-pointer mb-8"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-sage-light"
                animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                style={{ width: 96, height: 96 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-sage-light"
                animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                style={{ width: 96, height: 96 }}
              />
              <div className="relative h-24 w-24 rounded-full bg-sage-light flex items-center justify-center">
                <motion.div
                  className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-glow"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <Mic className="h-7 w-7 text-primary-foreground" />
                </motion.div>
              </div>
            </motion.div>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Tap to begin</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              We'll talk for about 10 minutes. Say whatever comes to mind — there are no wrong answers.
            </p>
          </motion.div>
        ) : isConnecting ? (
          /* ── Connecting state ────────────────────────────────────── */
          <motion.div
            className="flex-1 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-16 w-16 rounded-full bg-sage-light flex items-center justify-center mb-6"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </motion.div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">Setting up...</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Connecting to Prelude and preparing your microphone.
            </p>
          </motion.div>
        ) : (
          /* ── Active session ──────────────────────────────────────── */
          <>
            {/* Transcript */}
            <div className="flex-1 space-y-4 mb-8 overflow-y-auto">
              <AnimatePresence>
                {session.transcript.map((turn, i) => (
                  <motion.div
                    key={`${turn.timestamp}-${i}`}
                    className={`flex ${turn.speaker === "patient" ? "justify-end" : "justify-start"}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card
                      className={`max-w-[80%] border-0 shadow-soft ${
                        turn.speaker === "patient"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-card rounded-2xl rounded-bl-md"
                      }`}
                    >
                      <CardContent className="p-4 text-sm leading-relaxed">{turn.text}</CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {session.transcript.length === 0 && isActive && !session.isAgentThinking && (
                <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="bg-card border-0 shadow-soft rounded-2xl rounded-bl-md">
                    <CardContent className="p-4">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((d) => (
                          <motion.div
                            key={d}
                            className="h-2 w-2 rounded-full bg-muted-foreground/40"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <AnimatePresence>
                {session.isAgentThinking && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card className="max-w-[80%] border-0 shadow-soft bg-card/80 rounded-2xl rounded-bl-md overflow-hidden">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="flex gap-1.5" aria-hidden>
                          {[0, 1, 2].map((d) => (
                            <motion.div
                              key={d}
                              className="h-2 w-2 rounded-full bg-primary/60"
                              animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.2,
                                delay: d * 0.15,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">Prelude is reflecting…</span>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={transcriptEndRef} />
            </div>

            {/* Controls */}
            <motion.div
              className="flex items-center justify-center gap-4 py-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  variant={session.isMicMuted ? "outline" : "default"}
                  size="icon"
                  className="rounded-full h-16 w-16 shadow-glow"
                  onClick={session.toggleMic}
                >
                  {session.isMicMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
              </motion.div>
              <Button variant="soft" size="sm" className="rounded-full" onClick={handleEndSession}>
                End Session
              </Button>
            </motion.div>
          </>
        )}
      </div>

      <CrisisFooter />
    </div>
  );
};

export default Session;
