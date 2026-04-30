import net from "net";
import tls from "tls";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!from) {
    throw new Error("SMTP_FROM эсвэл SMTP_USER тохируулаагүй байна");
  }

  return { host, port, secure, user, pass, from };
}

export function isSmtpConfigured() {
  return Boolean(getSmtpConfig());
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function normalizeEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function escapeData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

export async function sendSmtpMail(input: SendMailInput) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("SMTP тохиргоо хийгдээгүй байна");
  }

  let socket: net.Socket | tls.TLSSocket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });

  socket.setEncoding("utf8");

  let buffer = "";
  const readResponse = () =>
    new Promise<string>((resolve, reject) => {
      const onData = (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        const last = lines[lines.length - 1];
        if (!last || !/^\d{3} /.test(last)) return;
        const response = buffer;
        buffer = "";
        socket.off("data", onData);
        const code = Number(last.slice(0, 3));
        if (code >= 400) reject(new Error(response.trim()));
        else resolve(response);
      };
      socket.on("data", onData);
      socket.once("error", reject);
    });

  const send = async (command: string) => {
    socket.write(`${command}\r\n`);
    return readResponse();
  };

  await readResponse();
  await send("EHLO mglstore.mn");

  if (!config.secure && process.env.SMTP_REQUIRE_TLS !== "false") {
    await send("STARTTLS");
    socket = tls.connect({ socket, servername: config.host });
    socket.setEncoding("utf8");
    await send("EHLO mglstore.mn");
  }

  if (config.user && config.pass) {
    const token = Buffer.from(`\0${config.user}\0${config.pass}`, "utf8").toString("base64");
    await send(`AUTH PLAIN ${token}`);
  }

  const fromAddress = normalizeEmailAddress(config.from);
  const toAddress = normalizeEmailAddress(input.to);
  await send(`MAIL FROM:<${fromAddress}>`);
  await send(`RCPT TO:<${toAddress}>`);
  socket.write("DATA\r\n");
  await readResponse();

  const message = [
    `From: ${config.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    escapeData(input.text),
    ".",
    "",
  ].join("\r\n");

  socket.write(message);
  await readResponse();
  await send("QUIT").catch(() => undefined);
  socket.end();
}
