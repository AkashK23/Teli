import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ShowTooltipProps {
  show: {
    name?: string;
    first_air_date?: string;
    rating?: number;
    overview?: string;
  };
  children: React.ReactNode;
}

export default function ShowTooltip({ show, children }: ShowTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Log contents for debugging
  useEffect(() => {
    if (visible) {
      const displayData = Object.fromEntries(
        Object.entries({
          title: show.name,
          year: show.first_air_date,
          rating: show.rating,
          overview: show.overview,
        }).filter(([_, value]) => value)
      );
      console.log("Tooltip contents:", displayData);
    }
  }, [visible, show]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX + 12, y: e.clientY + 12 });
  };

  const tooltip = visible && (
    <div
      className="show-tooltip-box"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 9999,
      }}
    >
      {(show.name || show.first_air_date || show.rating) && (
        <div className="tooltip-header">
          <span className="tooltip-title">
            {show.name}
            {show.first_air_date
              ? ` (${new Date(show.first_air_date).getFullYear()})`
              : ""}
          </span>
          {show.rating && (
            <span className="tooltip-rating">{show.rating.toFixed(1)}</span>
          )}
        </div>
      )}
      {show.overview && (
        <p className="show-tooltip-overview">{show.overview}</p>
      )}
    </div>
  );

  return (
    <div
      className="show-tooltip-target"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {createPortal(tooltip, document.body)}
    </div>
  );
}
