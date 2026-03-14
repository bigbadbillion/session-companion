import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CalendarRange } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientData } from "@/hooks/usePatientData";
import { toDate } from "@/lib/firestore-sessions";
import { listWeeklyBriefs, type WeeklyBriefApi } from "@/lib/weekly-briefs";

const History = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "weekly" ? "weekly" : "sessions";
  const { briefs, sessions, loading } = usePatientData();

  const [weeklyList, setWeeklyList] = useState<WeeklyBriefApi[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || tab !== "weekly") return;
    let cancelled = false;
    setWeeklyLoading(true);
    setWeeklyError(null);
    listWeeklyBriefs(user.uid)
      .then((list) => {
        if (!cancelled) setWeeklyList(list);
      })
      .catch((e) => {
        if (!cancelled) setWeeklyError(e?.message ?? "Failed to load weekly briefs");
      })
      .finally(() => {
        if (!cancelled) setWeeklyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, tab]);

  const setTab = (value: string) => {
    if (value === "weekly") setSearchParams({ tab: "weekly" });
    else setSearchParams({});
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            History
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Session briefs and weekly summaries
          </p>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="weekly">Weekly briefs</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading sessions...</span>
              </div>
            ) : briefs.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-soft rounded-2xl border-border/50 border-dashed">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      Your session history will appear here after your first prep session.
                    </p>
                    <Link to="/session" className="text-sm text-primary hover:underline font-medium">
                      Start your first session
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm mb-4">
                  {sessions.length} session{sessions.length === 1 ? "" : "s"} · Newest first
                </p>
                <div className="space-y-3">
                  {briefs.map((brief, i) => {
                    const dominantEmotion = brief.content.dominantEmotion ?? "calm";
                    const emoji = emotionEmojis[dominantEmotion] || "😌";
                    return (
                      <motion.div
                        key={brief.briefId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link to={`/brief/${brief.briefId}`}>
                          <Card className="shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-500 cursor-pointer group rounded-2xl border-border/50">
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                <motion.div
                                  className="h-11 w-11 rounded-xl bg-sage-light flex items-center justify-center flex-shrink-0 text-lg"
                                  whileHover={{ scale: 1.15, rotate: 5 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  {emoji}
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium text-foreground">
                                      {format(toDate(brief.generatedAt), "EEEE, MMMM d")}
                                    </p>
                                    <Badge variant="secondary" className="text-xs capitalize font-normal">
                                      {dominantEmotion}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                    {brief.content.emotionalState}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                                    {brief.content.themes.slice(0, 2).map((theme) => (
                                      <Badge
                                        key={theme}
                                        variant="outline"
                                        className="text-xs font-normal text-muted-foreground border-border"
                                      >
                                        {theme}
                                      </Badge>
                                    ))}
                                    {brief.content.patternNote && (
                                      <Badge className="text-xs bg-sage-light text-primary border-0 font-normal">
                                        Pattern noted
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <p className="text-muted-foreground text-sm mb-4">
              One summary per completed calendar week (Sun–Sat), built from prep sessions that week.
            </p>
            {weeklyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading weekly briefs...</span>
              </div>
            ) : weeklyError ? (
              <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 text-sm text-destructive">{weeklyError}</CardContent>
              </Card>
            ) : weeklyList.length === 0 ? (
              <Card className="shadow-soft rounded-2xl border-border/50 border-dashed">
                <CardContent className="p-8 text-center">
                  <CalendarRange className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    No weekly briefs yet. They appear after a full week ends with at least one session that week.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {weeklyList.map((w, i) => {
                  const range = `${format(new Date(w.weekStart), "MMM d")}–${format(new Date(w.weekEnd), "MMM d, yyyy")}`;
                  return (
                    <motion.div
                      key={w.weeklyBriefId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.45 }}
                    >
                      <Card className="shadow-soft rounded-2xl border-border/50">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-foreground flex items-center gap-2">
                              <CalendarRange className="h-4 w-4 text-primary" />
                              {range}
                            </p>
                            <Badge variant="secondary" className="text-xs font-normal">
                              {w.sessions?.length ?? 0} session{(w.sessions?.length ?? 0) === 1 ? "" : "s"}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {w.summary?.emotionalState ?? "—"}
                          </p>
                          {w.summary?.themes && w.summary.themes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {w.summary.themes.map((t) => (
                                <Badge key={t} variant="outline" className="text-xs font-normal">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default History;
