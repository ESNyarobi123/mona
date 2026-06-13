/** Payload for Lipa Namba QR — namba safi ili app ya malipo iscan. */
export function buildLipaNambaQrPayload(lipaNamba: string): string {
  const digits = lipaNamba.replace(/\D/g, "");
  return digits.length >= 5 ? digits : lipaNamba.trim();
}
