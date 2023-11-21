import { getPreferenceValues, OAuth } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import fetch from "node-fetch";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CACHE_PREFIX } from "./cache";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const clientId = preferences.clientId;
const clientSecret = preferences.clientSecret;

let runningAuthPromise: Promise<string> | undefined;

export async function getHeaders() {
  const promise = (runningAuthPromise ??= authorize());
  promise.then(() => {
    if (runningAuthPromise === promise) runningAuthPromise = undefined;
  });
  const accessToken = await promise;
  const headers = {
    "Client-Id": clientId,
    Authorization: `Bearer ${accessToken}`,
  } as const;
  return headers;
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Twitch",
  providerIcon: "TwitchGlitchPurple.png",
  description: "Connect your Twitch account…",
  providerId: "twitch",
});

// Authorization

async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const newTokenSet = await refreshTokens(tokenSet.refreshToken);
      await client.setTokens(newTokenSet);
      return newTokenSet.access_token;
    }
    return tokenSet.accessToken;
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
  const newTokenSet = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(newTokenSet);
  return newTokenSet.access_token;
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
  tokenResponse.scope = Array.isArray(tokenResponse.scope) ? tokenResponse.scope.join(" ") : tokenResponse.scope;
  return tokenResponse;
}