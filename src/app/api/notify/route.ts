import { NextRequest, NextResponse } from "next/server";

type NotifyBody = {
  osNumero: string;
  cliente: string;
  tel?: string;
  email?: string;
  status: string;
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
  isNew?: boolean;
  mensagem?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as NotifyBody;
  const results: any = { whatsapp: null, email: null };

  const cleanTel = (body.tel || "").replace(/\D/g, "");
  const messageText = body.mensagem
    ? body.mensagem
    : body.isNew
    ? `Olá ${body.cliente.split(" ")[0]}! Recebemos seu chamado ${body.osNumero}. Acompanhe em: ${process.env.NEXT_PUBLIC_BASE_URL || ""}/acompanhar/${encodeURIComponent(body.osNumero)}`
    : `Atualização da sua OS ${body.osNumero}: status alterado para ${body.status}. Acompanhe: ${process.env.NEXT_PUBLIC_BASE_URL || ""}/acompanhar/${encodeURIComponent(body.osNumero)}`;

  // WhatsApp via Twilio if configured
  if (body.notifyWhatsApp && cleanTel) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886
    if (sid && token && from) {
      try {
        const to = `whatsapp:+55${cleanTel.slice(-11)}`;
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization:
                "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: from,
              To: to,
              Body: messageText,
            }),
          }
        );
        results.whatsapp = res.ok ? "sent" : "failed";
      } catch (e) {
        results.whatsapp = "error";
      }
    } else {
      results.whatsapp = "simulated";
    }
  }

  // Email via Resend if configured
  if (body.notifyEmail && body.email) {
    const key = process.env.RESEND_API_KEY;
    if (key) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "GBR OS <onboarding@resend.dev>",
            to: body.email,
            subject: body.isNew
              ? `Chamado ${body.osNumero} recebido`
              : `Atualização OS ${body.osNumero}: ${body.status}`,
            html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#0d0b1a;color:#ece9fb;padding:24px">
              <h2 style="margin:0 0 12px;color:#7c4dff">GBR Assistência Técnica</h2>
              <p>${messageText.replace(/\n/g, "<br/>")}</p>
              <p style="margin-top:20px"><a href="${
                process.env.NEXT_PUBLIC_BASE_URL || ""
              }/acompanhar/${encodeURIComponent(
              body.osNumero
            )}" style="background:linear-gradient(120deg,#7c4dff,#c840e0);color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Acompanhar OS</a></p>
              <p style="color:#9b95c0;font-size:12px;margin-top:24px">${body.cliente} • ${body.osNumero}</p>
            </div>`,
          }),
        });
        results.email = res.ok ? "sent" : "failed";
      } catch {
        results.email = "error";
      }
    } else {
      results.email = "simulated";
    }
  }

  // Always log
  console.log("[NOTIFY]", {
    os: body.osNumero,
    status: body.status,
    ...results,
  });

  return NextResponse.json({ ok: true, results, message: messageText });
}
