declare module 'fluent-ffmpeg' {
  interface Stream {
    codec_type?: string
    width?: number
    height?: number
  }

  interface FfprobeData {
    streams: Stream[]
    format: {
      duration?: number
    }
  }

  interface Progress {
    percent: number
  }

  interface FfmpegCommand {
    input(input: string): this
    outputOptions(options: string[]): this
    output(output: string): this
    on(event: 'start' | 'end' | 'error' | 'progress', callback: (data: any) => void): this
    screenshots(options: {
      count: number
      folder: string
      filename?: string
      size?: string
    }): this
    run(): void
  }

  interface FfmpegStatic {
    (input?: string): FfmpegCommand
    setFfmpegPath(path: string): void
    setFfprobePath(path: string): void
    ffprobe(file: string, callback: (err: Error | null, data: FfprobeData) => void): void
  }

  const ffmpeg: FfmpegStatic
  export = ffmpeg
} 