import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { mockBriefs, mockSessions, emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";

const History = () => {
  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Session History
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {mockSessions.length} sessions · Your reflections over time
          </p>
        </motion.div>

        <div className="space-y-4">
          {mockBriefs.map((brief, i) => {
            const session = mockSessions.find((s) => s.sessionId === brief.sessionId);
            if (!session) return null;
            const emoji = emotionEmojis[session.emotionalArc.dominantEmotion] || "😌";

            return (
              <motion.div
                key={brief.briefId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={`/brief/${brief.briefId}`}>
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-lifted transition-all cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0 text-lg">
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(brief.generatedAt), "EEEE, MMMM d")}
                          </p>
                          <span className="text-xs text-muted-foreground capitalize">
                            {session.emotionalArc.dominantEmotion}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {brief.content.emotionalState}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {brief.content.themes.slice(0, 2).map((theme) => (
                            <span
                              key={theme}
                              className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                            >
                              {theme}
                            </span>
                          ))}
                          {brief.content.patternNote && (
                            <span className="text-xs bg-sage-light text-primary px-2 py-0.5 rounded-full">
                              📈 Pattern
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default History;
