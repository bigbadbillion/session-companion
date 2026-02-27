import { motion } from "framer-motion";
import { User, Shield, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";

const Settings = () => {
  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
            Settings
          </h1>

          <div className="space-y-6">
            {/* Account */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Name</span>
                  <span className="text-sm text-muted-foreground">Alex Johnson</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Email</span>
                  <span className="text-sm text-muted-foreground">alex@example.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Signed in with</span>
                  <span className="text-sm text-muted-foreground">Google</span>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subscription</h3>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-sm font-medium text-foreground">Pro Plan</span>
                  <p className="text-xs text-muted-foreground">$14/month · Unlimited sessions</p>
                </div>
                <span className="text-xs bg-sage-light text-primary px-2.5 py-1 rounded-full font-medium">Active</span>
              </div>
              <Button variant="outline" size="sm">Manage Subscription</Button>
            </div>

            {/* Privacy */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Privacy</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Your data is private and belongs only to you. Prelude never shares your sessions or briefs with anyone — including therapists — unless you choose to.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">Privacy Policy</Button>
                <Button variant="outline" size="sm">Terms of Service</Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <Trash2 className="h-4 w-4 text-destructive" />
                <h3 className="font-display text-sm font-semibold text-destructive uppercase tracking-wider">Delete Account</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                This will permanently delete your account and all data — sessions, briefs, and patterns. This cannot be undone.
              </p>
              <Button variant="destructive" size="sm">Delete My Account & All Data</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Settings;
