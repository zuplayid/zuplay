
const BACKEND_URL = "https://zuplay-backend.zuplay-id.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Pemeriksaan frontend
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "zuplay-site"
      });
    }

    // Teruskan API ke backend
    if (url.pathname.startsWith("/api/")) {
      try {
        const target = new URL(
          url.pathname + url.search,
          BACKEND_URL
        );

        const response = await fetch(
          new Request(target, request)
        );

        return response;
      } catch {
        return Response.json({
          ok: false,
          message: "Backend tidak dapat dihubungi"
        }, { status: 502 });
      }
    }

    // Tampilkan file website
    if (!env.ASSETS) {
      return new Response("ASSETS binding tidak ditemukan", {
        status: 500
      });
    }

    return env.ASSETS.fetch(request);
  }
};
    
