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
    const url = new URL(req.url);
    const wallet = url.searchParams.get("wallet")?.trim();

    if (!wallet) {
      return new Response(JSON.stringify({ error: "wallet is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const backendUrl = getBackendUrl();
    const backendRes = await fetch(
      `${backendUrl}/api/v1/auth/x/account?wallet=${encodeURIComponent(wallet)}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await backendRes.json().catch(() => ({ linked: false }));
    return new Response(JSON.stringify(data), {
      status: backendRes.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Internal server function error", details: err?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
