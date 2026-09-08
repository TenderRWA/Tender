export const config = {
  runtime: "edge",
};

const getBackendUrl = () => {
  const url =
    process.env.TENDER_API_URL ||
    process.env.VITE_API_URL ||
    "https://api.tenderrwa.com";
  return url.trim().replace(/\/+$/, "");
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/v2/ai/context`, {
      headers: { Accept: "application/json" },
    });

    const data = await backendRes.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: backendRes.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch context", details: err?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
