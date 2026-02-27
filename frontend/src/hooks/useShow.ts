import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  getShowDetails,
  getShowAverageRating,
  getPopularShows,
  filterShows,
  getShowSeason,
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
