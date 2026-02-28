import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Clock, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import { mockBriefs, mockSessions, emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" as const },
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
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              Good morning, Alex
            </h1>
            <motion.span
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2.5, delay: 0.5, ease: "easeInOut" }}
              className="text-2xl"
            >
              👋
            </motion.span>
          </motion.div>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground">
            Your next session is <span className="text-foreground font-medium">tomorrow at 2:00 PM</span>
          </motion.p>
        </motion.div>

        {/* Start Session CTA */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/session">
            <Card className="relative overflow-hidden bg-primary border-0 shadow-glow cursor-pointer group transition-all duration-500 hover:scale-[1.01] hover:shadow-lifted">
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                      <Mic className="h-6 w-6 text-primary-foreground" />
                    </motion.div>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-primary-foreground">Start Prep Session</h2>
                    <p className="text-primary-foreground/60 text-sm">~10 minutes · Voice conversation</p>
                  </div>
                </div>
                <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-md">
                  Let's surface what matters before you walk in tomorrow. No agenda, no right answers.
                </p>
                <ArrowRight className="absolute bottom-8 right-8 h-5 w-5 text-primary-foreground/30 group-hover:text-primary-foreground/60 group-hover:translate-x-1 transition-all duration-300" />
              </CardContent>
              {/* Animated background shapes */}
              <motion.div
                className="absolute top-0 right-0 w-48 h-48 bg-primary-foreground/5 rounded-full"
                animate={{ scale: [1, 1.3, 1], x: [0, 10, 0], y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                style={{ translateY: "-40%", translateX: "40%" }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-32 h-32 bg-primary-foreground/5 rounded-full"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                style={{ translateY: "40%", translateX: "-20%" }}
              />
              <motion.div
                className="absolute top-1/2 right-1/3 w-16 h-16 bg-primary-foreground/5 rounded-full"
                animate={{ scale: [1, 1.2, 1], y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 2 }}
              />
            </Card>
          </Link>
        </motion.div>

        {/* Latest Brief Preview */}
        {latestBrief && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Latest Brief
              </h3>
              <Link to={`/brief/${latestBrief.briefId}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1 group">
                View full brief
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <Link to={`/brief/${latestBrief.briefId}`}>
              <Card className="shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-500 cursor-pointer group">
                <CardContent className="p-6">
                  <p className="text-xs text-muted-foreground mb-3">
                    {format(new Date(latestBrief.generatedAt), "EEEE, MMMM d")} · Session #{sessionCount}
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                    {latestBrief.content.emotionalState}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {latestBrief.content.themes.map((theme) => (
                      <Badge key={theme} variant="secondary" className="bg-sage-light text-primary border-0 font-normal">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )}

        {/* Quick Stats */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/history">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-500 cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs text-muted-foreground">Sessions</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-foreground">{sessionCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>View session history</TooltipContent>
            </Tooltip>
          </Link>
          <Link to="/trends">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-500 cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs text-muted-foreground">Trend</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {emotionEmojis[latestSession.emotionalArc.dominantEmotion] || "😌"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {latestSession.emotionalArc.dominantEmotion} this week
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>View emotional trends</TooltipContent>
            </Tooltip>
          </Link>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
