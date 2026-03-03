import { useQuery, useQueries } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  getUserProfile,
  getUserRatings,
  getUserFeed,
  getUserWatchList,
  getUserFollowers,
  getUserFollowing,
  getUserWatchStatus,
  getEpisodeReviews,
} from "../api/users";
import { getShowDetails } from "../api/shows";

export function useUserProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user.profile(userId ?? ""),
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
  });
}

export function useUserRatings(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user.ratings(userId ?? ""),
    queryFn: () => getUserRatings(userId!),
    enabled: !!userId,
  });
}

export function useUserFeed(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user.feed(userId ?? ""),
    queryFn: () => getUserFeed(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUserWatchList(
  userId: string | null | undefined,
  status: string
) {
  return useQuery({
    queryKey: queryKeys.user.watchList(userId ?? "", status),
    queryFn: () => getUserWatchList(userId!, status),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserFollowers(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user.followers(userId ?? ""),
    queryFn: () => getUserFollowers(userId!),
    enabled: !!userId,
  });
}

export function useUserFollowing(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user.following(userId ?? ""),
    queryFn: () => getUserFollowing(userId!),
    enabled: !!userId,
  });
}

export function useUserWatchStatus(
  userId: string | null | undefined,
  showId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.user.watchStatus(userId ?? "", showId ?? ""),
    queryFn: () => getUserWatchStatus(userId!, showId!),
    enabled: !!userId && !!showId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useEpisodeReviews(
  userId: string | null | undefined,
  showId: string | undefined,
  seasonNumber: number | null
) {
  return useQuery({
    queryKey: queryKeys.user.episodeRatings(
      userId ?? "",
      showId ?? "",
      seasonNumber ?? 0
    ),
    queryFn: () => getEpisodeReviews(userId!, showId!, seasonNumber!),
    enabled: !!userId && !!showId && seasonNumber !== null,
  });
}

// Fetches follower IDs then enriches with user profiles using parallel queries
export function useFollowerProfiles(userId: string | null | undefined) {
  const { data: followerIds = [], isLoading: idsLoading } =
    useUserFollowers(userId);

  const profileQueries = useQueries({
    queries: (followerIds as string[]).map((id) => ({
      queryKey: queryKeys.user.profile(id),
      queryFn: () => getUserProfile(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = idsLoading || profileQueries.some((q) => q.isLoading);
  const profiles = profileQueries.map((q) => q.data).filter(Boolean);

  return { data: profiles, isLoading };
}

// Fetches following IDs then enriches with user profiles using parallel queries
export function useFollowingProfiles(userId: string | null | undefined) {
  const { data: followingIds = [], isLoading: idsLoading } =
    useUserFollowing(userId);

  const profileQueries = useQueries({
    queries: (followingIds as string[]).map((id) => ({
      queryKey: queryKeys.user.profile(id),
      queryFn: () => getUserProfile(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = idsLoading || profileQueries.some((q) => q.isLoading);
  const profiles = profileQueries.map((q) => q.data).filter(Boolean);

  return { data: profiles, isLoading };
}

// Fetches watched show IDs and returns full TMDB show details (for stats computation)
export function useWatchedShowDetails(userId: string | null | undefined) {
  const { data: watchList = [], isLoading: listLoading } = useUserWatchList(
    userId,
    "watched"
  );

  const showQueries = useQueries({
    queries: (watchList as any[]).map((item) => ({
      queryKey: queryKeys.show.details(item.show_id),
      queryFn: () => getShowDetails(item.show_id),
      staleTime: 60 * 60 * 1000,
    })),
  });

  const isLoading = listLoading || showQueries.some((q) => q.isLoading);
  const shows = showQueries.map((q) => q.data).filter(Boolean);

  return { data: shows, isLoading };
}

// Fetches watch list IDs then enriches with show details using parallel queries
export function useEnrichedWatchList(
  userId: string | null | undefined,
  status: string
) {
  const { data: watchList = [], isLoading: listLoading } = useUserWatchList(
    userId,
    status
  );

  const showQueries = useQueries({
    queries: (watchList as any[]).map((item) => ({
      queryKey: queryKeys.show.details(item.show_id),
      queryFn: () => getShowDetails(item.show_id),
      staleTime: 60 * 60 * 1000,
    })),
  });

  const isLoading = listLoading;
  const enrichedShows = (watchList as any[]).map((item, i) => {
    const show = showQueries[i]?.data;
    const imagePath = show?.poster_path;
    const imageUrl = imagePath?.startsWith("http")
      ? imagePath
      : imagePath
      ? `https://image.tmdb.org/t/p/w500${imagePath}`
      : show?.image_url || show?.thumbnail || null;
    return {
      id: String(item.show_id),
      show_id: item.show_id,
      name: show?.name || item.show_name || "",
      overview: show?.overview,
      image_url: imageUrl,
      poster_path: show?.poster_path,
    };
  });

  return { data: enrichedShows, isLoading };
}
