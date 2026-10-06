/**
 * Vercel Edge Function — streams reel videos through our own origin so the
 * browser can store them for offline playback. See proxy/video-proxy-core.ts.
 */
import { proxyVideo } from "../proxy/video-proxy-core";

export const config = { runtime: "edge" };

export default function handler(request: Request): Promise<Response> {
  return proxyVideo(request);
}
