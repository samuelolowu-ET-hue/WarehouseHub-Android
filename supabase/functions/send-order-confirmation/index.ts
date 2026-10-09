import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { order } = await req.json();

    if (!order) {
      return new Response(JSON.stringify({ error: "Missing order payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    // Build items HTML rows
    const itemRows = (order.items ?? [])
      .map(
        (item: {
          product_name: string;
          variant_name?: string;
          quantity: number;
          unit_price: number;
          line_total: number;
        }) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #DDD9D3;font-size:14px;color:#1C1C1E;">
            ${item.product_name}${item.variant_name ? ` <span style="color:#9AA3AD;">(${item.variant_name})</span>` : ""}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #DDD9D3;font-size:14px;color:#1C1C1E;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #DDD9D3;font-size:14px;color:#1C1C1E;text-align:right;">£${Number(item.unit_price).toFixed(2)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #DDD9D3;font-size:14px;font-weight:600;color:#1C1C1E;text-align:right;">£${Number(item.line_total).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Order Confirmation</title></head>
<body style="margin:0;padding:0;background:#F5F3EF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EF;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(28,28,30,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1C1C1E;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#F5F3EF;letter-spacing:0.05em;">WAREHOUSE</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#9AA3AD;letter-spacing:0.1em;text-transform:uppercase;">Order Confirmation</p>
          </td>
        </tr>
        <!-- Greeting -->
        <tr>
          <td style="padding:32px 40px 0;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#1C1C1E;">Thank you, ${order.customer_name}!</h2>
            <p style="margin:0;font-size:15px;color:#6B7280;line-height:1.6;">
              Your order has been confirmed. We'll get it ready for dispatch soon.
            </p>
          </td>
        </tr>
        <!-- Order meta -->
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EF;border-radius:6px;padding:16px 20px;">
              <tr>
                <td style="font-size:13px;color:#9AA3AD;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:4px;">Order number</td>
                <td style="font-size:13px;color:#9AA3AD;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:4px;text-align:right;">Order date</td>
              </tr>
              <tr>
                <td style="font-size:16px;font-weight:700;color:#1C1C1E;">${order.order_number}</td>
                <td style="font-size:14px;color:#1C1C1E;text-align:right;">${orderDate}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Items table -->
        <tr>
          <td style="padding:0 40px 24px;">
            <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1C1C1E;text-transform:uppercase;letter-spacing:0.06em;">Items ordered</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #DDD9D3;border-radius:6px;overflow:hidden;">
              <thead>
                <tr style="background:#F5F3EF;">
                  <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#9AA3AD;text-align:left;text-transform:uppercase;letter-spacing:0.06em;">Product</th>
                  <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#9AA3AD;text-align:center;text-transform:uppercase;letter-spacing:0.06em;">Qty</th>
                  <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#9AA3AD;text-align:right;text-transform:uppercase;letter-spacing:0.06em;">Unit</th>
                  <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#9AA3AD;text-align:right;text-transform:uppercase;letter-spacing:0.06em;">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td>
        </tr>
        <!-- Totals -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:14px;color:#6B7280;padding:4px 0;">Subtotal</td>
                <td style="font-size:14px;color:#1C1C1E;text-align:right;padding:4px 0;">£${Number(order.subtotal).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6B7280;padding:4px 0;">Shipping</td>
                <td style="font-size:14px;color:#1C1C1E;text-align:right;padding:4px 0;">${Number(order.shipping_total) === 0 ? "Free" : "£" + Number(order.shipping_total).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:8px 0;"><hr style="border:none;border-top:1px solid #DDD9D3;margin:0;"></td>
              </tr>
              <tr>
                <td style="font-size:16px;font-weight:700;color:#1C1C1E;padding:4px 0;">Total</td>
                <td style="font-size:16px;font-weight:700;color:#1C1C1E;text-align:right;padding:4px 0;">£${Number(order.total).toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Customer info -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EF;border-radius:6px;padding:16px 20px;">
              <tr><td style="font-size:13px;font-weight:600;color:#1C1C1E;padding-bottom:8px;text-transform:uppercase;letter-spacing:0.06em;">Customer details</td></tr>
              <tr><td style="font-size:14px;color:#1C1C1E;">${order.customer_name}</td></tr>
              <tr><td style="font-size:14px;color:#6B7280;">${order.customer_email}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F5F3EF;padding:24px 40px;text-align:center;border-top:1px solid #DDD9D3;">
            <p style="margin:0;font-size:13px;color:#9AA3AD;">Questions? Reply to this email or visit our store.</p>
            <p style="margin:8px 0 0;font-size:12px;color:#C4C4C4;">© ${new Date().getFullYear()} Warehouse. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [order.customer_email],
        subject: `Order confirmed — ${order.order_number}`,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(
        `Resend API error ${resendResponse.status}: ${JSON.stringify(resendData)}`
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[send-order-confirmation] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
