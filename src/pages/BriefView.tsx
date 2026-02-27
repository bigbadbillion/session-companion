import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Download, Thermometer, MessageSquareQuote, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { mockBriefs, mockSessions } from "@/data/mockData";
import { format } from "date-fns";

const BriefView = () => {
  const { briefId } = useParams();
  const brief = mockBriefs.find((b) => b.briefId === briefId) || mockBriefs[0];
  const sessionIndex = mockSessions.findIndex((s) => s.sessionId === brief.sessionId);

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
              My Prelude Brief
            </h1>
            <p className="text-sm text-muted-foreground">
              Session Prep · {format(new Date(brief.generatedAt), "EEEE, MMMM d, yyyy")} · Session #{mockSessions.length - sessionIndex}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 italic">
              Prelude is not a clinical tool · This brief is private and belongs to you
            </p>
          </div>

          {/* Brief Sections */}
          <div className="space-y-6">
            {/* Emotional State */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Thermometer className="h-4 w-4 text-earth" />
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  How I'm Showing Up Today
                </h3>
              </div>
              <p className="text-foreground/80 leading-relaxed">{brief.content.emotionalState}</p>
            </div>

            {/* Themes */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🧵</span>
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Three Things on My Mind
                </h3>
              </div>
              <ol className="space-y-2">
                {brief.content.themes.map((theme, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-primary font-display font-semibold text-sm mt-0.5">{i + 1}.</span>
                    <span className="text-foreground/80">{theme}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Patient Words */}
            <div className="rounded-2xl border border-border bg-sage-light p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquareQuote className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  What I Want to Make Sure I Say
                </h3>
              </div>
              <blockquote className="font-display text-lg italic text-foreground leading-relaxed">
                "{brief.content.patientWords}"
              </blockquote>
            </div>

            {/* Focus Items */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-clay" />
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Two Things I Want to Focus On
                </h3>
              </div>
              <ol className="space-y-2">
                {brief.content.focusItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-clay font-display font-semibold text-sm mt-0.5">{i + 1}.</span>
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Pattern Note */}
            {brief.content.patternNote && (
              <div className="rounded-2xl border border-primary/30 bg-sage-light p-6 shadow-soft">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Pattern I've Noticed
                  </h3>
                </div>
                <p className="text-foreground/80 leading-relaxed">{brief.content.patternNote}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <Button variant="soft" size="sm" className="gap-2">
              <Edit3 className="h-3.5 w-3.5" /> Edit Brief
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/50 mt-6 text-center">
            Generated by Prelude · {format(new Date(brief.generatedAt), "h:mm a")} · This brief is private and belongs to you.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default BriefView;
