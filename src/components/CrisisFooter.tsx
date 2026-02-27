import { Phone } from "lucide-react";

const CrisisFooter = () => {
  return (
    <footer className="w-full border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-3 text-sm text-muted-foreground">
        <Phone className="h-3.5 w-3.5 text-clay" />
        <span>
          If you're in crisis, contact the{" "}
          <a
            href="https://988lifeline.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            988 Suicide &amp; Crisis Lifeline
          </a>{" "}
          — call or text <span className="font-semibold">988</span>
        </span>
      </div>
    </footer>
  );
};

export default CrisisFooter;
