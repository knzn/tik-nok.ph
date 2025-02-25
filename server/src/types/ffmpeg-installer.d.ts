declare module '@ffmpeg-installer/ffmpeg' {
  interface FFmpegInstaller {
    path: string
    version: string
  }
  const ffmpegInstaller: FFmpegInstaller
  export default ffmpegInstaller
} 