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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(`${backendUrl}/api/v2/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json().catch(() => ({
      error: `Failed to process message (HTTP ${backendRes.status})`,
    }));

    return new Response(JSON.stringify(data), {
      status: backendRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Server function execution failed", details: err?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
