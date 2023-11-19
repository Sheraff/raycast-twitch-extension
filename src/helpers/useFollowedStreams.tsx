import { Toast, showToast } from "@raycast/api";
import { FollowedStreams } from "../interfaces/FollowedStreams";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import { useAuth } from "./auth";

export default function useFollowedStreams(userId: string | undefined) {
  const [_updatedAt, setUpdatedAt] = useCachedState<string>(`${CACHE_PREFIX}_followed_streams_updated_at`, zeroDate);
  const updatedAt = Number(_updatedAt);

  const { enabled, headers, onWillExecute } = useAuth();

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/streams/followed?user_id=${userId}`, {
    headers,
    onWillExecute,
    initialData: [] as FollowedStreams[],
    onData: () => setUpdatedAt(String(Date.now())),
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        return data.data as FollowedStreams[];
      }
      if (data.message) {
        showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
      }
      return [];
    },
    execute: enabled && Boolean(userId) && updatedAt + 60_000 < Date.now(),
  });

  return {
    data,
    isLoading,
    updatedAt,
  };
}
