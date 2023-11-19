import { Toast, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import Game from "../interfaces/Game";
import { headers } from "./auth";

export default function useLiveGames(query: string) {
  const [updatedAt, setUpdatedAt] = useCachedState<string>(`${CACHE_PREFIX}_live_games_${query}_updated_at`, zeroDate);

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/search/categories?query=${query}&live_only=true`, {
    headers,
    initialData: [] as Game[],
    onData: () => setUpdatedAt(String(Date.now())),
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        return data.data as Game[];
      }
      if (data.message) {
        showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
      }
      return [];
    },
    execute: Boolean(query) && Number(updatedAt) + 10_000 < Date.now(),
  });

  return {
    data,
    isLoading,
    updatedAt,
  };
}
