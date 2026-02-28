import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/AppLayout";
import { mockSessions, emotionColors, emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";

const emotionIntensity: Record<string, number> = {
  calm: 2, flat: 3, reflective: 3, grounded: 2, hopeful: 3,
  sad: 5, anxious: 6, frustrated: 7, distressed: 9,
  happy: 2, excited: 3, grateful: 2, confident: 2,
};

const Trends = () => {
  const chartData = [...mockSessions].reverse().map((session) => ({
    date: format(new Date(session.startedAt), "MMM d"),
    emotion: session.emotionalArc.dominantEmotion,
    intensity: emotionIntensity[session.emotionalArc.dominantEmotion] || 4,
    emoji: emotionEmojis[session.emotionalArc.dominantEmotion] || "😌",
    color: emotionColors[session.emotionalArc.dominantEmotion] || "hsl(152 30% 50%)",
  }));

  const recentEmotions = mockSessions.slice(0, 3).map((s) => s.emotionalArc.dominantEmotion);
  const recurring = recentEmotions.filter((e, i) => recentEmotions.indexOf(e) !== i);

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
            Rolling 8 weeks · How you've been showing up
          </p>
        </motion.div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <Card className="shadow-soft rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Emotional Intensity Over Time
              </CardTitle>
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
                      formatter={(value: number, _name: string, props: any) => [
                        `${props.payload.emoji} ${props.payload.emotion} (${value}/10)`,
                        "Intensity",
                      ]}
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

        {/* Session-by-session */}
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
              {chartData.map((entry, i) => (
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
        {recurring.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="shadow-soft border-primary/30 bg-sage-light rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary text-primary-foreground border-0">📈 Recurring Pattern</Badge>
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  Anxiety-related themes have appeared in multiple recent sessions. This might be worth exploring more deeply with your therapist.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Trends;
