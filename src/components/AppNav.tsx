import { Link, useLocation } from "react-router-dom";
import { Home, Clock, BarChart3, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <div className="hidden md:flex items-center gap-2 px-6 py-6 border-b border-border">
        <img src={preludeLogo} alt="Prelude" className="h-9 w-9 rounded-lg" />
        <span className="font-display text-lg font-semibold text-foreground">Prelude</span>
      </div>

      <div className="flex md:flex-col md:py-4 md:gap-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 md:flex-none items-center justify-center md:justify-start gap-3 py-3 md:py-2.5 md:px-6 text-xs md:text-sm font-medium transition-colors",
                active
                  ? "text-primary md:bg-sage-light"
                  : "text-muted-foreground hover:text-foreground md:hover:bg-muted/50"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden md:inline">{label}</span>
              <span className="md:hidden mt-1">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop sign out */}
      <div className="hidden md:block mt-auto px-6 py-4 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Link>
      </div>
    </nav>
  );
};

export default AppNav;
