
const HAYBI_URL = "https://haybi.id/api/h2h";

async function makeSignature(username, apiKey, refId) {
  const data = new TextEncoder().encode(username + apiKey + refId);
  const hash = await crypto.subtle.digest("MD5", data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === "/api/health") {
      return json({
        success: true,
        haybiConfigured: Boolean(
          env.HAYBI_USERNAME && env.HAYBI_API_KEY
        )
      });
    }

    if (
      url.pathname === "/api/haybi/products" &&
      request.method === "POST"
    ) {
      if (!env.HAYBI_USERNAME || !env.HAYBI_API_KEY) {
        return json({
          success: false,
          message: "Konfigurasi HAYBI belum lengkap."
        }, 500);
      }

      let input;
      try {
        input = await request.json();
      } catch {
        return json({
          success: false,
          message: "Format JSON tidak valid."
        }, 400);
      }

      const refId = crypto.randomUUID();
      const username = env.HAYBI_USERNAME;
      const sign = await makeSignature(
        username,
        env.HAYBI_API_KEY,
        refId
      );

      const body = {
        username,
        ref_id: refId,
        sign
      };

      if (input.kategori) body.kategori = input.kategori;
      if (input.operator) body.operator = input.operator;

      try {
        const response = await fetch(`${HAYBI_URL}/produk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const result = await response.text();

        let data;
        try {
          data = JSON.parse(result);
        } catch {
          return json({
            success: false,
            message: "Respons HAYBI bukan JSON yang valid.",
            upstreamStatus: response.status
          }, 502);
        }

        return json(data, response.ok ? 200 : 502);
      } catch (error) {
        return json({
          success: false,
          message: "Koneksi ke HAYBI gagal.",
          detail: String(error.message || "Network error")
        }, 502);
      }
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);

    return json({
      success: false,
      message: "Endpoint tidak ditemukan."
    }, 404);
  }
};
      
