import { Clock3 } from "lucide-react";
import "../workforce.css";
export function WorkforceLoadingScreen() {
  return (
    <div
      className="wf wf-route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div>
        <span className="wf-route-loading-icon">
          <Clock3 size={32} />
        </span>
        <strong>MGL Business</strong>
        <p>Цагийн удирдлага ачаалж байна…</p>
      </div>
    </div>
  );
}
