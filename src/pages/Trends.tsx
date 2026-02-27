import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import AppLayout from "@/components/AppLayout";
import { mockSessions, emotionColors, emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";

const emotionIntensity: Record<string, number> = {
  calm: 2,
  flat: 3,
  reflective: 3,
  grounded: 2,
  hopeful: 3,
  sad: 5,
  anxious: 6,
  frustrated: 7,
  distressed: 9,
  happy: 2,
  excited: 3,
  grateful: 2,
  confident: 2,
};

const Trends = () => {
  const chartData = [...mockSessions].reverse().map((session) => ({
    date: format(new Date(session.startedAt), "MMM d"),
    emotion: session.emotionalArc.dominantEmotion,
    intensity: emotionIntensity[session.emotionalArc.dominantEmotion] || 4,
    emoji: emotionEmojis[session.emotionalArc.dominantEmotion] || "😌",
    color: emotionColors[session.emotionalArc.dominantEmotion] || "hsl(152 30% 50%)",
  }));

  // Identify recurring themes
  const recentEmotions = mockSessions.slice(0, 3).map((s) => s.emotionalArc.dominantEmotion);
  const recurring = recentEmotions.filter((e, i) => recentEmotions.indexOf(e) !== i);

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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
          className="rounded-2xl border border-border bg-card p-6 shadow-soft mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Emotional Intensity Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={32}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "hsl(200 10% 46%)" }}
                  axisLine={false}
                  tickLine={false}
                />
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
        </motion.div>

        {/* Emotion legend */}
        <motion.div
          className="rounded-2xl border border-border bg-card p-6 shadow-soft mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Session-by-Session
          </h3>
          <div className="space-y-3">
            {chartData.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{entry.emoji}</span>
                <span className="text-sm text-foreground flex-1">{entry.date}</span>
                <span className="text-sm text-muted-foreground capitalize">{entry.emotion}</span>
                <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${entry.intensity * 10}%`, backgroundColor: entry.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pattern callout */}
        {recurring.length > 0 && (
          <motion.div
            className="rounded-2xl border border-primary/30 bg-sage-light p-6 shadow-soft"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-display text-sm font-semibold text-primary uppercase tracking-wider mb-2">
              📈 Recurring Pattern
            </h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              Anxiety-related themes have appeared in multiple recent sessions. This might be worth exploring more deeply with your therapist.
            </p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Trends;
