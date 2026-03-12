import { Tv } from "lucide-react";

interface ShowPlaceholderProps {
  className?: string;
  name?: string;
}

export default function ShowPlaceholder({ className, name }: ShowPlaceholderProps) {
  return (
    <div className={`show-placeholder ${className || ""}`}>
      <Tv className="show-placeholder-icon" />
      {name && <span className="show-placeholder-name">{name}</span>}
    </div>
  );
}
