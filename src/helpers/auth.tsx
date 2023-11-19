import { getPreferenceValues, OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const clientId = preferences.clientId;
const clientSecret = preferences.clientSecret;

let runningAuthPromise: Promise<void> | undefined;

const authFlow = (
  setTokenSet: (tokenSet: OAuth.TokenSet | undefined) => void,
  timeoutId: React.MutableRefObject<number | null>,
) => {
  const promise = (runningAuthPromise ??= authorize());
  promise.then(async () => {
    const tokenSet = await client.getTokens();
    setTokenSet(tokenSet);
    if (!tokenSet?.expiresIn) return;
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(authFlow, (tokenSet.expiresIn - 30) * 1000);
  });
};

export function useAuth() {
  const [tokenSet, setTokenSet] = useState<OAuth.TokenSet | undefined>(undefined);
  const timeoutId = useRef<null | number>(null);
  const tokenSetRef = useRef<OAuth.TokenSet | undefined>(undefined);
  tokenSetRef.current = tokenSet;

  useEffect(() => {
    authFlow(setTokenSet, timeoutId);
  }, []);

  const onWillExecute = useCallback(async () => {
    if (tokenSetRef.current?.isExpired()) {
      setTokenSet(undefined);
      authFlow(setTokenSet, timeoutId);
      return false;
    }
    return true;
  }, []);

  const enabled = Boolean(tokenSet && !tokenSet.isExpired());

  const headers: HeadersInit | undefined = useMemo(
    () =>
      enabled
        ? {
            "Client-Id": clientId,
            Authorization: `Bearer ${tokenSet?.accessToken}`,
          }
        : undefined,
    [enabled, tokenSet],
  );

  return {
    enabled,
    onWillExecute,
    headers,
  };
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Twitch",
  providerIcon: "TwitchGlitchPurple.png",
  description: "Connect your Twitch account…",
  providerId: "twitch",
});

// Authorization

async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://id.twitch.tv/oauth2/authorize",
    clientId,
    scope: "user:read:follows",
    extraParameters: {
      response_type: "code",
      redirect_uri: "https://raycast.com/redirect?packageName=Extension",
    },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authorizationCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      code_verifier: authRequest.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: "https://raycast.com/redirect?packageName=Extension",
    }),
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const data = (await response.json()) as OAuth.TokenResponse;
  return {
    ...data,
    scope: (data.scope as unknown as string[]).join(" "),
  };
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
