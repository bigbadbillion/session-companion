import { useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

const Settings = () => {
  const { user, updateDisplayName } = useAuth();
  const [displayNameEdit, setDisplayNameEdit] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  const handleSaveName = async () => {
    const name = displayNameEdit.trim();
    if (!name) return;
    setNameLoading(true);
    try {
      await updateDisplayName(name);
      setDisplayNameEdit("");
      toast.success("Name updated. The agent will use it in sessions.");
    } catch (error: unknown) {
      toast.error((error as Error).message ?? "Could not update name.");
    } finally {
      setNameLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          <motion.h1 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
            Settings
          </motion.h1>

          <div className="space-y-4">
            {/* Account */}
            <motion.div variants={fadeUp} custom={1}>
              <Card className="shadow-soft rounded-2xl border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-sage-light flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Account</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Name", value: user?.displayName || "—" },
                    { label: "Email", value: user?.email || "—" },
                    { label: "Signed in with", value: user?.providerData?.[0]?.providerId === "google.com" ? "Google" : user?.providerData?.[0]?.providerId === "password" ? "Email" : user?.providerData?.[0]?.providerId ?? "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.value}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <Label className="text-xs text-muted-foreground">Display name (used by the voice agent)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={user?.displayName || "Your first name or nickname"}
                        value={displayNameEdit}
                        onChange={(e) => setDisplayNameEdit(e.target.value)}
                        className="rounded-lg flex-1"
                      />
                      <Button size="sm" className="rounded-lg" onClick={handleSaveName} disabled={nameLoading || !displayNameEdit.trim()}>
                        {nameLoading ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Subscription */}
            <motion.div variants={fadeUp} custom={2}>
              <Card className="shadow-soft rounded-2xl border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-earth" />
                    </div>
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Subscription</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-sm font-medium text-foreground">Pro Plan (free till May)</span>
                      <p className="text-xs text-muted-foreground">$14/month · Unlimited sessions</p>
                    </div>
                    <Badge className="bg-sage-light text-primary border-0">Active</Badge>
                  </div>
                  <Button variant="outline" size="sm">Manage Subscription</Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Privacy */}
            <motion.div variants={fadeUp} custom={3}>
              <Card className="shadow-soft rounded-2xl border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-sage-light flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Privacy</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Your data is private and belongs only to you. Prelude never shares your sessions or briefs with anyone — including therapists — unless you choose to.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm">Privacy Policy</Button>
                    <Button variant="outline" size="sm">Terms of Service</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <Separator />

            {/* Danger Zone */}
            <motion.div variants={fadeUp} custom={4}>
              <Card className="shadow-soft border-destructive/20 rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </div>
                    <CardTitle className="text-sm uppercase tracking-wider text-destructive">Delete Account</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    This will permanently delete your account and all data — sessions, briefs, and patterns. This cannot be undone.
                  </p>
                  <Button variant="destructive" size="sm">Delete My Account & All Data</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Settings;
