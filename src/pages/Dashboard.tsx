import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Clock, TrendingUp, ArrowRight, Sparkles, Loader2, CalendarRange } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import { emotionEmojis } from "@/data/mockData";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientData } from "@/hooks/usePatientData";
import { toDate } from "@/lib/firestore-sessions";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const Dashboard = () => {
  const { user } = useAuth();
  const { briefs, sessions, weeklyBrief, loading, error } = usePatientData();
  const [lastWeekExpanded, setLastWeekExpanded] = useState(false);
  const firstName = user?.displayName?.split(" ")[0] || "there";

  const latestBrief = briefs[0] ?? null;
  const sessionCount = sessions.length;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const sessionsThisWeek = sessions.filter((s) =>
    isWithinInterval(toDate(s.completedAt), { start: weekStart, end: weekEnd })
  ).length;

  const lastWeekRange =
    weeklyBrief?.weekStart && weeklyBrief?.weekEnd
      ? `${format(new Date(weeklyBrief.weekStart), "MMM d")}–${format(new Date(weeklyBrief.weekEnd), "MMM d")}`
      : null;
  const lastWeekSessionCount = weeklyBrief?.sessions?.length ?? 0;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        {/* Greeting */}
        <motion.div className="mb-8" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}
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
            {sessionCount > 0
              ? `You've completed ${sessionCount} session${sessionCount === 1 ? "" : "s"} so far`
              : "Ready to prepare for your next session?"}
            {sessionsThisWeek > 0 && (
              <span className="block text-xs mt-1 text-muted-foreground/90">
                This calendar week: {sessionsThisWeek} prep session{sessionsThisWeek === 1 ? "" : "s"}
              </span>
            )}
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
            <Card className="relative overflow-hidden bg-primary border-0 shadow-glow cursor-pointer group transition-all duration-500 hover:scale-[1.01] hover:shadow-lifted rounded-2xl">
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
                  Let's surface what matters before your next session. No agenda, no right answers.
                </p>
                <ArrowRight className="absolute bottom-8 right-8 h-5 w-5 text-primary-foreground/30 group-hover:text-primary-foreground/60 group-hover:translate-x-1 transition-all duration-300" />
              </CardContent>
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
        {error && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="shadow-soft rounded-2xl border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-destructive">Failed to load sessions: {error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {loading ? (
          <motion.div
            className="mb-8 flex items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading your sessions...</span>
          </motion.div>
        ) : latestBrief ? (
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
              <Card className="shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-500 cursor-pointer group rounded-2xl border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">
                      {format(toDate(latestBrief.generatedAt), "EEEE, MMMM d")} · Session #{sessionCount}
                    </p>
                    {latestBrief.content.dominantEmotion && (
                      <Badge variant="outline" className="capitalize font-normal text-xs text-muted-foreground border-border">
                        {emotionEmojis[latestBrief.content.dominantEmotion] || "😌"}{" "}
                        {latestBrief.content.dominantEmotion}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-2">
                    {latestBrief.content.emotionalState}
                  </p>
                  {latestBrief.content.patternNote && (
                    <p className="text-xs text-primary font-medium mb-2">
                      Pattern noted · worth exploring this week
                    </p>
                  )}
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
        ) : (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <Card className="shadow-soft rounded-2xl border-border/50 border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No sessions yet. Start your first prep session to see your brief here.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Last week + Quick Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Last completed week — weekly summary only (no duplicate of Latest Brief) */}
          <Card
            className={`shadow-soft rounded-2xl border-border/50 transition-all duration-300 ${
              weeklyBrief?.summary
                ? "cursor-pointer hover:shadow-lifted hover:-translate-y-0.5"
                : ""
            }`}
            onClick={() => weeklyBrief?.summary && setLastWeekExpanded((e) => !e)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Last week</span>
                </div>
                {weeklyBrief?.summary ? (
                  <span className="text-xs text-muted-foreground">
                    {lastWeekExpanded ? "Tap to collapse" : "Tap to expand"}
                  </span>
                ) : null}
              </div>
              {weeklyBrief?.summary ? (
                <>
                  <p className="font-display text-xl font-bold text-foreground">{lastWeekSessionCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    prep session{lastWeekSessionCount === 1 ? "" : "s"} that week
                  </p>
                  {lastWeekRange && (
                    <p className="text-[10px] text-muted-foreground mt-1">{lastWeekRange}</p>
                  )}
                  {!lastWeekExpanded && (
                    <p className="text-xs text-foreground/80 mt-3 line-clamp-3">
                      {weeklyBrief.summary.emotionalState}
                    </p>
                  )}
                  {lastWeekExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 pt-4 border-t border-border/50"
                    >
                      <p className="text-sm text-foreground/80 leading-relaxed mb-2">
                        {weeklyBrief.summary.emotionalState}
                      </p>
                      {weeklyBrief.summary.patternNote && (
                        <p className="text-xs text-primary font-medium mb-2">
                          Pattern noted · worth exploring
                        </p>
                      )}
                      {weeklyBrief.summary.themes && weeklyBrief.summary.themes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {weeklyBrief.summary.themes.map((theme) => (
                            <Badge
                              key={theme}
                              variant="secondary"
                              className="bg-sage-light text-primary border-0 font-normal"
                            >
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {weeklyBrief.summary.focusItems && weeklyBrief.summary.focusItems.length > 0 && (
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                          {weeklyBrief.summary.focusItems.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                      <Link
                        to="/history?tab=weekly"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        All weekly briefs
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Weekly summaries appear after your first full week (Sun–Sat) with at least one prep session.
                  </p>
                  <Link
                    to="/history?tab=weekly"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Weekly briefs in History
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Link to="/history">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-500 cursor-pointer group rounded-2xl border-border/50">
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
                <Card className="shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-500 cursor-pointer group rounded-2xl border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs text-muted-foreground">Trend</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {latestBrief
                        ? (emotionEmojis[latestBrief.content.dominantEmotion] || "😌")
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {latestBrief
                        ? `${latestBrief.content.dominantEmotion} (latest)`
                        : "No data yet"}
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
