/**
 * Cloudflare Pages Function — same relay as api/video-proxy.ts (Vercel),
 * for the Cloudflare deployment. See proxy/video-proxy-core.ts.
 */
import { proxyVideo } from "../../proxy/video-proxy-core";

export const onRequest = ({ request }: { request: Request }): Promise<Response> =>
  proxyVideo(request);
