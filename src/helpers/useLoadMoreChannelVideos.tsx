import { Toast, showToast } from "@raycast/api";
import { Video } from "../interfaces/Video";
import { useState } from "react";
import { useAuth } from "./auth";
import { useFetch } from "@raycast/utils";

export default function useLoadMoreChannelVideos(channelId: string | undefined, initialCursor: string | undefined) {
  const [enabled, setEnabled] = useState(false);
  const [cursor, setCursor] = useState(initialCursor);
  const [videos, setVideos] = useState<Video[]>([]);

  const { enabled: authEnabled, headers, onWillExecute } = useAuth();

  const { isLoading } = useFetch(`https://api.twitch.tv/helix/videos?user_id=${channelId}&after=${cursor}`, {
    headers,
    onWillExecute,
    onData: () => {
      setEnabled(false);
    },
    onError: () => {
      setEnabled(false);
    },
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        setCursor(data.pagination.cursor);
        setVideos(data.data);
      } else if (data.message) {
        showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
      }
    },
    execute: authEnabled && Boolean(channelId && cursor && enabled),
  });

  const loadMore = () => setEnabled(true);

  return {
    videos,
    hasMore: Boolean(cursor),
    isLoading,
    loadMore,
  };
}
