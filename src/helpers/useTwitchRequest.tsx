import { Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import { getHeaders } from "./auth";
import { useEffect, useState, useRef } from "react";
import fetch from "node-fetch";

// deep compare objects
function deepCompare(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepCompare(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepCompare(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

const defaultSelect = (data: any) => data.data;

export function useTwitchRequest<T>({
  url,
  cacheKey,
  initialData,
  cacheDuration = 60_000,
  enabled = true,
  select = defaultSelect,
}: {
  url: string;
  cacheKey: string;
  initialData: T;
  cacheDuration?: number;
  enabled?: boolean;
  select?: (data: any) => T;
}) {
  const [_updatedAt, setUpdatedAt] = useCachedState<string>(`${CACHE_PREFIX}_${cacheKey}_updated_at`, zeroDate);
  const updatedAt = Number(_updatedAt);
  const [previous, setPrevious] = useCachedState<T | undefined>(`${CACHE_PREFIX}_${cacheKey}`, undefined);
  const [isLoading, setIsLoading] = useState(false);
  const prevRef = useRef(previous);
  prevRef.current = previous;

  useEffect(() => {
    if (!enabled) return;
    if (updatedAt + cacheDuration >= Date.now()) return;
    const controller = new AbortController();
    setIsLoading(previous === undefined);
    getHeaders()
      .then((headers) => fetch(url, { headers, signal: controller.signal }))
      .then((response) => response.json())
      .then((data: any) => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
        if (data && data.data) {
          const next = select(data);
          if (deepCompare(prevRef.current, next)) return;
          setPrevious(next);
          setUpdatedAt(String(Date.now()));
          return;
        }
        if (data.message) {
          showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
        }
        if (deepCompare(prevRef.current, initialData)) return;
        setPrevious(initialData);
        setUpdatedAt(String(Date.now()));
      })
      .catch();
    // return () => controller.abort()
  }, [enabled, cacheDuration, url]);

  return {
    data: previous ?? initialData,
    isLoading,
    updatedAt,
  };
}
