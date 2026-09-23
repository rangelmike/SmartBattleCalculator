const localPart = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const domainLabel = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailAddress(email: string) {
  if (email.length > 254) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !localPart.test(local) || domain.length > 253) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every((label) => domainLabel.test(label)) && /^[A-Za-z]{2,63}$/.test(labels.at(-1) ?? "");
}

export function assertValidEmailAddress(email: string) {
  if (!isValidEmailAddress(email)) throw new Error("Enter a valid email address.");
}
