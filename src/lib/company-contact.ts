export const COMPANY_WHATSAPP_NUMBER = "15551234567";

export function companyWhatsAppLink(message: string, number = COMPANY_WHATSAPP_NUMBER) {
  const digits = number.replace(/\D/g, "") || COMPANY_WHATSAPP_NUMBER;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
