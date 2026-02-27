import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { mockBriefs, mockSessions, emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const Dashboard = () => {
  const latestBrief = mockBriefs[0];
  const latestSession = mockSessions[0];
  const sessionCount = mockSessions.length;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        {/* Greeting */}
        <motion.div className="mb-8" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h1 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Good morning, Alex
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground">
            Your next session is <span className="text-foreground font-medium">tomorrow at 2:00 PM</span>
          </motion.p>
        </motion.div>

        {/* Start Session CTA */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link to="/session">
            <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-glow cursor-pointer group transition-all duration-300 hover:scale-[1.01] hover:shadow-lifted">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                      <Mic className="h-5 w-5" />
                    </motion.div>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">Start Prep Session</h2>
                    <p className="text-primary-foreground/70 text-sm">~10 minutes · Voice conversation</p>
                  </div>
                </div>
                <p className="text-primary-foreground/80 text-sm leading-relaxed max-w-md">
                  Let's surface what matters before you walk in tomorrow. No agenda, no right answers.
                </p>
              </div>
              {/* Animated background circles */}
              <motion.div
                className="absolute top-0 right-0 w-40 h-40 bg-primary-foreground/5 rounded-full"
                animate={{ scale: [1, 1.2, 1], x: [0, 10, 0], y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                style={{ translateY: "-50%", translateX: "50%" }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                style={{ translateY: "50%", translateX: "-30%" }}
              />
            </div>
          </Link>
        </motion.div>

        {/* Latest Brief Preview */}
        {latestBrief && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Latest Brief</h3>
              <Link to={`/brief/${latestBrief.briefId}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1 group">
                View full brief
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <Link to={`/brief/${latestBrief.briefId}`}>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                <p className="text-xs text-muted-foreground mb-3">
                  {format(new Date(latestBrief.generatedAt), "EEEE, MMMM d")} · Session #{sessionCount}
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                  {latestBrief.content.emotionalState}
                </p>
                <div className="flex flex-wrap gap-2">
                  {latestBrief.content.themes.map((theme) => (
                    <span
                      key={theme}
                      className="text-xs bg-sage-light text-primary px-3 py-1 rounded-full"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Quick Stats */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Link to="/history">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sessions</span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{sessionCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
            </div>
          </Link>
          <Link to="/trends">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Trend</span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">
                {emotionEmojis[latestSession.emotionalArc.dominantEmotion] || "😌"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {latestSession.emotionalArc.dominantEmotion} this week
              </p>
            </div>
          </Link>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
