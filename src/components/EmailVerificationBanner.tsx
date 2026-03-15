import { useState } from "react";
import { Mail, Loader2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** Shows when user signed in with email/password and has not verified their email. */
export default function EmailVerificationBanner() {
  const { user, sendEmailVerificationForCurrentUser, reloadUser } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isEmailProvider = user?.providerData?.some((p) => p.providerId === "password");
  const needsVerification = isEmailProvider && user && !user.emailVerified;

  if (!needsVerification || dismissed) return null;

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await sendEmailVerificationForCurrentUser();
      toast.success("Verification email sent. Check your inbox.");
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a few minutes before requesting another email.");
      } else {
        toast.error(err.message || "Could not send verification email.");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleReload = async () => {
    setReloadLoading(true);
    try {
      await reloadUser();
      toast.success("Email verified. You're all set.");
    } catch {
      toast.error("Could not refresh. Try signing out and back in.");
    } finally {
      setReloadLoading(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-100 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm">
          Verify your email to prevent fake sign-ups and to start voice sessions. Check your inbox for the link.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-amber-500/50 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
          onClick={handleResend}
          disabled={resendLoading}
        >
          {resendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resend email"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-amber-800 dark:text-amber-200"
          onClick={handleReload}
          disabled={reloadLoading}
        >
          {reloadLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          I&apos;ve verified
        </Button>
        <button
          type="button"
          className="p-1 rounded hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
