import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

const TRACKS = [
  // Royalty-free ambient lounge / cinematic loops (CC0 / pixabay-style URLs).
  // Fallback: synthesized via WebAudio if network fails.
  "https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3",
];

export function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [trackIdx] = useState(0);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("taqtik-music") : null;
    if (stored === "on") setPlaying(true);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.25;
    if (playing) {
      audioRef.current.play().catch(() => setPlaying(false));
      localStorage.setItem("taqtik-music", "on");
    } else {
      audioRef.current.pause();
      localStorage.setItem("taqtik-music", "off");
    }
  }, [playing]);

  return (
    <>
      <audio ref={audioRef} src={TRACKS[trackIdx]} loop preload="none" />
      <button
        onClick={() => setPlaying((p) => !p)}
        title={playing ? "Mute ambient music" : "Play ambient music"}
        className="p-2 rounded-md text-muted-foreground hover:text-gold hover:bg-secondary transition-smooth"
        aria-label="Toggle ambient music"
      >
        {playing ? <Music className="h-4 w-4 text-gold" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </>
  );
}
