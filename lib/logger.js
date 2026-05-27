/**
 * Structured logger for Next.js API routes.
 *
 * In production: writes newline-delimited JSON to stdout so log aggregators
 * (Datadog, CloudWatch, Azure Monitor, etc.) can parse and index each field.
 *
 * In development: pretty-prints to the terminal with coloured level tags.
 *
 * Usage:
 *   import logger from "@/lib/logger";
 *   logger.info("User authenticated", { userId: 42 });
 *   logger.warn("Slow agent response", { durationMs: 4900 });
 *   logger.error("DB query failed", { error });
 *   logger.debug("Payload built", { payload });   // only emits in development
 */

const IS_PROD = process.env.NODE_ENV === "production";

// ── ANSI colours (dev only) ───────────────────────────────────
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const CYAN   = "\x1b[36m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const MAGENTA = "\x1b[35m";

const LEVEL_COLOURS = {
  debug: DIM + MAGENTA,
  info:  CYAN,
  warn:  YELLOW,
  error: RED,
};

// ── Serialise error objects for JSON output ───────────────────
function serializeError(err) {
  if (!err || typeof err !== "object") return err;
  return {
    message: err.message,
    name:    err.name,
    stack:   IS_PROD ? undefined : err.stack,
    code:    err.code,
  };
}

// ── Sanitise context — handle Error instances ─────────────────
function sanitize(ctx) {
  if (!ctx || typeof ctx !== "object") return ctx;
  const out = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = v instanceof Error ? serializeError(v) : v;
  }
  return out;
}

// ── Core emit ─────────────────────────────────────────────────
function emit(level, message, ctx = {}) {
  const ts = new Date().toISOString();

  if (IS_PROD) {
    // JSON line — one object per log entry
    process.stdout.write(
      JSON.stringify({
        ts,
        level,
        msg: message,
        ...sanitize(ctx),
      }) + "\n"
    );
  } else {
    // Pretty dev output
    const colour = LEVEL_COLOURS[level] || "";
    const tag    = `${BOLD}${colour}[${level.toUpperCase().padEnd(5)}]${RESET}`;
    const time   = `${DIM}${ts}${RESET}`;
    const msg    = `${GREEN}${message}${RESET}`;

    if (Object.keys(ctx).length) {
      const sanitized = sanitize(ctx);
      const detail = JSON.stringify(sanitized, null, 2)
        .split("\n")
        .map((l) => `  ${DIM}${l}${RESET}`)
        .join("\n");
      console.log(`${tag} ${time} ${msg}\n${detail}`);
    } else {
      console.log(`${tag} ${time} ${msg}`);
    }
  }
}

// ── Public API ────────────────────────────────────────────────
const logger = {
  debug: (msg, ctx = {}) => {
    if (!IS_PROD) emit("debug", msg, ctx);
  },
  info:  (msg, ctx = {}) => emit("info",  msg, ctx),
  warn:  (msg, ctx = {}) => emit("warn",  msg, ctx),
  error: (msg, ctx = {}) => emit("error", msg, ctx),
};

export default logger;
