import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { mockBriefs, mockSessions, emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";

const Dashboard = () => {
  const latestBrief = mockBriefs[0];
  const latestSession = mockSessions[0];
  const sessionCount = mockSessions.length;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        {/* Greeting */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Good morning, Alex
          </h1>
          <p className="text-muted-foreground">
            Your next session is <span className="text-foreground font-medium">tomorrow at 2:00 PM</span>
          </p>
        </motion.div>

        {/* Start Session CTA */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link to="/session">
            <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-glow cursor-pointer group transition-transform hover:scale-[1.01]">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center animate-breathe">
                    <Mic className="h-5 w-5" />
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
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            </div>
          </Link>
        </motion.div>

        {/* Latest Brief Preview */}
        {latestBrief && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Latest Brief</h3>
              <Link to={`/brief/${latestBrief.briefId}`} className="text-sm text-primary hover:underline">
                View full brief →
              </Link>
            </div>
            <Link to={`/brief/${latestBrief.briefId}`}>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-lifted transition-shadow cursor-pointer">
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link to="/history">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-lifted transition-shadow cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sessions</span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{sessionCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
            </div>
          </Link>
          <Link to="/trends">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-lifted transition-shadow cursor-pointer">
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
