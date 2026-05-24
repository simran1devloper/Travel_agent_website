import { MessageCircle } from "lucide-react";

export function WhatsAppFab() {
  return (
    <a
      href="https://wa.me/15551234567?text=Hi%20JourneyMakers%2C%20I%27d%20like%20to%20plan%20a%20trip."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-accent text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
    >
      <MessageCircle className="size-6" />
    </a>
  );
}
