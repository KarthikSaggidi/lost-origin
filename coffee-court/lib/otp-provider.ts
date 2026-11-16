export type OtpConfig = {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  LOCAL_OTP_TERMINAL?: string;
};
export function terminalOtpConfigured(config: OtpConfig) {
  return config.LOCAL_OTP_TERMINAL === "1";
}
export function otpConfigured(config: OtpConfig) {
  return (
    /^AC[a-fA-F0-9]{32}$/.test(config.TWILIO_ACCOUNT_SID || "") &&
    Boolean(config.TWILIO_AUTH_TOKEN) &&
    /^VA[a-fA-F0-9]{32}$/.test(config.TWILIO_VERIFY_SERVICE_SID || "")
  );
}
export async function otpProvider(
  config: OtpConfig,
  operation: "send" | "check",
  phone: string,
  code?: string,
  fetcher: typeof fetch = fetch,
) {
  if (!otpConfigured(config))
    throw new Error(
      "SMS login is not configured yet. Please contact the café team.",
    );
  const endpoint = operation === "send" ? "Verifications" : "VerificationCheck";
  const response = await fetcher(
    `https://verify.twilio.com/v2/Services/${config.TWILIO_VERIFY_SERVICE_SID}/${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`)}`,
      },
      body: new URLSearchParams(
        operation === "send"
          ? { To: `+91${phone}`, Channel: "sms" }
          : { To: `+91${phone}`, Code: code || "" },
      ),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = (await response.json()) as { sid?: string; status?: string };
  if (!response.ok)
    throw new Error(
      operation === "send"
        ? "The code could not be sent. Please try again shortly."
        : "The code is invalid or has expired.",
    );
  if (operation === "send" && (!result.sid || result.status !== "pending"))
    throw new Error("The code could not be sent. Please try again shortly.");
  return result;
}
