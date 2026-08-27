import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export function PageTransitionLoader() {
  const location = useLocation(); const initial = useRef(true); const [visible, setVisible] = useState(false);
  useEffect(() => { if (initial.current) { initial.current = false; return; } setVisible(true); const timer = window.setTimeout(() => setVisible(false), 1200); return () => window.clearTimeout(timer); }, [location.pathname, location.search]);
  return visible ? <div className="route-loader" role="status" aria-live="polite"><div><span className="route-loader-ring"/><strong>DIVA Candles</strong><small>Illuminating your experience…</small></div></div> : null;
}
