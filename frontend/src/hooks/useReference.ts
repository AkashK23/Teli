import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { getGenres, getCountries, getLanguages } from "../api/reference";

export function useGenres() {
  return useQuery({
    queryKey: queryKeys.ref.genres(),
    queryFn: getGenres,
    staleTime: Infinity,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: queryKeys.ref.countries(),
    queryFn: getCountries,
    staleTime: Infinity,
  });
}

export function useLanguages() {
  return useQuery({
    queryKey: queryKeys.ref.languages(),
    queryFn: getLanguages,
    staleTime: Infinity,
  });
}
