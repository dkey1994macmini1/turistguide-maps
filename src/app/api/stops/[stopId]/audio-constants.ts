import { join } from "path";

export const AUDIO_DIR = join(process.cwd(), "storage", "audio", "stops");
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
];
