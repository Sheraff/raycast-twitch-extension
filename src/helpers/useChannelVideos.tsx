import { Toast, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Video } from "../interfaces/Video";
import { CACHE_PREFIX, zeroDate } from "./cache";
import { useAuth } from "./auth";

export default function useChannelVideos(channelId: string | undefined) {
  const [updatedAt, setUpdatedAt] = useCachedState<string>(
    `${CACHE_PREFIX}_channel_videos_${channelId}_updated_at`,
    zeroDate,
  );

  const { enabled, headers, onWillExecute } = useAuth();

  const {
    data: { cursor, videos },
    isLoading,
  } = useFetch(`https://api.twitch.tv/helix/videos?user_id=${channelId}`, {
    headers,
    onWillExecute,
    initialData: { cursor: undefined, videos: [] as Video[] },
    keepPreviousData: true,
    onData: () => setUpdatedAt(String(Date.now())),
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (!data || !data.data) {
        if (data.error && data.message) {
          showToast({ title: "Error loading channel VODs", message: data.message, style: Toast.Style.Failure });
        }
        return { cursor: undefined, videos: [] as Video[] };
      }
      return {
        cursor: data.pagination.cursor as string | undefined,
        videos: data.data as Video[],
      };
    },
    execute: enabled && Boolean(channelId) && Number(updatedAt) + 60_000 < Date.now(),
  });

  return {
    cursor,
    videos,
    isLoading,
  };
}
