import { useNavigate } from "react-router-dom";

export function BackLink({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return (
    <div className="backbar">
      <button type="button" className="back-link" onClick={() => navigate(to)}>
        <span className="chev" aria-hidden="true">
          ›
        </span>
        {label}
      </button>
    </div>
  );
}
