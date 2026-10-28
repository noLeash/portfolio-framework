import { useEffect, useRef, useState } from "react";
import {
  RxEnterFullScreen,
  RxExitFullScreen,
  RxPause,
  RxPlay,
  RxSpeakerLoud,
  RxSpeakerModerate,
  RxSpeakerOff,
} from "react-icons/rx";
import "../../styles/Components/videoPlayer.scss";

type VideoPlayerProps = {
  src: string;
  poster?: string | null;
  // Used for the aspect ratio so the player doesn't jump while loading
  width?: number | null;
  height?: number | null;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  title?: string;
  className?: string;
};

const SEEK_STEP = 5; // seconds jumped by the arrow keys
const HIDE_CONTROLS_MS = 2500;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

const VideoPlayer = ({
  src,
  poster,
  width,
  height,
  autoPlay = false,
  loop = false,
  muted = false,
  title,
  className,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [waiting, setWaiting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState(false);

  const video = () => videoRef.current;

  const togglePlay = () => {
    const v = video();
    if (!v) return;
    if (v.paused || v.ended) {
      // play() rejects if the browser blocks it (e.g. autoplay with sound)
      v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
    }
  };

  const seekTo = (time: number) => {
    const v = video();
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(Math.max(time, 0), v.duration);
  };

  const toggleMute = () => {
    const v = video();
    if (!v) return;
    v.muted = !v.muted;
    // Unmuting at zero volume would still be silent
    if (!v.muted && v.volume === 0) v.volume = 0.5;
  };

  const changeVolume = (value: number) => {
    const v = video();
    if (!v) return;
    v.volume = value;
    v.muted = value === 0;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    } else {
      // iOS Safari only allows fullscreen on the video element itself
      (video() as HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        ?.webkitEnterFullscreen?.();
    }
  };

  // Show controls on activity, hide them again after a pause while playing
  const revealControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    if (!video()?.paused) {
      hideTimer.current = setTimeout(
        () => setControlsVisible(false),
        HIDE_CONTROLS_MS,
      );
    }
  };

  useEffect(() => {
    if (!playing) {
      clearTimeout(hideTimer.current);
      setControlsVisible(true);
    } else {
      revealControls();
    }
    return () => clearTimeout(hideTimer.current);
  }, [playing]);

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // A new source starts from a clean state
  useEffect(() => {
    setError(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
  }, [src]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Let the sliders handle their own arrow keys
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const v = video();
    if (!v) return;
    switch (e.key) {
      case " ":
      case "k":
        togglePlay();
        break;
      case "ArrowLeft":
        seekTo(v.currentTime - SEEK_STEP);
        break;
      case "ArrowRight":
        seekTo(v.currentTime + SEEK_STEP);
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      default:
        return;
    }
    e.preventDefault();
    revealControls();
  };

  const updateBuffered = () => {
    const v = video();
    if (!v || !v.buffered.length || !Number.isFinite(v.duration)) return;
    setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration);
  };

  const progress = duration ? currentTime / duration : 0;
  const shownVolume = isMuted ? 0 : volume;
  const VolumeIcon =
    shownVolume === 0
      ? RxSpeakerOff
      : shownVolume < 0.5
        ? RxSpeakerModerate
        : RxSpeakerLoud;

  return (
    <div
      ref={containerRef}
      className={[
        "video-player",
        controlsVisible ? "controls-visible" : "",
        fullscreen ? "is-fullscreen" : "",
        className ?? "",
      ].join(" ")}
      style={
        width && height ? { aspectRatio: `${width} / ${height}` } : undefined
      }
      tabIndex={0}
      role="region"
      aria-label={title ? `Video player: ${title}` : "Video player"}
      onKeyDown={handleKeyDown}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onProgress={updateBuffered}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setIsMuted(e.currentTarget.muted);
        }}
        onError={() => setError(true)}
      />

      {error ? (
        <div className="video-player__overlay video-player__error">
          This video can't be played in your browser.
        </div>
      ) : waiting && playing ? (
        <div className="video-player__overlay">
          <span className="video-player__spinner" aria-label="Loading" />
        </div>
      ) : (
        !playing && (
          <button
            type="button"
            className="video-player__overlay video-player__big-play"
            onClick={togglePlay}
            aria-label="Play"
          >
            <RxPlay size={40} />
          </button>
        )
      )}

      <div className="video-player__controls">
        <div
          className="video-player__progress"
          style={
            {
              "--progress": `${progress * 100}%`,
              "--buffered": `${buffered * 100}%`,
            } as React.CSSProperties
          }
        >
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            disabled={!duration}
          />
        </div>

        <div className="video-player__bar">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <RxPause size={20} /> : <RxPlay size={20} />}
          </button>

          <div className="video-player__volume">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              <VolumeIcon size={20} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={shownVolume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
            />
          </div>

          <span className="video-player__time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            type="button"
            className="video-player__fullscreen"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <RxExitFullScreen size={20} />
            ) : (
              <RxEnterFullScreen size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
