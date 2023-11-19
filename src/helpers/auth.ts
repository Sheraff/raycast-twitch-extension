import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../interfaces/Preferences";

const preferences: Preferences = getPreferenceValues();
export const clientId = preferences.clientId;
const authorization = preferences.authorization;

export const headers: HeadersInit = {
  "Client-Id": clientId,
  Authorization: `Bearer ${authorization}`,
};
