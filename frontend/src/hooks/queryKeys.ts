export const queryKeys = {
  show: {
    details: (id: string | number) => ["shows", String(id), "details"] as const,
    averageRating: (id: string | number) =>
      ["shows", String(id), "average-rating"] as const,
    popular: (timeframe: number, count: number) =>
      ["shows", "popular", timeframe, count] as const,
    filter: (params: object) => ["shows", "filter", params] as const,
    season: (showId: string, seasonNum: number) =>
      ["shows", showId, "season", seasonNum] as const,
  },
  user: {
    profile: (id: string) => ["user", id, "profile"] as const,
    ratings: (id: string) => ["user", id, "ratings"] as const,
    feed: (id: string) => ["user", id, "feed"] as const,
    watchList: (id: string, status: string) =>
      ["user", id, "watch-list", status] as const,
    watchStatus: (userId: string, showId: string) =>
      ["user", userId, "watch-status", showId] as const,
    followers: (id: string) => ["user", id, "followers"] as const,
    following: (id: string) => ["user", id, "following"] as const,
    episodeRatings: (userId: string, showId: string, seasonNum: number) =>
      ["user", userId, "shows", showId, "season", seasonNum, "episode-ratings"] as const,
  },
  ref: {
    genres: () => ["ref", "genres"] as const,
    countries: () => ["ref", "countries"] as const,
    languages: () => ["ref", "languages"] as const,
  },
};
