import { Toast, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import Item from "../interfaces/FollowingItem";
import { headers } from "./auth";

export default function useLiveChannels(query: string) {
  const [updatedAt, setUpdatedAt] = useCachedState<string>(
    `${CACHE_PREFIX}_live_channels_${query}_updated_at`,
    zeroDate,
  );

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/search/channels?query=${query}&live_only=true`, {
    headers,
    initialData: [] as Item[],
    onData: () => setUpdatedAt(String(Date.now())),
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        return data.data as Item[];
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
