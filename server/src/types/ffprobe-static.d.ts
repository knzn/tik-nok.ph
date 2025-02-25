declare module 'ffprobe-static' {
  interface FFprobeStatic {
    path: string
    version: string
  }
  const ffprobeStatic: FFprobeStatic
  export default ffprobeStatic
} 