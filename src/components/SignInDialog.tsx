import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const {
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    sendPasswordReset,
    updateDisplayName,
    sendEmailVerificationForCurrentUser,
  } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/redirect-cancelled-by-user") {
        toast.error(err.message || "Sign-in failed");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (isSignUp: boolean) => {
    if (!email.trim() || !password) {
      toast.error("Please enter email and password.");
      return;
    }
    if (isSignUp) {
      if (!displayName.trim()) {
        toast.error("Please enter your name.");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
    }
    setEmailLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmailPassword(email.trim(), password);
        await updateDisplayName(displayName.trim());
        await sendEmailVerificationForCurrentUser();
        onOpenChange(false);
        setEmail("");
        setPassword("");
        setDisplayName("");
        toast.success("Account created. Check your email to verify your address — then you can start sessions.");
      } else {
        await signInWithEmailPassword(email.trim(), password);
        onOpenChange(false);
        setEmail("");
        setPassword("");
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const message =
        err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
          ? "Invalid email or password."
          : err.code === "auth/email-already-in-use"
            ? "This email is already registered. Sign in instead."
            : err.code === "auth/invalid-email"
              ? "Please enter a valid email."
              : err.message || "Something went wrong.";
      toast.error(message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToUse = forgotEmail.trim() || email.trim();
    if (!emailToUse) {
      toast.error("Enter your email to reset password.");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordReset(emailToUse);
      toast.success("Check your email for a reset link.");
      setShowForgot(false);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      toast.error(err.message || "Could not send reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <>
        <DialogHeader>
          <DialogTitle>Sign in to Prelude</DialogTitle>
          <DialogDescription>
            Use Google or your email. Your data stays private and is only used for your prep sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or with email</span>
            </div>
          </div>

          {showForgot ? (
            <div className="space-y-3">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setShowForgot(false)}
                  disabled={resetLoading}
                >
                  Back
                </Button>
                <Button
                  className="rounded-lg flex-1"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="w-full grid grid-cols-2 rounded-lg">
                <TabsTrigger value="signin" className="rounded-lg">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setShowForgot(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-lg"
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  className="w-full rounded-full gap-2"
                  onClick={() => handleEmailSubmit(false)}
                  disabled={emailLoading}
                >
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Sign in with email
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name (for the voice agent to use)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="e.g. Alex"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="rounded-lg"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password (min 6 characters)</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-lg"
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  className="w-full rounded-full gap-2"
                  onClick={() => handleEmailSubmit(true)}
                  disabled={emailLoading || !displayName.trim()}
                >
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Create account
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
