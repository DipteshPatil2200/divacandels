import { Link } from "react-router-dom";

export function BrandLogo({ light = false }: { admin?: boolean; light?: boolean }) {
  return <Link to="/" className={`brand-logo${light ? " light" : ""}`} aria-label="DIVA Candles home"><img src="/diva-logo.jpg" alt="DIVA - Flame That Gives Joy"/></Link>;
}
