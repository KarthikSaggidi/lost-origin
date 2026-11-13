declare namespace Cloudflare {
  interface Env {
    COMMUNICATIONS_URL?: string;
    COMMUNICATIONS_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAILS?: string;
    ADMIN_ORIGIN?: string;
    ADMIN_LOGIN_EMAIL?: string;
    ADMIN_PASSWORD_HASH?: string;
    AUTH_RELAY_SECRET?: string;
    AUTH_RATE_SECRET?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_VERIFY_SERVICE_SID?: string;
  }
}
