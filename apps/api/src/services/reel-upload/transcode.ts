import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import {
  REEL_MAX_DURATION_SECONDS,
  REEL_OUTPUT_MAX_BYTES,
  ReelUploadError,
} from "./policy";

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
    duration > REEL_MAX_DURATION_SECONDS + 0.1 ||
    !video.width ||
    !video.height ||
    video.width > 4096 ||
    video.height > 4096 ||
    video.width * video.height > 4096 * 2160
  ) {
    throw new ReelUploadError("3 мин хүртэлх, 4K-аас ихгүй видео сонгоно уу.");
  }
  return { duration, width: video.width, height: video.height };
}
export async function transcodeReel(
  input: string,
  output: string,
  signal?: AbortSignal,
): Promise<VideoProbe & { size: number }> {
  if (!ffmpegPath) throw new Error("Video encoder unavailable");
  await probeVideo(input);
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
      "scale=w='if(gte(iw,ih),min(1280,iw),min(720,iw))':h='if(gte(iw,ih),min(720,ih),min(1280,ih))':force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-b:v",
      "1600k",
      "-maxrate",
      "1600k",
      "-bufsize",
      "3200k",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
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
      "-t",
      "180",
      output,
    ],
    { signal, timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024 },
  );
  const size = (await fs.stat(output)).size;
  if (size <= 0 || size > REEL_OUTPUT_MAX_BYTES)
    throw new ReelUploadError(
      "Видео боловсруулж чадсангүй. Өөр видео сонгоно уу.",
    );
  return { ...(await probeVideo(output)), size };
}
