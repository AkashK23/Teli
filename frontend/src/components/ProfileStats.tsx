import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Rating {
  rating: number;
  timestamp: string;
}

interface ShowDetails {
  genres?: Array<{ id: number; name: string }>;
  number_of_episodes?: number;
  episode_run_time?: number[];
}

interface ProfileStatsProps {
  ratings: Rating[];
  watchedShows: ShowDetails[];
  watchedCount: number;
  isLoadingShows: boolean;
}

function buildHeatmapGrid(activityByDate: Record<string, number>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);

  const cells: Array<{ date: string; count: number; inRange: boolean }> = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const iso = cursor.toISOString().slice(0, 10);
    cells.push({
      date: iso,
      count: activityByDate[iso] ?? 0,
      inRange:
        cursor >=
        new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}

function intensityClass(count: number, inRange: boolean): string {
  if (!inRange) return "heatmap-cell heatmap-cell--out";
  if (count === 0) return "heatmap-cell heatmap-cell--l0";
  if (count === 1) return "heatmap-cell heatmap-cell--l1";
  if (count <= 3) return "heatmap-cell heatmap-cell--l2";
  return "heatmap-cell heatmap-cell--l3";
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ProfileStats({
  ratings,
  watchedShows,
  watchedCount,
  isLoadingShows,
}: ProfileStatsProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    count: number;
  } | null>(null);

  const ratingDistribution = useMemo(() => {
    const dist: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) dist[i] = 0;
    ratings.forEach((r) => {
      dist[r.rating] = (dist[r.rating] ?? 0) + 1;
    });
    return Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: dist[i + 1],
    }));
  }, [ratings]);

  const activityByDate = useMemo(() => {
    const map: Record<string, number> = {};
    ratings.forEach((r) => {
      const date = r.timestamp.slice(0, 10);
      map[date] = (map[date] ?? 0) + 1;
    });
    return map;
  }, [ratings]);

  const genreBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    watchedShows.forEach((show) => {
      show.genres?.forEach((g) => {
        counts[g.name] = (counts[g.name] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([genre, count]) => ({ genre, count }));
  }, [watchedShows]);

  const hoursWatched = useMemo(() => {
    const mins = watchedShows.reduce((total, show) => {
      const episodes = show.number_of_episodes ?? 0;
      const runtime = show.episode_run_time?.[0] ?? 45;
      return total + episodes * runtime;
    }, 0);
    return Math.round(mins / 60);
  }, [watchedShows]);

  const avgRating = useMemo(() => {
    if (!ratings.length) return 0;
    return ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length;
  }, [ratings]);

  const criticLabel = useMemo(() => {
    if (!ratings.length) return "";
    const avg = avgRating.toFixed(1);
    if (avgRating < 5.5) return `You're a tough critic — ${avg} avg ★`;
    if (avgRating < 7) return `You're a balanced rater — ${avg} avg ★`;
    return `You're a generous rater — ${avg} avg ★`;
  }, [avgRating, ratings.length]);

  const heatmapCells = useMemo(
    () => buildHeatmapGrid(activityByDate),
    [activityByDate],
  );

  const monthPositions = useMemo(() => {
    const positions: Array<{ label: string; colIndex: number }> = [];
    let lastMonth = -1;
    heatmapCells.forEach((cell, i) => {
      if (!cell.inRange) return;
      const col = Math.floor(i / 7);
      const month = new Date(cell.date).getMonth();
      if (month !== lastMonth) {
        positions.push({ label: MONTH_LABELS[month], colIndex: col });
        lastMonth = month;
      }
    });
    return positions;
  }, [heatmapCells]);

  const totalCols = Math.ceil(heatmapCells.length / 7);

  if (ratings.length === 0 && watchedCount === 0) {
    return (
      <div className="profile-stats-card">
        <div className="psc-header">
          <span className="psc-title">Your Stats</span>
        </div>
        <div className="psc-body">
          <p className="stats-empty-msg">
            Start watching and rating shows to unlock your personal stats!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-stats-card">
      <div className="psc-header">
        <span className="psc-title">Your Stats</span>
      </div>
      <div className="psc-body">
        {/* Summary Cards */}
        <div className="stats-summary-cards">
          <div className="stats-summary-card">
            <div className="stats-card-number">{watchedCount}</div>
            <div className="stats-card-label">Shows Watched</div>
          </div>
          <div className="stats-summary-card">
            {isLoadingShows ? (
              <div className="stats-card-number stats-card-loading">—</div>
            ) : (
              <div className="stats-card-number">
                {hoursWatched.toLocaleString()}h
              </div>
            )}
            <div className="stats-card-label">Est. Hours Watched</div>
          </div>
          <div className="stats-summary-card">
            <div className="stats-card-number">{ratings.length}</div>
            <div className="stats-card-label">Reviews Given</div>
          </div>
          <div className="stats-summary-card">
            <div className="stats-card-number">
              {ratings.length ? avgRating.toFixed(1) : "—"}
            </div>
            <div className="stats-card-label">Avg Rating</div>
          </div>
        </div>

        {/* Charts Row */}
        {ratings.length > 0 && (
          <div className="stats-charts-row">
            <div className="stats-chart-container">
              <h4 className="stats-chart-title">Rating Distribution</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={ratingDistribution}
                  margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                >
                  <XAxis dataKey="score" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      value ?? 0,
                      "Reviews",
                    ]}
                    labelFormatter={(label) => `Score: ${label}`}
                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#333" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {genreBreakdown.length > 0 && (
              <div className="stats-chart-container">
                <h4 className="stats-chart-title">Top Genres</h4>
                {isLoadingShows ? (
                  <div className="stats-chart-loading">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={genreBreakdown}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="genre"
                        tick={{ fontSize: 11 }}
                        width={72}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          value ?? 0,
                          "Shows",
                        ]}
                        contentStyle={{ fontSize: 12, borderRadius: 6 }}
                      />
                      <Bar dataKey="count" fill="#333" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activity Heatmap */}
        {ratings.length > 0 && (
          <div className="stats-chart-container stats-heatmap-container">
            <h4 className="stats-chart-title">Activity — Past Year</h4>
            <div className="heatmap-wrapper">
              <div
                className="heatmap-month-labels"
                style={{ gridTemplateColumns: `repeat(${totalCols}, 13px)` }}
              >
                {monthPositions.map(({ label, colIndex }) => (
                  <span
                    key={`${label}-${colIndex}`}
                    className="heatmap-month-label"
                    style={{ gridColumnStart: colIndex + 1 }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div
                className="heatmap-grid"
                style={{ gridTemplateColumns: `repeat(${totalCols}, 13px)` }}
              >
                {heatmapCells.map((cell) => (
                  <div
                    key={cell.date}
                    className={intensityClass(cell.count, cell.inRange)}
                    onMouseEnter={() =>
                      cell.inRange &&
                      setHoveredCell({ date: cell.date, count: cell.count })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                    title={
                      cell.inRange
                        ? `${cell.date}: ${cell.count} review${cell.count !== 1 ? "s" : ""}`
                        : ""
                    }
                  />
                ))}
              </div>
              {hoveredCell && (
                <div className="heatmap-tooltip">
                  <strong>{hoveredCell.date}</strong>
                  <span>
                    {hoveredCell.count} review
                    {hoveredCell.count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {criticLabel && <p className="stats-critic-label">{criticLabel}</p>}
      </div>
    </div>
  );
}
