import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import { mockBriefs, mockSessions, emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";

const History = () => {
  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Session History
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {mockSessions.length} sessions · Your reflections over time
          </p>
        </motion.div>

        <div className="space-y-3">
          {mockBriefs.map((brief, i) => {
            const session = mockSessions.find((s) => s.sessionId === brief.sessionId);
            if (!session) return null;
            const emoji = emotionEmojis[session.emotionalArc.dominantEmotion] || "😌";

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
                              {format(new Date(brief.generatedAt), "EEEE, MMMM d")}
                            </p>
                            <Badge variant="secondary" className="text-xs capitalize font-normal">
                              {session.emotionalArc.dominantEmotion}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {brief.content.emotionalState}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {brief.content.themes.slice(0, 2).map((theme) => (
                              <Badge key={theme} variant="outline" className="text-xs font-normal text-muted-foreground border-border">
                                {theme}
                              </Badge>
                            ))}
                            {brief.content.patternNote && (
                              <Badge className="text-xs bg-sage-light text-primary border-0 font-normal">
                                📈 Pattern
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
      </div>
    </AppLayout>
  );
};

export default History;
