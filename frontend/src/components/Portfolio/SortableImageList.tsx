import { useState, useEffect } from "react";
import usePortfolio from "./usePortfolio";
import "../../styles/Components/sortableList.scss";
import TrashIcon from "@rsuite/icons/Trash";
import EditIcon from "@rsuite/icons/Edit";
import ReloadIcon from "@rsuite/icons/Reload";
import DragableIcon from "@rsuite/icons/Dragable";
import { IconButton, Modal } from "rsuite";
import { RxStar, RxStarFilled } from "react-icons/rx";
import VideoPlayer from "./VideoPlayer";
import MediaDetailsModal from "./MediaDetailsModal";
import type { PortfolioMedia } from "./usePortfolio";

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return "video";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function SortableAssetList({
  images = [],
  portfolioId,
  showDeleted = false,
  onMediaUpdated,
  primaryMediaId,
  onSetPrimary,
}: {
  images?: any[];
  portfolioId?: string;
  // Include soft-deleted assets, dimmed, with a restore button
  showDeleted?: boolean;
  // Called after an asset is saved, deleted or restored, to reload the list
  onMediaUpdated?: () => void;
  // The portfolio's cover on the index page; null clears it
  primaryMediaId?: string | null;
  onSetPrimary?: (mediaId: string | null) => Promise<unknown>;
}) {
  const {
    updateMedia,
    deleteMedia,
    restoreMedia,
    reorderPortfolioData,
    reorderPortfolioLoading,
    reorderPortfolioError,
    refetchReorderPortfolio,
  } = usePortfolio();
  // Only the user's ordering is state; items always come from the current prop
  const [order, setOrder] = useState<string[]>([]);
  const visible = showDeleted ? images : images.filter((img) => !img.deletedAt);
  const byId = new Map(visible.map((img) => [img.id, img]));
  const sortableItems = [
    ...order.filter((id) => byId.has(id)),
    ...visible.map((img) => img.id).filter((id) => !order.includes(id)),
  ].map((id) => byId.get(id));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [playingVideo, setPlayingVideo] = useState<PortfolioMedia | null>(null);
  const [editingMedia, setEditingMedia] = useState<PortfolioMedia | null>(null);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const togglePrimary = async (item: PortfolioMedia) => {
    if (!onSetPrimary) return;
    setBusyId(item.id);
    try {
      await onSetPrimary(item.id === primaryMediaId ? null : item.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Couldn't set the cover");
    } finally {
      setBusyId(null);
    }
  };

  const toggleDeleted = async (item: PortfolioMedia) => {
    setBusyId(item.id);
    try {
      await (item.deletedAt ? restoreMedia(item.id) : deleteMedia(item.id));
      onMediaUpdated?.();
    } finally {
      setBusyId(null);
    }
  };
  // 1. Capture the index of the item being picked up
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Firefox won't start a drag without data
    e.dataTransfer.setData("text/plain", String(index));
    // Show the whole row as the drag preview, not just the handle
    const row = (e.currentTarget as HTMLElement).closest("li");
    if (row) e.dataTransfer.setDragImage(row, 0, 0);
  };

  // 2. Allow dropping by stopping default browser behavior
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 3. Reorder the array when dropped
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedList = [...sortableItems];
    const [draggedItem] = updatedList.splice(draggedIndex, 1); // Remove item
    updatedList.splice(targetIndex, 0, draggedItem); // Insert item at new position

    setOrder(updatedList.map((img) => img.id));
    setCurrentOrder(updatedList.map((img) => img.id));
    setDraggedIndex(null);
  };

  useEffect(() => {
    console.log(order);
    setCurrentOrder(order);
    refetchReorderPortfolio({
      url: `/api/portfolio/reorder/${portfolioId}`,
      body: order,
    });
  }, [order]);

  return (
    <div>
      {sortableItems?.length ? (
        <ul className="sortable-list">
          {sortableItems.map((item, index) => (
            <li
              key={item.id ?? index}
              className={item.deletedAt ? "is-deleted" : undefined}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              style={{
                padding: "12px",
                margin: "6px 0",
                backgroundColor: draggedIndex === index ? "#f0f0f0" : "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <span
                className="drag-handle"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={() => setDraggedIndex(null)}
              >
                <DragableIcon />
              </span>
              {item.mediaType === "video" && !item.thumbnailUrl ? (
                // No poster (browser couldn't decode it): let the video show its own first frame
                <video
                  src={item.originalUrl}
                  preload="metadata"
                  muted
                  style={{ maxWidth: "100px", cursor: "pointer" }}
                  onClick={() => setPlayingVideo(item)}
                />
              ) : (
                <img
                  draggable={false}
                  src={item.thumbnailUrl}
                  alt={item.altText ?? ""}
                  style={{
                    maxWidth: "100px",
                    cursor: item.mediaType === "video" ? "pointer" : undefined,
                  }}
                  onClick={
                    item.mediaType === "video"
                      ? () => setPlayingVideo(item)
                      : undefined
                  }
                />
              )}
              {item.mediaType === "video" && (
                <small>▶ {formatDuration(item.duration)}</small>
              )}
              <div>Position: {item.position}</div>
              {/* <small>{item.id}</small>
              <small>{item.thumbnailUrl}</small> */}
              {item.altText && <small title="Alt text">{item.altText}</small>}
              <IconButton
                size="xs"
                icon={<EditIcon />}
                aria-label="Edit details"
                onClick={() => setEditingMedia(item)}
              />
              {onSetPrimary && !item.deletedAt && item.largeUrl && (
                // videos qualify by their poster; ones without a poster can't be covers
                <IconButton
                  size="xs"
                  appearance={item.id === primaryMediaId ? "primary" : "default"}
                  icon={item.id === primaryMediaId ? <RxStarFilled /> : <RxStar />}
                  aria-label="Primary image"
                  aria-pressed={item.id === primaryMediaId}
                  title={
                    item.id === primaryMediaId
                      ? "Primary image on the index (click to unset)"
                      : "Use as primary image on the index"
                  }
                  disabled={busyId === item.id}
                  onClick={() => togglePrimary(item)}
                />
              )}
              {item.deletedAt && <small className="deleted-badge">Deleted</small>}
              <IconButton
                size="xs"
                icon={item.deletedAt ? <ReloadIcon /> : <TrashIcon />}
                aria-label={item.deletedAt ? "Restore" : "Delete"}
                title={item.deletedAt ? "Restore" : "Delete"}
                loading={busyId === item.id}
                onClick={() => toggleDeleted(item)}
              />
              {/* <pre style={{ margin: 0 }}>{JSON.stringify(item, null, 2)}</pre> */}
            </li>
          ))}
        </ul>
      ) : (
        <div>No items to display</div>
      )}
      <MediaDetailsModal
        media={editingMedia}
        onClose={() => setEditingMedia(null)}
        onSave={async (id, changes) => {
          await updateMedia(id, changes);
          onMediaUpdated?.();
        }}
      />
      <Modal
        open={!!playingVideo}
        onClose={() => setPlayingVideo(null)}
        size="lg"
      >
        <Modal.Header>
          <Modal.Title>{playingVideo?.filename}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {playingVideo && (
            <VideoPlayer
              src={playingVideo.originalUrl}
              poster={playingVideo.largeUrl}
              width={playingVideo.originalWidth}
              height={playingVideo.originalHeight}
              title={playingVideo.filename}
              autoPlay
            />
          )}
        </Modal.Body>
      </Modal>
      <pre>
        {JSON.stringify(sortableItems.map((item) => item.id) || [], null, 2)}
        {JSON.stringify(currentOrder || [], null, 2)}
      </pre>
    </div>
  );
}
