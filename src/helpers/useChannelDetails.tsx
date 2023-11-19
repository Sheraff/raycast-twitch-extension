import { Toast, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import { ChannelDetails } from "../interfaces/ChannelDetails";
import { useAuth } from "./auth";

export default function useChannelDetails(channelId: string | undefined) {
  const [updatedAt, setUpdatedAt] = useCachedState<string>(
    `${CACHE_PREFIX}_channel_details_${channelId}_updated_at`,
    zeroDate,
  );

  const { enabled, headers, onWillExecute } = useAuth();

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${channelId}`, {
    headers,
    onWillExecute,
    initialData: {},
    onData: () => setUpdatedAt(String(Date.now())),
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        return data.data[0] as ChannelDetails;
      }
      if (data.message) {
        showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
      }
      return {} as Partial<ChannelDetails>;
    },
    execute: enabled && Boolean(channelId) && Number(updatedAt) + 60_000 < Date.now(),
  });

  return {
    data,
    isLoading,
    updatedAt,
  };
}
