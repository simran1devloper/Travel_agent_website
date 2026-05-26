// Central media configuration
// Edit these values to change the hero poster and background video without touching components.

import bangkokSingapore from "@/assets/Bangkok & Singapore.jpeg";
import newYork from "@/assets/Newyork.jpg";
import salonei from "@/assets/Salonei.jpeg";
import switzerland from "@/assets/swizerland.jpeg";
import tokyoSeoul from "@/assets/Tokyo & Seoul.jpeg";
import vietnam from "@/assets/vitenam.jpeg";

export const MEDIA = {
  heroVideo: "/videodesign.mp4",
  heroPoster: bangkokSingapore,
  destinations: {
    "bangkok-singapore": bangkokSingapore,
    newyork: newYork,
    "newyork-citypulse": newYork,
    salonei: salonei,
    "salonei-retreat": salonei,
    switzerland: switzerland,
    "switzerland-alpine": switzerland,
    "tokyo-seoul": tokyoSeoul,
    "tokyo-seoul-fusion": tokyoSeoul,
    vietnam: vietnam,
    "vietnam-river": vietnam,
  } as Record<string, string>,
};
