import { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Download, Thermometer, MessageSquareQuote, Target, TrendingUp, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AppLayout from "@/components/AppLayout";
import { format } from "date-fns";
import type { BriefContent } from "@/lib/gemini";
import { getBrief, toDate, type BriefDoc, updateBriefContent } from "@/lib/firestore-sessions";
import { emotionEmojis } from "@/data/mockData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

interface ResolvedBrief {
  content: BriefContent;
  generatedAt: Date;
}

const BriefView = () => {
  const { briefId } = useParams();
  const [firestoreBrief, setFirestoreBrief] = useState<BriefDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BriefContent | null>(null);

  // Try sessionStorage for "latest" (just-generated brief)
  const sessionStorageBrief = useMemo(() => {
    if (briefId !== "latest") return null;
    try {
      const raw = sessionStorage.getItem("prelude-brief");
      if (!raw) return null;
      return JSON.parse(raw) as BriefContent;
    } catch {
      return null;
    }
  }, [briefId]);

  // Fetch from Firestore for real brief IDs
  useEffect(() => {
    if (!briefId || briefId === "latest") return;

    let cancelled = false;
    setLoading(true);

    getBrief(briefId)
      .then((doc) => {
        if (!cancelled) setFirestoreBrief(doc);
      })
      .catch((err) => {
        console.error("Failed to load brief:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [briefId]);

  // Resolve to a unified shape
  const brief: ResolvedBrief | null = useMemo(() => {
    if (sessionStorageBrief) {
      return { content: sessionStorageBrief, generatedAt: new Date() };
    }
    if (firestoreBrief) {
      return {
        content: firestoreBrief.content,
        generatedAt: toDate(firestoreBrief.generatedAt),
      };
    }
    return null;
  }, [sessionStorageBrief, firestoreBrief]);

  useEffect(() => {
    if (brief) {
      setDraft(brief.content);
    }
  }, [brief]);

  const canEdit =
    !!brief &&
    !!draft &&
    !!briefId &&
    briefId !== "latest" &&
    !!firestoreBrief;

  const handleStartEdit = () => {
    if (!canEdit) return;
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!brief) return;
    setDraft(brief.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!canEdit || !draft || !briefId) return;
    try {
      setSaving(true);
      await updateBriefContent(briefId, draft);
      setFirestoreBrief((prev) =>
        prev ? { ...prev, content: draft } : prev
      );
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update brief:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    if (!brief) return;

    const doc = new jsPDF({
      unit: "pt",
      format: "letter",
    });

    const marginX = 48;
    let y = 60;
    const lineWidth = 515;

    const addHeading = (text: string, size = 13) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.text(text, marginX, y);
      y += 18;
    };

    const addBody = (text: string, size = 11) => {
      if (!text) return;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, lineWidth);
      doc.text(lines, marginX, y);
      y += lines.length * (size + 4);
    };

    const addSpacer = (amount = 10) => {
      y += amount;
    };

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("My Prelude Brief", marginX, y);
    y += 22;

    // Date + disclaimer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(
      `Session Prep · ${format(brief.generatedAt, "EEEE, MMMM d, yyyy")}`,
      marginX,
      y
    );
    y += 16;
    addBody(
      "Prelude is not a clinical tool. This brief is private and belongs to you.",
      9
    );
    addSpacer(8);

    // Sections
    addHeading("How I'm Showing Up Today");
    addBody(brief.content.emotionalState);
    addSpacer(8);

    addHeading("Three Things on My Mind");
    brief.content.themes.forEach((theme, index) => {
      addBody(`${index + 1}. ${theme}`);
    });
    addSpacer(8);

    addHeading("What I Want to Make Sure I Say");
    addBody(`"${brief.content.patientWords}"`);
    addSpacer(8);

    addHeading("Two Things I Want to Focus On");
    brief.content.focusItems.forEach((item, index) => {
      addBody(`${index + 1}. ${item}`);
    });
    addSpacer(8);

    if (brief.content.patternNote) {
      addHeading("Pattern I've Noticed");
      addBody(brief.content.patternNote);
      addSpacer(8);
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Generated by Prelude · ${format(brief.generatedAt, "h:mm a")}`,
      marginX,
      760
    );

    const fileName = `prelude-brief-${format(
      brief.generatedAt,
      "yyyy-MM-dd"
    )}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading brief...</span>
        </div>
      </AppLayout>
    );
  }

  if (!brief) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-2xl px-6 py-8 text-center">
          <p className="text-muted-foreground mb-4">Brief not found.</p>
          <Link to="/dashboard" className="text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back
          </Link>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          {/* Header */}
          <motion.div className="mb-8" variants={fadeUp} custom={0}>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-2">
              My Prelude Brief
            </h1>
            <p className="text-sm text-muted-foreground">
              Session Prep · {format(brief.generatedAt, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 italic">
              Prelude is not a clinical tool · This brief is private and belongs to you
            </p>
          </motion.div>

          {/* Brief Sections */}
          <div className="space-y-4">
            {/* Emotional State */}
            <motion.div variants={fadeUp} custom={1}>
              <Card className="shadow-soft border-border/40 overflow-hidden rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center">
                        <Thermometer className="h-4 w-4 text-earth" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        How I'm Showing Up Today
                      </CardTitle>
                    </div>
                    {brief.content.dominantEmotion && (
                      <Badge variant="outline" className="capitalize font-normal text-xs text-muted-foreground border-border">
                        {emotionEmojis[brief.content.dominantEmotion] || "😌"}{" "}
                        {brief.content.dominantEmotion}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing && draft ? (
                    <textarea
                      className="w-full text-sm text-foreground/80 leading-relaxed bg-transparent border border-border rounded-md p-2 resize-y"
                      rows={3}
                      value={draft.emotionalState}
                      onChange={(e) =>
                        setDraft({ ...draft, emotionalState: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-foreground/80 leading-relaxed">
                      {brief.content.emotionalState}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Themes */}
            <motion.div variants={fadeUp} custom={2}>
              <Card className="shadow-soft border-border/40 rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-sage-light flex items-center justify-center text-sm">🧵</div>
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Three Things on My Mind
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {(isEditing && draft ? draft.themes : brief.content.themes).map((theme, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                      >
                        <span className="h-6 w-6 rounded-full bg-sage-light text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {isEditing && draft ? (
                          <input
                            className="flex-1 text-sm text-foreground/80 bg-transparent border border-border rounded-md px-2 py-1"
                            value={theme}
                            onChange={(e) => {
                              const next = [...draft.themes];
                              next[i] = e.target.value;
                              setDraft({ ...draft, themes: next });
                            }}
                          />
                        ) : (
                          <span className="text-foreground/80">{theme}</span>
                        )}
                      </motion.li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </motion.div>

            {/* Patient Words */}
            <motion.div variants={fadeUp} custom={3}>
              <Card className="shadow-soft bg-sage-light border-primary/20 overflow-hidden rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MessageSquareQuote className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      What I Want to Make Sure I Say
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing && draft ? (
                    <textarea
                      className="w-full font-display text-lg italic text-foreground leading-relaxed border-l-2 border-primary/40 pl-4 bg-transparent border rounded-md p-2 resize-y"
                      rows={3}
                      value={draft.patientWords}
                      onChange={(e) =>
                        setDraft({ ...draft, patientWords: e.target.value })
                      }
                    />
                  ) : (
                    <blockquote className="font-display text-lg italic text-foreground leading-relaxed border-l-2 border-primary/40 pl-4">
                      "{brief.content.patientWords}"
                    </blockquote>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Focus Items */}
            <motion.div variants={fadeUp} custom={4}>
              <Card className="shadow-soft border-border/40 rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center">
                      <Target className="h-4 w-4 text-clay" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Two Things I Want to Focus On
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {(isEditing && draft ? draft.focusItems : brief.content.focusItems).map((item, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                      >
                        <span className="h-6 w-6 rounded-full bg-accent text-clay text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {isEditing && draft ? (
                          <input
                            className="flex-1 text-sm text-foreground/80 bg-transparent border border-border rounded-md px-2 py-1"
                            value={item}
                            onChange={(e) => {
                              const next = [...draft.focusItems];
                              next[i] = e.target.value;
                              setDraft({ ...draft, focusItems: next });
                            }}
                          />
                        ) : (
                          <span className="text-foreground/80">{item}</span>
                        )}
                      </motion.li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pattern Note */}
            {brief.content.patternNote && (
              <motion.div variants={fadeUp} custom={5}>
                <Card className="shadow-soft border-primary/30 bg-sage-light rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Pattern I've Noticed
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing && draft ? (
                      <textarea
                        className="w-full text-sm text-foreground/80 leading-relaxed bg-transparent border border-border rounded-md p-2 resize-y"
                        rows={3}
                        value={draft.patternNote ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            patternNote: e.target.value || null,
                          })
                        }
                      />
                    ) : (
                      <p className="text-foreground/80 leading-relaxed">
                        {brief.content.patternNote}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <motion.div className="flex gap-3 mt-8" variants={fadeUp} custom={6}>
            <Button
              variant="soft"
              size="sm"
              className="gap-2"
              disabled={!canEdit}
              onClick={isEditing ? handleCancelEdit : handleStartEdit}
            >
              <Edit3 className="h-3.5 w-3.5" />{" "}
              {isEditing ? "Cancel" : "Edit Brief"}
            </Button>
            {isEditing && (
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPdf}>
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </motion.div>

          <Separator className="mt-8 mb-4" />

          <p className="text-xs text-muted-foreground/50 text-center">
            Generated by Prelude · {format(brief.generatedAt, "h:mm a")} · This brief is private and belongs to you.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default BriefView;
