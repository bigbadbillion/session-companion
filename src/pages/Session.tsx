import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Pause, Play, X, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CrisisFooter from "@/components/CrisisFooter";

const disclaimerText =
  "Prelude is a personal wellness tool, not a medical or clinical service. It does not provide therapy, diagnosis, or treatment. If you are experiencing a mental health crisis, please contact the 988 Suicide & Crisis Lifeline — call or text 988.";

const mockTranscript = [
  { speaker: "agent" as const, text: "Hi Alex, good to hear your voice. You've got a session coming up tomorrow. We have about ten minutes — no agenda, no right answers. Let's just see what's been with you this week." },
  { speaker: "patient" as const, text: "Yeah, it's been... a lot. Work has been insane and I had this conversation with my partner that I can't stop thinking about." },
  { speaker: "agent" as const, text: "It sounds like the conversation with your partner might be carrying more weight than the work stress, even though you mentioned work first. What felt significant about that conversation?" },
  { speaker: "patient" as const, text: "I think it's because they said something about me not being present, and I know they're right. I keep telling myself it's fine but my body is screaming that it's not." },
  { speaker: "agent" as const, text: "That's a really honest thing to notice — the gap between what you're telling yourself and what your body is telling you. When did you first feel that tension this week?" },
];

const Session = () => {
  const navigate = useNavigate();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isMicActive, setIsMicActive] = useState(true);

  useEffect(() => {
    if (!sessionActive || isPaused) return;
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionActive, isPaused]);

  useEffect(() => {
    if (!sessionActive || isPaused) return;
    if (currentTurn >= mockTranscript.length) return;
    const delay = mockTranscript[currentTurn].speaker === "agent" ? 3000 : 5000;
    const timer = setTimeout(() => setCurrentTurn((prev) => Math.min(prev + 1, mockTranscript.length)), delay);
    return () => clearTimeout(timer);
  }, [sessionActive, isPaused, currentTurn]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const handleEndSession = () => navigate("/brief/b1");
  const progressPct = Math.min((elapsed / 600) * 100, 100);

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
                <p className="text-sm text-foreground/80 leading-relaxed">{disclaimerText}</p>
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Session header */}
      <header className="border-b border-border bg-background/90 backdrop-blur-xl px-6 py-3">
        <div className="container mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-primary"
              animate={sessionActive && !isPaused ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <Badge variant="secondary" className="font-normal text-xs">
              {sessionActive ? (isPaused ? "Paused" : "Listening...") : "Ready"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-mono">{formatTime(elapsed)} / 10:00</span>
            <Button variant="ghost" size="sm" onClick={handleEndSession} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> End
            </Button>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl mt-2">
          <Progress value={progressPct} className="h-1" />
        </div>
      </header>

      {/* Main session area */}
      <div className="flex-1 flex flex-col container mx-auto max-w-3xl px-6 py-8">
        {!sessionActive ? (
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
              onClick={() => setSessionActive(true)}
            >
              {/* Ripple rings */}
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
        ) : (
          <>
            {/* Transcript */}
            <div className="flex-1 space-y-4 mb-8 overflow-y-auto">
              <AnimatePresence>
                {mockTranscript.slice(0, currentTurn).map((turn, i) => (
                  <motion.div
                    key={i}
                    className={`flex ${turn.speaker === "patient" ? "justify-end" : "justify-start"}`}
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Card className={`max-w-[80%] border-0 shadow-soft ${
                      turn.speaker === "patient"
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                        : "bg-card rounded-2xl rounded-bl-md"
                    }`}>
                      <CardContent className="p-4 text-sm leading-relaxed">
                        {turn.text}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {currentTurn < mockTranscript.length && sessionActive && !isPaused && (
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
            </div>

            {/* Controls */}
            <motion.div
              className="flex items-center justify-center gap-4 py-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-12 w-12 transition-all duration-200 hover:bg-sage-light hover:border-primary/30"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  variant={isMicActive ? "default" : "outline"}
                  size="icon"
                  className="rounded-full h-16 w-16 shadow-glow"
                  onClick={() => setIsMicActive(!isMicActive)}
                >
                  {isMicActive ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
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
