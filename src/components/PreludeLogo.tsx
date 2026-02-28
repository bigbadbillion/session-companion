import { cn } from "@/lib/utils";

interface PreludeLogoProps {
  className?: string;
  color?: string;
}

const PreludeLogo = ({ className, color = "currentColor" }: PreludeLogoProps) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-primary", className)}
  >
    {/* Speech bubble outline */}
    <path
      d="M16 3C9 3 3.5 7.8 3.5 13.8c0 3.3 1.7 6.3 4.3 8.4l-1.6 4.6c-.12.4.32.74.68.54l5-2.8c1.2.32 2.6.5 4.1.5 7 0 12.5-4.8 12.5-10.8S23 3 16 3z"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Central brain fissure - sinuous vertical line */}
    <path
      d="M15.5 7.5c1.5 2 -1 4 1 6 -1.5 2 1 4 -1 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Left hemisphere folds */}
    <path
      d="M7 10.5c2.5 0 5 1.5 7 3.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6 16c3 0 6 1.5 8.5 3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Right hemisphere folds */}
    <path
      d="M17.5 8c2 1.5 5 2.5 8 1.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M18 14c2.5 1 5 .5 7-1"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M15.5 19.5c2 .5 5-.5 7-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default PreludeLogo;
