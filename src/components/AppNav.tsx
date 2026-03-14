import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Clock, BarChart3, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import preludeLogo from "@/assets/prelude-logo.png";
import PreludeBrand from "@/components/PreludeBrand";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/trends", icon: BarChart3, label: "Trends" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const AppNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg md:static md:border-t-0 md:border-r md:border-border/60 md:h-screen md:w-64 md:flex-shrink-0 md:bg-card/50">
      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 px-5 py-5 border-b border-border/60 bg-gradient-to-b from-sage-light/40 to-transparent">
        <img src={preludeLogo} alt="Prelude" className="h-11 w-11 rounded-xl object-contain flex-shrink-0 shadow-soft" />
        <div>
          <PreludeBrand size="base" className="leading-none block" />
          <span className="text-[11px] text-muted-foreground/70 font-medium tracking-wide">Therapy Prep</span>
        </div>
      </div>

      <div className="flex md:flex-col md:py-5 md:gap-1 md:px-3">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Tooltip key={to} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  to={to}
                  className={cn(
                    "relative flex flex-1 md:flex-none items-center justify-center md:justify-start gap-3 py-3 md:py-2.5 md:px-4 md:rounded-xl text-xs md:text-sm font-medium transition-all duration-200",
                    active
                      ? "text-primary md:bg-sage-light/80 md:shadow-sm"
                      : "text-muted-foreground hover:text-foreground md:hover:bg-muted/40"
                  )}
                >
                  {active && (
                    <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                  )}
                  <Icon className={cn("h-5 w-5 transition-all duration-200", active && "scale-110 text-primary")} />
                  <span className="hidden md:inline">{label}</span>
                  <span className="md:hidden mt-1">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="md:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Desktop user + sign out */}
      <div className="hidden md:block mt-auto px-4 py-5">
        <Separator className="mb-4 opacity-50" />
        {user && (
          <div className="flex items-center gap-3 px-3 mb-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-sage-light flex items-center justify-center text-xs font-semibold text-primary">
                {user.displayName?.[0] || "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 group"
        >
          <LogOut className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default AppNav;
