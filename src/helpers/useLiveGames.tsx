import { Toast, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import Game from "../interfaces/Game";
import { useAuth } from "./auth";

export default function useLiveGames(query: string | undefined) {
  const [updatedAt, setUpdatedAt] = useCachedState<string>(`${CACHE_PREFIX}_live_games_${query}_updated_at`, zeroDate);

  const { enabled, headers, onWillExecute } = useAuth();

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/search/categories?query=${query}&live_only=true`, {
    headers,
    onWillExecute,
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
    execute: enabled && Boolean(query) && Number(updatedAt) + 10_000 < Date.now(),
  });

  return {
    data,
    isLoading,
    updatedAt,
  };
}
