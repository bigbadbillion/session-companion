import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** Update the current user's display name (e.g. after email sign-up so the agent can address them). */
  updateDisplayName: (displayName: string) => Promise<void>;
  /** Send verification email to current user (email/password sign-ups). Call after sign-up to reduce fake sign-ups. */
  sendEmailVerificationForCurrentUser: () => Promise<void>;
  /** Reload user from Firebase (e.g. after they clicked the verification link so emailVerified is up to date). */
  reloadUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Popup sign-in failed, falling back to redirect:", err.code, err.message);
      await signInWithRedirect(auth, googleProvider);
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateDisplayName = async (displayName: string) => {
    const u = auth.currentUser;
    if (!u) throw new Error("No user signed in");
    await updateProfile(u, { displayName: displayName.trim() });
    setUser({ ...u, displayName: displayName.trim() });
  };

  const sendEmailVerificationForCurrentUser = async () => {
    const u = auth.currentUser;
    if (!u) throw new Error("No user signed in");
    await sendEmailVerification(u);
  };

  const reloadUser = async () => {
    const u = auth.currentUser;
    if (!u) return;
    await reload(u);
    setUser(auth.currentUser ? { ...auth.currentUser } : null);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmailPassword, signUpWithEmailPassword, sendPasswordReset, updateDisplayName, sendEmailVerificationForCurrentUser, reloadUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
