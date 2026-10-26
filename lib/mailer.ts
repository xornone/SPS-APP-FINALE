import nodemailer from "nodemailer";

export interface SendSuggestionParams {
  category: string;
  message: string;
  authorName?: string;
  isAnonymous: boolean;
  email?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

export interface SendMailResult {
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSuggestionEmail(params: SendSuggestionParams): Promise<SendMailResult> {
  const { category, message, authorName, isAnonymous, email, attachments = [] } = params;

  const targetEmail = "contact@spscycling.fr";
  const smtpHost = process.env.SMTP_HOST || "ssl0.ovh.net";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"SPS Boîte à idées" <${smtpUser}>` : `"SPS Boîte à idées" <${targetEmail}>`);

  const senderDisplayName = isAnonymous ? "Membre anonyme" : authorName?.trim() || "Membre SPS";
  const replyTo = email?.trim() || undefined;

  const subject = `[Boîte à idées SPS] ${category} — ${senderDisplayName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4eeff; margin: 0; padding: 20px; color: #1a1422; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(107, 33, 168, 0.08); }
          .header { background: linear-gradient(135deg, #7E22CE 0%, #3B0764 100%); color: #ffffff; padding: 28px; }
          .badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
          .title { font-size: 22px; font-weight: 800; margin: 0; line-height: 1.2; }
          .body-content { padding: 28px; }
          .meta-box { background: #faf5ff; border: 1px solid #f3e8ff; border-radius: 12px; padding: 14px 18px; margin-bottom: 22px; font-size: 14px; line-height: 1.6; }
          .meta-row { margin-bottom: 6px; }
          .meta-row:last-child { margin-bottom: 0; }
          .label { font-weight: bold; color: #6b21a8; }
          .message-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #6b21a8; letter-spacing: 0.5px; margin-bottom: 8px; }
          .message-box { background: #ffffff; border: 1px solid #e9d5ff; border-radius: 14px; padding: 18px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #1f2937; }
          .attachments-info { margin-top: 20px; padding: 12px 16px; background: #f3f4f6; border-radius: 10px; font-size: 13px; color: #4b5563; }
          .footer { padding: 20px 28px; background: #faf5ff; border-top: 1px solid #f3e8ff; font-size: 12px; color: #9333ea; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge">💡 Boîte à idées SPS</span>
            <h1 class="title">${escapeHtml(category)}</h1>
          </div>
          <div class="body-content">
            <div class="meta-box">
              <div class="meta-row"><span class="label">Auteur :</span> ${escapeHtml(senderDisplayName)} ${isAnonymous ? "<em>(Souhait d'anonymat)</em>" : ""}</div>
              ${email ? `<div class="meta-row"><span class="label">Email de réponse :</span> <a href="mailto:${escapeHtml(email)}" style="color: #7e22ce;">${escapeHtml(email)}</a></div>` : `<div class="meta-row"><span class="label">Email :</span> Non renseigné</div>`}
              <div class="meta-row"><span class="label">Date :</span> ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</div>
            </div>

            <div class="message-title">Message / Suggestion :</div>
            <div class="message-box">${escapeHtml(message)}</div>

            ${
              attachments.length > 0
                ? `<div class="attachments-info">📎 <b>${attachments.length} pièce(s) jointe(s)</b> incluse(s) dans cet email :<br>${attachments.map((a) => `• ${escapeHtml(a.filename)}`).join("<br>")}</div>`
                : ""
            }
          </div>
          <div class="footer">
            Message envoyé depuis l'application officielle SPS Cycling (onglet Boîte à idées).
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
[Boîte à idées SPS] - ${category}
========================================
Auteur : ${senderDisplayName} ${isAnonymous ? "(Anonyme)" : ""}
Email : ${email || "Non renseigné"}
Date : ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}

Message :
----------------------------------------
${message}
----------------------------------------
${attachments.length > 0 ? `Pièces jointes (${attachments.length}) : ` + attachments.map((a) => a.filename).join(", ") : ""}
  `.trim();

  // Mode simulation locale si les identifiants SMTP ne sont pas encore renseignés
  if (!smtpUser || !smtpPass) {
    console.log("📨 [SIMULATION EMAIL] Boîte à idées SPS :");
    console.log(`   De : ${senderDisplayName} <${email || "anonyme"}>`);
    console.log(`   Pour : ${targetEmail}`);
    console.log(`   Sujet : ${subject}`);
    console.log(`   Pièces jointes : ${attachments.length} fichier(s)`);
    console.log("   --- Contenu du message ---");
    console.log(message);
    console.log("   --------------------------");
    console.log("💡 Astuce : Renseigne SMTP_USER et SMTP_PASS dans .env.local pour envoyer les vrais emails.");

    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: targetEmail,
      replyTo,
      subject,
      text: textContent,
      html: htmlContent,
      attachments: attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("❌ Erreur lors de l'envoi de l'email SMTP :", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
