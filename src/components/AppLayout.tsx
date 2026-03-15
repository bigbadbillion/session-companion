import { ReactNode } from "react";
import AppNav from "./AppNav";
import CrisisFooter from "./CrisisFooter";
import EmailVerificationBanner from "./EmailVerificationBanner";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNav />
      <div className="flex flex-1 flex-col">
        <EmailVerificationBanner />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <CrisisFooter />
      </div>
    </div>
  );
};

export default AppLayout;
