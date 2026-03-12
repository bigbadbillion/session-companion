import { cn } from "@/lib/utils";

const headerStyles =
  "font-display font-bold text-foreground tracking-tight";

interface PreludeBrandProps {
  className?: string;
  /** Size variant for different header contexts. Default: base (text-lg) */
  size?: "sm" | "base" | "lg";
}

const sizeClasses = {
  sm: "text-base",
  base: "text-lg",
  lg: "text-xl",
};

const PreludeBrand = ({ className, size = "base" }: PreludeBrandProps) => (
  <span className={cn(headerStyles, sizeClasses[size], className)}>Prelude</span>
);

export default PreludeBrand;
