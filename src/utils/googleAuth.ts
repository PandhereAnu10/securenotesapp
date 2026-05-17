import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;

export function isGoogleAuthEnabled(): boolean {
  return Boolean(clientId?.trim());
}

export async function verifyGoogleIdToken(credential: string) {
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google account did not return an email address");
  }

  if (payload.email_verified === false) {
    throw new Error("Google email is not verified");
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email,
    picture: payload.picture,
  };
}
