import { useEffect, useRef, useState } from "react";
import { Music, VolumeX, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Royalty-free ambient lounge / cinematic loops. Multiple sources for fallback.
const TRACKS = [
  "https://cdn.pixabay.com/download/audio/2022/10/30/audio_347111d654.mp3?filename=lounge-ambient-126620.mp3",
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=relaxing-145038.mp3",
  "https://cdn.pixabay.com/download/audio/2024/02/19/audio_38a31f1e51.mp3?filename=ambient-piano-amp-strings-10711.mp3",
];

const STORAGE_KEY = "taqtik-music";

export function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);

  // Lazily create the audio element on first toggle so we stay inside the user gesture.
  const ensureAudio = (): HTMLAudioElement => {
    if (!audioRef.current) {
      const el = new Audio();
      el.loop = true;
      el.volume = 0.22;
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      audioRef.current = el;
    }
    return audioRef.current;
  };

  // Try the next track on error, give up after we cycle through all of them.
  const handleError = () => {
    const el = audioRef.current;
    if (!el) return;
    setTrackIdx((idx) => {
      const next = idx + 1;
      if (next >= TRACKS.length) {
        setPlaying(false);
        setLoading(false);
        toast.error("Could not load ambient music (network blocked?)");
        return 0;
      }
      el.src = TRACKS[next];
      el.play().catch(() => {
        setPlaying(false);
        setLoading(false);
      });
      return next;
    });
  };

  const toggle = () => {
    const el = ensureAudio();
    if (playing) {
      el.pause();
      setPlaying(false);
      setLoading(false);
      try { localStorage.setItem(STORAGE_KEY, "off"); } catch {}
      return;
    }
    // Start playback synchronously inside the click handler (browser gesture rule).
    if (!el.src) el.src = TRACKS[trackIdx];
    setLoading(true);
    el.onplaying = () => setLoading(false);
    el.onerror = handleError;
    el.onended = () => setPlaying(false);
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        setPlaying(true);
        try { localStorage.setItem(STORAGE_KEY, "on"); } catch {}
      }).catch((err) => {
        setLoading(false);
        setPlaying(false);
        // NotAllowedError: gesture lost. Other errors fall through to track-cycle.
        if (err?.name === "NotAllowedError") {
          toast.error("Tap the music icon again to start playback");
        } else {
          handleError();
        }
      });
    } else {
      setPlaying(true);
    }
  };

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Hint to the user that the soundtrack is available on first mount if they had it on before.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "on") {
        toast("Tap the music icon to resume the ambient soundtrack", { duration: 3500 });
      }
    } catch {}
  }, []);

  const Icon = loading ? Loader2 : playing ? Music : VolumeX;

  return (
    <button
      onClick={toggle}
      title={playing ? "Mute ambient music" : "Play ambient music"}
      className="p-2 rounded-md text-muted-foreground hover:text-gold hover:bg-secondary transition-smooth"
      aria-label="Toggle ambient music"
    >
      <Icon className={`h-4 w-4 ${loading ? "animate-spin" : playing ? "text-gold" : ""}`} />
    </button>
  );
}
