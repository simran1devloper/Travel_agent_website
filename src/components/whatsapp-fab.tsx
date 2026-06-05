import { useState } from "react";
import { ContactInfoCard } from "@/components/contact-info-card";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

export function WhatsAppFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open JourneyMakers contact information"
        className="fixed bottom-6 right-6 z-40 flex size-16 items-center justify-center rounded-[22px] bg-transparent shadow-2xl transition-transform hover:scale-110 focus-ring"
      >
        <WhatsAppIcon className="size-16" />
      </button>
      <ContactInfoCard
        open={open}
        onClose={() => setOpen(false)}
        message="Hi JourneyMakers, I'd like to plan a trip."
      />
    </>
  );
}
