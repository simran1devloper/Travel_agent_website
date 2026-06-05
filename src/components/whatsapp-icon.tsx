export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="whatsapp-app-gradient" x1="64" x2="64" y1="7" y2="121">
          <stop offset="0" stopColor="#5dff72" />
          <stop offset="1" stopColor="#16b91f" />
        </linearGradient>
      </defs>
      <rect width="108" height="108" x="10" y="10" rx="25" fill="url(#whatsapp-app-gradient)" />
      <path
        d="M37.5 95.5 43 78.4A35.2 35.2 0 1 1 57 91.2Z"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="9"
      />
      <path
        d="M52.7 42.2c-2.5 1-5.5 4.7-5.6 7.8-.2 5.1 3.8 13.6 11.5 21.4 7.8 7.8 16.2 11.5 21.4 11.4 3.1-.1 6.8-3.1 7.8-5.6.7-1.8.4-3.2-1.1-4.1l-9.6-5.5c-1.7-1-3.2-.5-4.5 1.1l-3.4 4.2c-4.8-1.7-11.3-8.2-13-13l4.1-3.4c1.7-1.3 2.1-2.8 1.2-4.5L57.4 44c-.9-1.7-2.7-2.6-4.7-1.8Z"
        fill="#fff"
      />
    </svg>
  );
}

export function WhatsAppOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <path d="M16 4.5a11.2 11.2 0 0 0-9.5 17.1L5 27l5.6-1.5A11.2 11.2 0 1 0 16 4.5Z" />
      <path
        d="M11.8 10.6c-.4.2-1.2 1.2-1.2 2.2 0 2.5 2.2 5.7 4.3 7.3 2.2 1.7 4.9 2.7 6.3 1.9.8-.4 1.5-1.4 1.4-1.9-.1-.3-.4-.5-.8-.7l-2.5-1.2c-.4-.2-.7-.1-1 .2l-1.1 1.1c-1.8-.8-3.5-2.5-4.3-4.3l1.1-1.1c.3-.3.4-.7.2-1l-1.2-2.5c-.2-.4-.5-.7-.9-.7-.1 0-.2 0-.3.1Z"
        fill="currentColor"
        strokeWidth="0"
      />
    </svg>
  );
}
