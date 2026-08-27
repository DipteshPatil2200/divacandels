import { ExternalLink } from "lucide-react";

export function DeveloperCredit({ compact = false }: { compact?: boolean }) {
  return <p className={`developer-credit${compact ? " compact" : ""}`}>
    <span>Designed &amp; developed by</span>
    <a href="https://www.sssgrowtech.co.in" target="_blank" rel="noopener noreferrer" aria-label="Visit SSS Growtech website">
      SSS Growtech <ExternalLink aria-hidden="true"/>
    </a>
  </p>;
}
