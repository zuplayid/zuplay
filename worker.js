
const HAYBI_USERNAME = "AGN93B5F5";
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
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API pemeriksaan backend
    if (url.pathname === "/api/health") {
      return json({
        success: true,
        database: Boolean(env.DB),
        haybiConfigured: Boolean(env.HAYBI_API_KEY)
      });
    }

    // Mengambil daftar produk dari HAYBI
    if (
      url.pathname === "/api/haybi/products" &&
      request.method === "POST"
    ) {
      if (!env.HAYBI_API_KEY) {
        return json({
          success: false,
          message: "HAYBI_API_KEY belum dipasang."
        }, 500);
      }

      try {
        const input = await request.json();
        const refId = crypto.randomUUID();

        const sign = await makeSignature(
          HAYBI_USERNAME,
          env.HAYBI_API_KEY,
          refId
        );

        const body = {
          username: HAYBI_USERNAME,
          ref_id: refId,
          sign
        };

        if (input.kategori) body.kategori = input.kategori;
        if (input.operator) body.operator = input.operator;

        const response = await fetch(
          `${HAYBI_URL}/produk`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          }
        );

        const result = await response.text();

        return new Response(result, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("Content-Type") ||
              "application/json",
            "Cache-Control": "no-store"
          }
        });
      } catch (error) {
        return json({
          success: false,
          message: "Gagal menghubungi HAYBI.",
          detail: String(error.message || error)
        }, 502);
      }
    }

    // Halaman website tetap dilayani seperti sebelumnya
    return env.ASSETS.fetch(request);
  }
};
