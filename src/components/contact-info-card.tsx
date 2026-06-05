import { MapPin, Phone, UserRound, X } from "lucide-react";
import { useContent } from "@/lib/use-content";
import { companyWhatsAppLink } from "@/lib/company-contact";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

export function ContactInfoCard({
  open,
  onClose,
  message = "Hi JourneyMakers, I'd like to speak with a travel expert.",
}: {
  open: boolean;
  onClose: () => void;
  message?: string;
}) {
  const { c } = useContent("footer");

  if (!open) return null;

  const companyName = c("contact_card", "company_name", "JourneyMakers");
  const agentName = c("contact_card", "agent_name", "Sonia Mehra");
  const agentRole = c("contact_card", "agent_role", "Senior Travel Expert");
  const phone = c("contact_card", "phone", c("contact", "phone", "+1 (555) 123-4567"));
  const whatsapp = c("contact_card", "whatsapp", c("contact", "whatsapp", "15551234567"));
  const location = c(
    "contact_card",
    "location",
    c("contact", "address", "JourneyMakers Travel Desk, New York, USA"),
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-end bg-black/28 px-4 py-5 backdrop-blur-[2px] sm:px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[#d49a68]/45 bg-[#0c1014]/95 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase text-[#eda36b]">Contact information</p>
            <h2 className="mt-1 text-2xl font-black leading-tight">{companyName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact information"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/18 text-white/74 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-3">
          <ContactInfoRow icon={UserRound} label="Agent" value={agentName} detail={agentRole} />
          <ContactInfoRow icon={Phone} label="Phone" value={phone} detail="Direct travel desk" />
          <ContactInfoRow icon={MapPin} label="Location" value={location} />
        </div>

        <a
          href={companyWhatsAppLink(message, whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(37,211,102,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1fc25a] focus-ring"
        >
          <WhatsAppIcon className="size-5" /> Continue on WhatsApp
        </a>
      </div>
    </div>
  );
}

function ContactInfoRow({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/12 bg-white/[0.055] p-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-[#eda36b]" />
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase text-white/48">{label}</p>
        <p className="text-sm font-extrabold leading-5 text-white">{value}</p>
        {detail && <p className="text-xs font-semibold text-white/58">{detail}</p>}
      </div>
    </div>
  );
}
