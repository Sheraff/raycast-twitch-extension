import { userName } from "./auth";
import { useTwitchRequest } from "./useTwitchRequest";

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

export function useUserId() {
  const { data, isLoading } = useTwitchRequest<User | undefined>({
    url: `https://api.twitch.tv/helix/users?login=${userName}`,
    initialData: undefined,
    select: (data) => data.data[0],
    enabled: Boolean(userName),
  });
  return {
    data: data?.id,
    isLoading: data?.id ? false : isLoading,
  };
}
