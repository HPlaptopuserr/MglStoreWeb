import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { REEL_OUTPUT_MAX_BYTES, ReelUploadError } from "./policy";

const execute = promisify(execFile);
export const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
const ffprobePath = process.env.FFPROBE_PATH || ffprobeInstaller.path;
export interface VideoProbe {
  duration: number;
  width: number;
  height: number;
}
export async function probeVideo(file: string): Promise<VideoProbe> {
  const { stdout } = await execute(
    ffprobePath,
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-format_whitelist",
      "mov,matroska,webm",
      "-show_entries",
      "format=duration:stream=codec_type,width,height",
      "-of",
      "json",
      file,
    ],
    { timeout: 30000, maxBuffer: 1024 * 1024 },
  );
  const data = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
  };
  const video = data.streams?.find((stream) => stream.codec_type === "video");
  const duration = Number(data.format?.duration);
  if (
    !video ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !video.width ||
    !video.height ||
    video.width > 8192 ||
    video.height > 8192 ||
    video.width * video.height > 8192 * 2160
  ) {
    throw new ReelUploadError("Видео бичлэгийн мэдээллийг уншиж чадсангүй.");
  }
  return { duration, width: video.width, height: video.height };
}
export async function transcodeReel(
  input: string,
  output: string,
  signal?: AbortSignal,
): Promise<VideoProbe & { size: number }> {
  if (!ffmpegPath) throw new Error("Video encoder unavailable");
  const source = await probeVideo(input);
  await execute(
    ffmpegPath,
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-protocol_whitelist",
      "file,pipe",
      "-format_whitelist",
      "mov,matroska,webm",
      "-threads",
      "2",
      "-i",
      input,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-map_metadata",
      "-1",
      "-map_chapters",
      "-1",
      "-vf",
      "scale=w='if(gte(iw,ih),min(1920,iw),min(1080,iw))':h='if(gte(iw,ih),min(1080,ih),min(1920,ih))':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      "-fs",
      String(REEL_OUTPUT_MAX_BYTES + 1024 * 1024),
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ac",
      "2",
      "-ar",
      "48000",
      "-threads",
      "2",
      "-filter_threads",
      "1",
      "-movflags",
      "+faststart",
      output,
    ],
    {
      signal,
      timeout: Math.min(
        20 * 60 * 60 * 1000,
        Math.max(10 * 60 * 1000, source.duration * 20 * 1000),
      ),
      maxBuffer: 1024 * 1024,
    },
  );
  const size = (await fs.stat(output)).size;
  if (size <= 0 || size > REEL_OUTPUT_MAX_BYTES)
    throw new ReelUploadError(
      "Видео боловсруулж чадсангүй. Өөр видео сонгоно уу.",
    );
  const media = await probeVideo(output);
  // Never publish a partial movie if the encoder reached the disk/storage budget.
  if (media.duration + 0.5 < source.duration) {
    throw new ReelUploadError(
      "Видео бүрэн боловсруулагдсангүй. Серверийн багтаамжийг шалгана уу.",
    );
  }
  return { ...media, size };
}
