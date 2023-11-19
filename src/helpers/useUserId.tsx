import { Toast, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { CACHE_PREFIX } from "./cache";
import { useAuth, clientId } from "./auth";

type User = {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
};

export default function useUserId() {
  const [previousUser, setPreviousUser] = useCachedState<User | undefined>(
    `${CACHE_PREFIX}_${clientId}_user`,
    undefined,
  );

  const { enabled, headers, onWillExecute } = useAuth();

  const { data, isLoading } = useFetch(`https://api.twitch.tv/helix/users`, {
    headers,
    onWillExecute,
    initialData: previousUser,
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      if (data && data.data) {
        setPreviousUser(data.data[0]);
        return data.data[0] as User;
      }
      if (data.message) {
        showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
      }
      return undefined;
    },
    execute: enabled && !previousUser,
  });

  return {
    data: previousUser?.id ?? data?.id,
    isLoading: previousUser ? false : isLoading,
  };
}
