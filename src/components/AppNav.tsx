import { Link, useLocation } from "react-router-dom";
import { Home, Clock, BarChart3, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import preludeLogo from "@/assets/prelude-logo.png";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/trends", icon: BarChart3, label: "Trends" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const AppNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-md md:static md:border-t-0 md:border-r md:h-screen md:w-64 md:flex-shrink-0">
      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-border">
        <img src={preludeLogo} alt="Prelude" className="h-10 w-10 rounded-xl object-cover" />
        <span className="font-display text-lg font-semibold text-foreground">Prelude</span>
      </div>

      <div className="flex md:flex-col md:py-4 md:gap-0.5">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Tooltip key={to} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  to={to}
                  className={cn(
                    "relative flex flex-1 md:flex-none items-center justify-center md:justify-start gap-3 py-3 md:py-2.5 md:px-6 text-xs md:text-sm font-medium transition-all duration-200",
                    active
                      ? "text-primary md:bg-sage-light"
                      : "text-muted-foreground hover:text-foreground md:hover:bg-muted/50"
                  )}
                >
                  {active && (
                    <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
                  )}
                  <Icon className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")} />
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

      {/* Desktop sign out */}
      <div className="hidden md:block mt-auto px-6 py-4">
        <Separator className="mb-4" />
        <Link
          to="/"
          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <LogOut className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Sign Out
        </Link>
      </div>
    </nav>
  );
};

export default AppNav;
