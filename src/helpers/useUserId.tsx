import { Toast, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX } from "./cache";
import { headers, clientId } from "./auth";

export default function useUserId() {
  const [previousUserId, setPreviousUserId] = useCachedState<string | undefined>(
    `${CACHE_PREFIX}_${clientId}_user_id`,
    undefined,
  );

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/users`, {
    headers,
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        setPreviousUserId(data.data);
        return data.data as string;
      }
      if (data.message) {
        showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
      }
      return undefined;
    },
    execute: !previousUserId,
  });

  return {
    data: previousUserId || data,
    isLoading: previousUserId ? false : isLoading,
  };
}
