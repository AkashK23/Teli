import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import ShowPosterCard from "./ShowPosterCard";

/* ---------- Edit these by hand ---------- */
const FEATURED_REVIEWS = [
  {
    showId: 1396,
    author: "Walter W.",
    avatarUrl: "",
    rating: 9.0,
    date: "2 weeks ago",
    comment: "I am the one who knocks.",
  },
  {
    showId: 1668,
    author: "Ross G.",
    avatarUrl: "",
    rating: 8.5,
    date: "1 month ago",
    comment: "We were on a break!",
  },
  {
    showId: 456,
    author: "Homer S.",
    avatarUrl: "",
    rating: 9.5,
    date: "3 days ago",
    comment: "Doh!",
  },
];
/* ---------------------------------------- */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // animate once
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function FeaturedReviewRow({
  item,
  reverse,
}: {
  item: (typeof FEATURED_REVIEWS)[number];
  reverse: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`fr-row ${reverse ? "reverse" : ""} ${inView ? "in-view" : ""}`}
    >
      <div className="fr-poster">
        <ShowPosterCard showId={item.showId} className="show-icon home-icon" />
      </div>

      <div className="fr-connector" aria-hidden="true">
        <span className="fr-line" />
        <span className="fr-dot" />
      </div>

      <article className="fr-card">
        <header className="fr-card-header">
          {item.avatarUrl ? (
            <img src={item.avatarUrl} alt="" className="fr-avatar" />
          ) : (
            <span className="fr-avatar fr-avatar-initials">
              {item.author.charAt(0)}
            </span>
          )}
          <div className="fr-author">
            <strong>{item.author}</strong>
            <span>{item.date}</span>
          </div>
          <div className="fr-rating">
            <Star size={14} fill="currentColor" /> {item.rating.toFixed(1)}
          </div>
        </header>
        <p className="fr-comment">{item.comment}</p>
      </article>
    </div>
  );
}

export default function FeaturedReviews() {
  return (
    <div className="home-sections-row">
      <div className="home-section home-section-full login-left">
        {/* <h1 className="headings">What people are saying</h1> */}
        <div className="fr-list">
          {FEATURED_REVIEWS.map((item, i) => (
            <FeaturedReviewRow
              key={item.showId}
              item={item}
              reverse={i % 2 === 1} // 2nd, 4th... rows put the poster on the right
            />
          ))}
        </div>
      </div>
    </div>
  );
}
