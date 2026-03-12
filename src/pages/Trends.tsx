import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/AppLayout";
import { emotionColors, emotionEmojis } from "@/data/mockData";
import { usePatientData } from "@/hooks/usePatientData";
import { toDate } from "@/lib/firestore-sessions";
import { format, startOfWeek } from "date-fns";

const emotionIntensity: Record<string, number> = {
  calm: 2, flat: 3, reflective: 3, grounded: 2, hopeful: 3,
  sad: 5, anxious: 6, frustrated: 7, distressed: 9,
  happy: 2, excited: 3, grateful: 2, confident: 2,
};

const Trends = () => {
  const { briefs, loading } = usePatientData();

  const [mode, setMode] = useState<"weekly" | "sessions">("weekly");

  const sessionChartData = useMemo(
    () =>
      [...briefs].reverse().map((brief) => {
        const emotion = brief.content.dominantEmotion || "calm";
        return {
          date: format(toDate(brief.generatedAt), "MMM d"),
          emotion,
          intensity: emotionIntensity[emotion] || 4,
          emoji: emotionEmojis[emotion] || "😌",
          color: emotionColors[emotion] || "hsl(152 30% 50%)",
        };
      }),
    [briefs]
  );

  const weeklyChartData = useMemo(() => {
    type WeekBucket = {
      weekStart: Date;
      counts: Record<string, number>;
    };

    const byWeek = new Map<string, WeekBucket>();

    briefs.forEach((brief) => {
      const d = toDate(brief.generatedAt);
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const key = ws.toISOString();
      const bucket =
        byWeek.get(key) ??
        {
          weekStart: ws,
          counts: {},
        };

      const emotion = brief.content.dominantEmotion || "calm";
      if (emotion) {
        bucket.counts[emotion] = (bucket.counts[emotion] || 0) + 1;
      }

      byWeek.set(key, bucket);
    });

    return Array.from(byWeek.values())
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .map((bucket) => {
        const entries = Object.entries(bucket.counts);
        if (entries.length === 0) {
          return {
            date: format(bucket.weekStart, "MMM d"),
            emotion: "calm",
            intensity: emotionIntensity["calm"],
            emoji: emotionEmojis["calm"] || "😌",
            color: emotionColors["calm"] || "hsl(152 30% 50%)",
          };
        }

        const [dominantEmotion] = entries.reduce(
          (best, current) => (current[1] > best[1] ? current : best),
          entries[0]
        );

        const intensity = emotionIntensity[dominantEmotion] || 4;

        return {
          date: format(bucket.weekStart, "MMM d"),
          emotion: dominantEmotion,
          intensity,
          emoji: emotionEmojis[dominantEmotion] || "😌",
          color: emotionColors[dominantEmotion] || "hsl(152 30% 50%)",
        };
      });
  }, [briefs]);

  const chartData = mode === "weekly" ? weeklyChartData : sessionChartData;

  const recurringEmotion = useMemo(() => {
    if (briefs.length < 3) return null;
    const recent = briefs.slice(0, 3).map((b) => b.content.dominantEmotion);
    const counts = recent.reduce<Record<string, number>>((acc, e) => {
      if (e) acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {});
    const repeated = Object.entries(counts).find(([, count]) => count >= 2);
    return repeated ? repeated[0] : null;
  }, [briefs]);

  const hasData = chartData.length > 0;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Emotional Trends
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {hasData
              ? mode === "weekly"
                ? `Last ${chartData.length} week${chartData.length === 1 ? "" : "s"} · How you've been showing up`
                : `Last ${chartData.length} session${chartData.length === 1 ? "" : "s"} · How you've been showing up`
              : "Your emotional journey will appear here after your first session"}
          </p>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground text-sm">Loading your trends...</div>
          </div>
        )}

        {!loading && !hasData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="shadow-soft rounded-2xl border-border/50">
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground text-sm">
                  Complete a few sessions to start seeing your emotional trends here.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!loading && hasData && (
          <>
            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6"
            >
              <Card className="shadow-soft rounded-2xl border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Emotional Intensity Over Time
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        className={`px-2 py-1 rounded-full ${
                          mode === "weekly"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => setMode("weekly")}
                      >
                        Weekly
                      </button>
                      <button
                        className={`px-2 py-1 rounded-full ${
                          mode === "sessions"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => setMode("sessions")}
                      >
                        Session-by-session
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barSize={32}>
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(200 10% 46%)" }} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 10]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(40 33% 97%)",
                            border: "1px solid hsl(35 20% 87%)",
                            borderRadius: "12px",
                            fontSize: "13px",
                            boxShadow: "0 4px 12px -4px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: number, _name: string, props: any) => {
                            return [
                              `${props.payload.emoji} ${props.payload.emotion} (${value}/10)`,
                              mode === "weekly" ? "Week" : "Intensity",
                            ];
                          }}
                        />
                        <Bar dataKey="intensity" radius={[8, 8, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Session-by-session list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6"
            >
              <Card className="shadow-soft rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Session-by-Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(mode === "sessions" ? sessionChartData : weeklyChartData).map((entry, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <span className="text-lg">{entry.emoji}</span>
                      <span className="text-sm text-foreground flex-1">{entry.date}</span>
                      <Badge variant="secondary" className="capitalize font-normal text-xs">
                        {entry.emotion}
                      </Badge>
                      <div className="w-20">
                        <Progress
                          value={entry.intensity * 10}
                          className="h-2"
                          style={{ ['--progress-color' as any]: entry.color }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Pattern callout */}
            {recurringEmotion && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="shadow-soft border-primary/30 bg-sage-light rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary text-primary-foreground border-0">
                        {emotionEmojis[recurringEmotion] || "📈"} Recurring Pattern
                      </Badge>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      <span className="capitalize font-medium">{recurringEmotion}</span> has appeared in multiple recent sessions. This might be worth exploring more deeply with your therapist.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Trends;
