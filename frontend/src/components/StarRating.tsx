import React, { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="star-rating-container">
      <div className="star-rating-stars">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= display ? "star-filled" : "star-empty"}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star === value ? 0 : star)}
            aria-label={`Rate ${star} out of 10`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="star-rating-value">{value > 0 ? value : "–"}</span>
    </div>
  );
}
