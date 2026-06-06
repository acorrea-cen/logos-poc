export interface VideoMetadata {
  duration: number;   // segundos
  width: number;
  height: number;
  codec: string;
  bitrate: number;    // bps
  fps: number;
  hasAudio: boolean;
}
