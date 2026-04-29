/**
 * Route Handler for POST /api/admin/process-url
 *
 * Overrides the Next.js rewrite proxy for this path so we can forward cookies
 * and wait up to 3 minutes — the default Next.js proxy times out on long requests
 * (URL fetch + two Claude calls typically take 60–90 s).
 */

export const dynamic = "force-dynamic";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 180_000; // 3 minutes

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${BACKEND}/api/admin/process-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the auth cookie so the backend can verify the admin session
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch (err: unknown) {
    clearTimeout(timer);
    const name = (err as Error)?.name ?? "";
    if (name === "AbortError" || name === "TimeoutError") {
      return Response.json(
        { detail: "处理超时（超过 3 分钟），请重试" },
        { status: 504 }
      );
    }
    return Response.json(
      { detail: `代理错误: ${(err as Error)?.message ?? err}` },
      { status: 502 }
    );
  }
}
