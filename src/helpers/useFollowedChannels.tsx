import { Toast, showToast } from "@raycast/api";
import { FollowedChannel } from "../interfaces/FollowedChannel";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import { headers } from "./auth";

export default function useFollowedChannels(userId: string) {
  const [updatedAt, setUpdatedAt] = useCachedState<string>(`${CACHE_PREFIX}_followed_channels_updated_at`, zeroDate);

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/channels/followed?user_id=${userId}`, {
    headers,
    initialData: [] as FollowedChannel[],
    onData: () => setUpdatedAt(String(Date.now())),
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        return data.data as FollowedChannel[];
      }
      if (data.message) {
        showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
      }
      return [];
    },
    execute: Boolean(userId) && Number(updatedAt) + 600_000 < Date.now(),
  });

  return {
    data,
    isLoading,
    updatedAt,
  };
}
