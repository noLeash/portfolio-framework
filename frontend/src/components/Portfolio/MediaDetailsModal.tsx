import { useEffect, useState } from "react";
import { Button, Input, Modal } from "rsuite";
import type { MediaChanges, PortfolioMedia } from "./usePortfolio";

type MediaDetailsModalProps = {
  media: PortfolioMedia | null;
  onClose: () => void;
  onSave: (id: string, changes: MediaChanges) => Promise<unknown>;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
};

const formatDuration = (seconds: number) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// View an asset's file details and edit its alt text and description
const MediaDetailsModal = ({ media, onClose, onSave }: MediaDetailsModalProps) => {
  const [altText, setAltText] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (media) {
      setAltText(media.altText ?? "");
      setDescription(media.description ?? "");
      setError(null);
    }
  }, [media?.id]);

  if (!media) return null;

  // Only send fields that changed; blank clears a field
  const changes: MediaChanges = {};
  if (altText.trim() !== (media.altText ?? "")) changes.altText = altText.trim() || null;
  if (description.trim() !== (media.description ?? ""))
    changes.description = description.trim() || null;
  const dirty = Object.keys(changes).length > 0;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(media.id, changes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed");
    } finally {
      setSaving(false);
    }
  };

  const isVideo = media.mediaType === "video";
  const details: [string, string][] = [
    ["File", media.filename],
    ["Type", media.contentType],
    ["Size", formatBytes(media.size)],
    ...(media.originalWidth && media.originalHeight
      ? ([["Dimensions", `${media.originalWidth} × ${media.originalHeight}`]] as [string, string][])
      : []),
    ...(isVideo && media.duration
      ? ([["Length", formatDuration(media.duration)]] as [string, string][])
      : []),
    ["Uploaded", new Date(media.createdAt).toLocaleString()],
  ];

  return (
    <Modal open onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Edit {isVideo ? "video" : "image"}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="media-details">
        <div className="media-details__preview">
          {isVideo && !media.thumbnailUrl ? (
            <video src={media.originalUrl} preload="metadata" muted playsInline controls />
          ) : (
            <img src={media.mediumUrl ?? media.thumbnailUrl ?? media.originalUrl} alt="" />
          )}
        </div>

        <dl className="media-details__info">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <label className="media-details__field">
          <span>Alt text</span>
          <Input
            value={altText}
            onChange={setAltText}
            placeholder={isVideo ? "What the video shows" : "What the image shows"}
          />
          <small>
            Read aloud by screen readers. Describe what's shown, not the file.
          </small>
        </label>

        <label className="media-details__field">
          <span>Description</span>
          <Input
            as="textarea"
            rows={3}
            value={description}
            onChange={setDescription}
            placeholder="Caption shown with the asset (optional)"
          />
        </label>

        {error && <p role="alert">{error}</p>}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} appearance="subtle">
          Cancel
        </Button>
        <Button appearance="primary" disabled={!dirty} loading={saving} onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MediaDetailsModal;
