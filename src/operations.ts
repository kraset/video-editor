export type TrimMode = "nice" | "fast";
export type ScaleMode =
  "width" | "height" | "both" | "fit-width" | "fit-height";
export type ScaleAdjustment = "pad" | "crop";

export interface ScaleOptions {
  width: number;
  height: number;
  mode: ScaleMode;
  adjustment?: ScaleAdjustment;
}

export interface RunOptions {
  filePath: string;
  trim?: { mode: TrimMode; start: number; end: number };
  crop?: { w: number; h: number; x: number; y: number };
  downsample?: { nth: number };
  scale?: ScaleOptions;
  compress?: { crf: number };
  frameRate?: number;
  slowdown?: number;
  audio: "none" | "remove" | "map";
  audioFile?: string;
  convert: boolean;
  multiConcat?: { ranges: { start: number; end: number }[] };
}

export function normalizedEncodingArgs(crf?: number): string[] {
  return [
    "-c:v",
    "libx264",
    "-profile:v",
    "baseline",
    "-pix_fmt",
    "yuv420p",
    ...(crf === undefined ? [] : ["-crf", String(crf)]),
    "-c:a",
    "aac",
    "-video_track_timescale",
    "30000",
  ];
}

function ffmpegNumber(value: number): string {
  return String(Number(value.toFixed(6)));
}

function scaleFilters(scale: ScaleOptions): string[] {
  const { width, height, mode, adjustment } = scale;
  if (mode === "both") return [`scale=${width}:${height}`];
  if (mode === "fit-width") return [`scale=${width}:-2`];
  if (mode === "fit-height") return ["scale=-2:" + height];

  if (mode === "width") {
    const filters = [`scale=${width}:-2`];
    if (adjustment === "pad") {
      filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
    } else if (adjustment === "crop") {
      filters.push(`crop=${width}:${height}:(iw-${width})/2:(ih-${height})/2`);
    }
    return filters;
  }

  const filters = [`scale=-2:${height}`];
  if (adjustment === "pad") {
    filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
  } else if (adjustment === "crop") {
    filters.push(`crop=${width}:${height}:(iw-${width})/2:(ih-${height})/2`);
  }
  return filters;
}

export function buildFfmpegArgs(
  options: RunOptions,
  outputPath: string,
): string[] {
  const { filePath, trim, crop, downsample, scale, compress, frameRate } =
    options;
  const slowdown = options.slowdown;

  if (trim?.mode === "fast") {
    return [
      "-ss",
      ffmpegNumber(trim.start),
      "-to",
      ffmpegNumber(trim.end),
      "-i",
      filePath,
      "-c",
      "copy",
      "-y",
      outputPath,
    ];
  }

  const args = ["-i", filePath];
  if (options.audio === "map" && options.audioFile) {
    args.push("-i", options.audioFile);
  }
  if (trim?.mode === "nice") {
    args.push(
      "-ss",
      ffmpegNumber(trim.start),
      "-t",
      ffmpegNumber(trim.end - trim.start),
    );
  }

  const filters: string[] = [];
  if (crop) filters.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
  if (downsample) {
    filters.push(
      `select='not(mod(n\\,${downsample.nth}))'`,
      "setpts=N/FRAME_RATE/TB",
    );
  }
  if (scale) filters.push(...scaleFilters(scale));
  if (trim?.mode === "nice") filters.push("setpts=PTS-STARTPTS");
  if (slowdown !== undefined) filters.push(`setpts=${slowdown}*PTS`);

  const reencodeVideo = Boolean(
    trim?.mode === "nice" ||
    crop ||
    downsample ||
    scale ||
    compress ||
    frameRate ||
    slowdown ||
    options.convert,
  );
  if (reencodeVideo) filters.push("setsar=1");
  if (filters.length) args.push("-vf", filters.join(","));
  if (frameRate !== undefined) args.push("-r", String(frameRate));

  if (reencodeVideo) {
    args.push(...normalizedEncodingArgs(compress?.crf));
  } else if (options.audio === "map") {
    args.push("-c:v", "copy", "-c:a", "aac");
  } else {
    args.push("-c", "copy");
  }

  if (slowdown !== undefined || options.audio === "remove") {
    args.push("-an");
  } else if (options.audio === "map") {
    args.push("-map", "0:v:0", "-map", "1:a:0", "-shortest");
  } else if (trim?.mode === "nice") {
    args.push("-af", "asetpts=PTS-STARTPTS");
  }

  args.push("-y", outputPath);
  return args;
}
