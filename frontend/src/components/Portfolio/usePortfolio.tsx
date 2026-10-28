import { useFetch } from "../hooks/useFetch";

import { putToS3, readVideoMeta } from "./videoUpload";

export type MediaType = "image" | "video";

// Mirrors MediaSchema in backend schema/portfolios.py
export type PortfolioMedia = {
  id: string;
  portfolioId: string;
  mediaType: MediaType;
  filename: string;
  contentType: string;
  size: number;
  description: string | null;
  altText: string | null;
  originalWidth: number | null;
  originalHeight: number | null;
  duration: number | null;
  position: number;
  createdAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
  originalUrl: string;
  thumbnailUrl: string | null;
  smallUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
};

type StartVideoUploadBody = {
  portfolioId: string;
  filename: string;
  contentType: string;
  size: number;
};

type StartVideoUploadResponse = {
  videoId: string;
  key: string;
  uploadUrl: string;
};

// Editable asset fields; null clears one. Mirrors UpdateMediaRequest
export type MediaChanges = {
  altText?: string | null;
  description?: string | null;
};

// Mirrors PurgeDeletedResponse
export type PurgeResult = {
  purged: number;
  deletedFiles: number;
  failed: string[];
};

export type PortfolioParams = {
  id: string;
  slug: string; // lower snake case; used in URLs
  folder: string;
  style: Record<string, any>;
  name: string;
  description: string;
  media: PortfolioMedia[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  // cover on the index page; null uses the first image
  primaryMediaId: string | null;
};

// Only fields sent are changed; renaming also changes the slug.
// published true stamps publishedAt, false clears it
export type PortfolioChanges = {
  name?: string;
  description?: string | null;
  published?: boolean;
  primaryMediaId?: string | null;
};

export type CreatePortfolioParams = {
  portfolioName: string;
  description: string;
};

const usePortfolio = () => {
  // Implement your portfolio logic here
  const {
    data: portfolioData,
    loading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolio,
  } = useFetch({
    url: "/api/portfolio",
    manual: true,
  });

  const {
    data: portfolioListData,
    loading: portfolioListLoading,
    error: portfolioListError,
    refetch: refetchPortfolioList,
  } = useFetch({
    url: "/api/portfolio/list",
  });

  const {
    data: editPortfolioData,
    loading: editPortfolioLoading,
    error: editPortfolioError,
    refetch: refetchEditPortfolio,
  } = useFetch<PortfolioParams>({
    url: "/api/portfolio/edit/${portfolio_name}",
    manual: true,
  });

  const {
    data: reorderPortfolioData,
    loading: reorderPortfolioLoading,
    error: reorderPortfolioError,
    refetch: refetchReorderPortfolio,
  } = useFetch<PortfolioParams>({
    url: "/api/portfolio/reorder/${portfolio_id}",
    method: "PATCH",
    manual: true,
  });

  const {
    data: createPortfolioData,
    loading: createPortfolioLoading,
    error: createPortfolioError,
    refetch: refetchCreatePortfolio,
  } = useFetch<CreatePortfolioParams>({
    url: "/api/portfolio/createPortfolio",
    method: "POST",
    manual: true,
  });

  const {
    loading: uploadLoading,
    error: uploadError,
    refetch: refetchUpload,
  } = useFetch<{ folder: string; uploaded: string[] }, FormData>({
    url: "/api/portfolio/uploadImage",
    method: "POST",
    manual: true,
  });

  const { refetch: refetchStartVideoUpload } = useFetch<
    StartVideoUploadResponse,
    StartVideoUploadBody
  >({
    url: "/api/portfolio/uploadVideo/start",
    method: "POST",
    manual: true,
  });

  const { refetch: refetchCompleteVideoUpload } = useFetch<
    PortfolioMedia,
    FormData
  >({
    url: "/api/portfolio/uploadVideo/complete",
    method: "POST",
    manual: true,
  });

  // Video bytes go straight from the browser to S3 via a presigned URL;
  // the API only hands out the URL and records the result
  const uploadVideo = async (
    file: File,
    onProgress?: (fraction: number) => void,
  ) => {
    const portfolioId = editPortfolioData?.id;
    if (!portfolioId) throw new Error("Portfolio is not loaded");

    const meta = await readVideoMeta(file);
    const start = await refetchStartVideoUpload({
      body: {
        portfolioId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      },
    });
    if (!start) throw new Error("Upload was cancelled");

    await putToS3(start.uploadUrl, file, onProgress);

    const form = new FormData();
    form.append("portfolio_id", portfolioId);
    form.append("video_id", start.videoId);
    form.append("key", start.key);
    form.append("filename", file.name);
    if (meta.width) form.append("width", String(meta.width));
    if (meta.height) form.append("height", String(meta.height));
    if (meta.duration) form.append("duration", String(meta.duration));
    if (meta.poster) form.append("poster", meta.poster, "poster.jpg");
    return refetchCompleteVideoUpload({ body: form });
  };

  const { refetch: refetchUpdateMedia } = useFetch<PortfolioMedia, MediaChanges>({
    url: "/api/portfolio/media",
    method: "PATCH",
    manual: true,
  });

  const { refetch: refetchUpdatePortfolio } = useFetch<
    PortfolioParams,
    PortfolioChanges
  >({
    url: "/api/portfolio",
    method: "PATCH",
    manual: true,
  });

  // Separate hooks, since useFetch aborts a hook's in-flight request on refetch
  const { refetch: refetchDeleteMedia } = useFetch<PortfolioMedia>({
    url: "/api/portfolio/media",
    method: "DELETE",
    manual: true,
  });

  const { refetch: refetchRestoreMedia } = useFetch<PortfolioMedia>({
    url: "/api/portfolio/media",
    method: "POST",
    manual: true,
  });

  const { loading: purgeLoading, refetch: refetchPurgeDeleted } =
    useFetch<PurgeResult>({
      url: "/api/portfolio/media/purge",
      method: "DELETE",
      manual: true,
    });

  // Soft delete: hidden from the site, files kept until purged
  const deleteMedia = (id: string) =>
    refetchDeleteMedia({ url: `/api/portfolio/media/${id}` });

  const restoreMedia = (id: string) =>
    refetchRestoreMedia({ url: `/api/portfolio/media/${id}/restore` });

  // Permanently removes deleted media and their S3 files;
  // without a portfolioId it purges every portfolio
  const purgeDeleted = (portfolioId?: string) =>
    refetchPurgeDeleted({ params: { portfolio_id: portfolioId } });

  const updatePortfolio = (id: string, changes: PortfolioChanges) =>
    refetchUpdatePortfolio({ url: `/api/portfolio/${id}`, body: changes });

  const updateMedia = (id: string, changes: MediaChanges) =>
    refetchUpdateMedia({ url: `/api/portfolio/media/${id}`, body: changes });

  // Uploads files into the portfolio's S3 folder
  const uploadImages = (folder: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file, file.name));
    return refetchUpload({
      params: { prefix: folder, portfolio_id: editPortfolioData?.id },
      body: formData,
    });
  };

  return {
    uploadImages,
    uploadVideo,
    updateMedia,
    deleteMedia,
    restoreMedia,
    purgeDeleted,
    purgeLoading,
    updatePortfolio,
    uploadLoading,
    uploadError,
    portfolioData,
    portfolioLoading,
    portfolioError,
    refetchPortfolio,
    editPortfolioData,
    editPortfolioLoading,
    editPortfolioError,
    refetchEditPortfolio,
    reorderPortfolioData,
    reorderPortfolioLoading,
    reorderPortfolioError,
    refetchReorderPortfolio,
    portfolioListData,
    portfolioListLoading,
    portfolioListError,
    refetchPortfolioList,
    createPortfolioData,
    createPortfolioLoading,
    createPortfolioError,
    refetchCreatePortfolio,
  };
};

export default usePortfolio;
