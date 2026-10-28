import { useEffect, useState } from "react";
import { useFetch } from "../hooks/useFetch";
import type { PortfolioMedia } from "../Portfolio/usePortfolio";

export type DisplaySize = "s" | "m" | "l";

// How a video plays on the landing page; ignored for images
export type PlaybackMode = "inline" | "modal";

export const DISPLAY_SIZES: { value: DisplaySize; label: string }[] = [
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
];

export const PLAYBACK_MODES: { value: PlaybackMode; label: string; hint: string }[] = [
  { value: "inline", label: "Inline", hint: "Autoplays muted on a loop in its tile" },
  { value: "modal", label: "Modal", hint: "Shows the poster; click to open a player" },
];

// Mirrors schema/image_collections.py
export type CollectionItem = {
  id: string;
  displaySize: DisplaySize;
  playbackMode: PlaybackMode;
  position: number;
  portfolioName: string | null;
  portfolioSlug: string | null;
  media: PortfolioMedia;
};

export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type Collection = CollectionSummary & { items: CollectionItem[] };

export type ActiveCollection = {
  id: string;
  name: string;
  description: string | null;
  items: CollectionItem[];
};

export type PickerPortfolio = {
  id: string;
  slug: string;
  name: string | null;
  media: PortfolioMedia[];
};

type CollectionBody = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

// The list of collections, for the collections admin page
export const useCollectionList = () => {
  const list = useFetch<CollectionSummary[]>({ url: "/api/collections" });
  const create = useFetch<Collection, CollectionBody>({
    url: "/api/collections",
    method: "POST",
    manual: true,
  });
  const update = useFetch<Collection, CollectionBody>({
    url: "/api/collections",
    method: "PATCH",
    manual: true,
  });
  const remove = useFetch<null>({
    url: "/api/collections",
    method: "DELETE",
    manual: true,
  });

  return {
    collections: list.data ?? [],
    loading: list.loading,
    error: list.error,
    refetch: () => list.refetch(),
    createCollection: (body: CollectionBody) => create.refetch({ body }),
    setActive: (id: string, isActive: boolean) =>
      update.refetch({ url: `/api/collections/${id}`, body: { isActive } }),
    deleteCollection: (id: string) =>
      remove.refetch({ url: `/api/collections/${id}` }),
  };
};

// One collection and every edit to it. Each edit returns the updated
// collection, which replaces the local copy. useFetch aborts a request
// when the same hook fires again, so callers should wait on `saving`.
export const useCollection = (id?: string) => {
  const url = `/api/collections/${id}`;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [saving, setSaving] = useState(false);

  const get = useFetch<Collection>({ url, skip: !id });
  const mutate = useFetch<Collection, unknown>({
    url,
    method: "PATCH",
    manual: true,
  });

  useEffect(() => {
    if (get.data) setCollection(get.data);
  }, [get.data]);

  const run = async (
    options: Parameters<typeof mutate.refetch>[0],
  ): Promise<Collection | undefined> => {
    setSaving(true);
    try {
      const updated = await mutate.refetch(options);
      if (updated) setCollection(updated);
      return updated;
    } finally {
      setSaving(false);
    }
  };

  return {
    collection,
    loading: get.loading,
    error: get.error,
    saving,
    saveError: mutate.error,
    update: (body: CollectionBody) => run({ body }),
    addItems: (
      mediaIds: string[],
      displaySize: DisplaySize,
      playbackMode: PlaybackMode,
    ) =>
      run({
        url: `${url}/items`,
        method: "POST",
        body: { mediaIds, displaySize, playbackMode },
      }),
    updateItem: (
      itemId: string,
      changes: { displaySize?: DisplaySize; playbackMode?: PlaybackMode },
    ) => run({ url: `${url}/items/${itemId}`, body: changes }),
    removeItem: (itemId: string) =>
      run({ url: `${url}/items/${itemId}`, method: "DELETE" }),
    reorder: (order: string[]) =>
      run({ url: `${url}/reorder`, body: { order } }),
  };
};

// Every portfolio's images and videos, loaded when the picker opens
export const useMediaOptions = () => {
  const options = useFetch<PickerPortfolio[]>({
    url: "/api/collections/media-options",
    manual: true,
  });
  return {
    portfolios: options.data ?? [],
    loading: options.loading,
    error: options.error,
    load: () => options.refetch(),
  };
};

export const useActiveCollection = () =>
  useFetch<ActiveCollection>({ url: "/api/collections/active" });
