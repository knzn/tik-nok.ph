declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    input(input: string): this
    outputOptions(options: string[]): this
    output(output: string): this
    on(event: 'end', callback: () => void): this
    on(event: 'error', callback: (err: Error) => void): this
    on(event: 'progress', callback: (progress: { percent: number }) => void): this
    run(): void
    kill(signal?: string): void
    screenshots(options: {
      count: number
      folder: string
      filename?: string
      size?: string
    }): this
  }

  interface FfmpegStatic {
    (options?: { logger?: Console } | string): FfmpegCommand
    setFfmpegPath(path: string): void
    setFfprobePath(path: string): void
  }

  const ffmpeg: FfmpegStatic
  export = ffmpeg
} 