import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  getShowDetails,
  getShowAverageRating,
  getPopularShows,
  filterShows,
  getShowSeason,
  getFollowedShowReviews, 
  getAllShowRatings,
  getFollowedEpisodeReviews, 
  getAllEpisodeRatings,
  getEpisodeAverageRating,
  getSuggestedShows,
} from "../api/shows";

export function useShowDetails(showId: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.show.details(showId ?? ""),
    queryFn: () => getShowDetails(showId!),
    enabled: !!showId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useShowAverageRating(showId: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.show.averageRating(showId ?? ""),
    queryFn: () => getShowAverageRating(showId!),
    enabled: !!showId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function usePopularShows(timeframe: number, count: number) {
  return useQuery({
    queryKey: queryKeys.show.popular(timeframe, count),
    queryFn: () => getPopularShows(timeframe, count),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useFilteredShows(
  params: Record<string, string>,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.show.filter(params),
    queryFn: () => filterShows(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useShowSeason(
  showId: string | undefined,
  seasonNumber: number | null
) {
  return useQuery({
    queryKey: queryKeys.show.season(showId ?? "", seasonNumber ?? 0),
    queryFn: () => getShowSeason(showId!, seasonNumber!),
    enabled: !!showId && seasonNumber !== null,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Returns reviews from followed users for a given show
export const useFollowedShowReviews = (
  userId: string | null | undefined,
  showId: string | undefined,
) => {
  return useQuery({
    queryKey: ["followedShowReviews", userId, showId],
    queryFn: () => getFollowedShowReviews(userId!, showId!),
    enabled: !!userId && !!showId,
    staleTime: 1000 * 60 * 2,
  });
};
 
// Returns all reviews for a given show
export const useAllShowRatings = (showId: string | undefined) => {
  return useQuery({
    queryKey: ["allShowRatings", showId],
    queryFn: () => getAllShowRatings(showId!),
    enabled: !!showId,
    staleTime: 1000 * 60 * 2,
  });
};

// Returns reviews from followed users for a given show
export const useFollowedEpisodeReviews = (
  userId: string | null | undefined,
  showId: string | undefined,
  season: number | null, 
  episode: number | null,
) => {
  return useQuery({
    queryKey: ["followedEpisodeReviews", userId, showId, season, episode],
    queryFn: () => getFollowedEpisodeReviews(userId!, showId!, season!, episode!),
    enabled: !!userId && !!showId && !!season && !!episode,
    staleTime: 1000 * 60 * 2,
  });
};
 
// Returns all reviews for a given show
export const useAllEpisodeRatings = (
  userId: string | null | undefined, 
  showId: string | undefined, 
  season: number | null, 
  episode: number | null,
) => {
  return useQuery({
    queryKey: ["allEpisodeRatings", userId, showId, season, episode],
    queryFn: () => getAllEpisodeRatings(userId!, showId!, season!, episode!),
    enabled: !!showId && !!season && !!episode,
    staleTime: 1000 * 60 * 2,
  });
};

export const useEpisodeAverageRating = (
  showId: string | undefined,
  seasonNumber: number | null,
  episodeNumber: number | null,
) => {
  return useQuery({
    queryKey: ["episodeAverageRating", showId, seasonNumber, episodeNumber],
    queryFn: () => getEpisodeAverageRating(showId!, seasonNumber!, episodeNumber!),
    enabled: !!showId && seasonNumber !== null && episodeNumber !== null,
    staleTime: 1000 * 60 * 2,
  });
};

export const useSuggestedShows = (
  userId: string | null | undefined,
) => {
  return useQuery({
    queryKey: ["suggestedShows", userId],
    queryFn: () => getSuggestedShows(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};
