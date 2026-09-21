// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs on Supabase Edge Functions (Deno environment)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

interface CardResolution {
  id: string;
  internal_card_no: string;
  public_token: string;
  destination_url: string | null;
  status: string;
  scan_count: number;
}

function renderHtmlErrorPage(title: string, message: string, detail?: string, statusCode: number = 404): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Dynamic Card Resolver</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 1rem;
      max-width: 480px;
      width: 100%;
      padding: 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.75rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .detail {
      background: #020617;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      color: #38bdf8;
      word-break: break-all;
      margin-bottom: 1.5rem;
    }
    .footer {
      font-size: 0.75rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Notice</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${detail ? `<div class="detail">${detail}</div>` : ''}
    <div class="footer">Dynamic QR + NFC Infrastructure</div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  const url = new URL(req.url);

  // Extract public token from multiple possible URL patterns:
  // 1. /functions/v1/c/7KQ4M8X2
  // 2. /c/7KQ4M8X2
  // 3. /7KQ4M8X2
  // 4. ?token=7KQ4M8X2
  let token = url.searchParams.get("token") || "";

  if (!token) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    const cIndex = pathParts.lastIndexOf("c");
    if (cIndex !== -1 && pathParts[cIndex + 1]) {
      token = pathParts[cIndex + 1];
    } else if (pathParts.length > 0) {
      token = pathParts[pathParts.length - 1];
    }
  }

  const cleanToken = token.trim().toUpperCase();

  if (!cleanToken) {
    return renderHtmlErrorPage(
      "Missing Card Token",
      "No public card token was provided in the URL.",
      undefined,
      400
    );
  }

  // Initialize Supabase Client using Edge Runtime environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    return renderHtmlErrorPage(
      "Server Configuration Error",
      "The server is temporarily misconfigured. Please contact administrator.",
      undefined,
      500
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Atomically increment scan and retrieve card details
    const { data, error } = await supabase.rpc("resolve_and_increment_scan", {
      token_input: cleanToken,
    });

    if (error) {
      console.error("Database RPC error:", error);
      return renderHtmlErrorPage(
        "Database Error",
        "An unexpected error occurred while resolving this card.",
        undefined,
        500
      );
    }

    const cards = data as CardResolution[] | null;
    const card = cards && cards.length > 0 ? cards[0] : null;

    // 1. Unknown token / Card not found
    if (!card) {
      return renderHtmlErrorPage(
        "Card Not Found",
        "The scanned card token does not match any registered card in the system.",
        `Token: ${cleanToken}`,
        404
      );
    }

    // 2. Disabled Card
    if (card.status === "DISABLED") {
      return renderHtmlErrorPage(
        "Card Deactivated",
        "This dynamic NFC/QR card has been deactivated by the administrator.",
        `Card: ${card.internal_card_no}`,
        403
      );
    }

    // 3. Missing / Unconfigured destination URL
    if (!card.destination_url || card.destination_url.trim() === "") {
      return renderHtmlErrorPage(
        "Destination Not Configured",
        "This card is active, but its destination URL has not been assigned yet.",
        `Card: ${card.internal_card_no}`,
        200
      );
    }

    // 4. Validate URL protocol
    const destination = card.destination_url.trim();
    try {
      const parsedUrl = new URL(destination);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      return renderHtmlErrorPage(
        "Invalid Destination URL",
        "The configured target URL is malformed.",
        destination,
        500
      );
    }

    // 5. Successful HTTP 302 Dynamic Redirection
    return new Response(null, {
      status: 302,
      headers: {
        "Location": destination,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Unhandled resolver exception:", errorMsg);
    return renderHtmlErrorPage(
      "Resolution Failed",
      "Unable to complete the dynamic redirection request.",
      undefined,
      500
    );
  }
});
