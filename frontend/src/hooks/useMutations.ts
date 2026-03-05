import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  updateWatchStatus,
  deleteWatchStatus,
  postFollow,
  postUnfollow,
  updateUserProfile,
  deleteUser,
} from "../api/users";
import { submitRating, submitEpisodeRating } from "../api/shows";

export function useUpdateWatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWatchStatus,
    onSuccess: (_, { user_id, show_id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.watchStatus(user_id, show_id),
      });
      queryClient.invalidateQueries({
        queryKey: ["user", user_id, "watch-list"],
      });
    },
  });
}

export function useDeleteWatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWatchStatus,
    onSuccess: (_, { user_id, show_id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.watchStatus(user_id, show_id),
      });
      queryClient.invalidateQueries({
        queryKey: ["user", user_id, "watch-list"],
      });
    },
  });
}

export function useSubmitRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitRating,
    onSuccess: (_, payload: any) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.ratings(payload.user_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.show.averageRating(payload.show_id),
      });
    },
  });
}

export function useSubmitEpisodeRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitEpisodeRating,
    onSuccess: (_, payload: any) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.episodeRatings(
          payload.user_id,
          payload.show_id,
          payload.season_number
        ),
      });
    },
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      followerId,
      followeeId,
    }: {
      followerId: string;
      followeeId: string;
    }) => postFollow(followerId, followeeId),
    onSuccess: (_, { followerId, followeeId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.following(followerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.followers(followeeId),
      });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      followerId,
      followeeId,
    }: {
      followerId: string;
      followeeId: string;
    }) => postUnfollow(followerId, followeeId),
    onSuccess: (_, { followerId, followeeId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.following(followerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.followers(followeeId),
      });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: object;
    }) => updateUserProfile(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.profile(userId),
      });
    },
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
  });
}
