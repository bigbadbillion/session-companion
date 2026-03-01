import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { emotionEmojis } from "@/data/mockData";
import { format } from "date-fns";
import { usePatientData } from "@/hooks/usePatientData";

const History = () => {
  const { briefs, sessions, loading } = usePatientData();

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
            {loading
              ? "Loading..."
              : sessions.length > 0
                ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} · Your reflections over time`
                : "No sessions yet · Start your first prep session to see your history"}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading sessions...</span>
          </div>
        ) : briefs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="shadow-soft rounded-2xl border-border/50 border-dashed">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Your session history will appear here after your first prep session.
                </p>
                <Link
                  to="/session"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Start your first session
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {briefs.map((brief, i) => {
              const session = sessions.find((s) => s.sessionId === brief.sessionId);
              const dominantEmotion = session?.emotionalArc.dominantEmotion ?? "calm";
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
                                {format(brief.generatedAt.toDate(), "EEEE, MMMM d")}
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
                                <Badge key={theme} variant="outline" className="text-xs font-normal text-muted-foreground border-border">
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
        )}
      </div>
    </AppLayout>
  );
};

export default History;
