// "Hubungi pengelola via WhatsApp" (P3-WAM-05): tautan wa.me ke nomor pengelola property dengan teks terisi.
import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { openExternal } from "@/lib/native";
import { cachedManagementContact, resolvePublicContacts, waLink, type PublicContacts } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/**
 * Kontak pengelola untuk layar publik (login/daftar), juga di perangkat baru: bila perlu memuat daftar property registrasi publik
 * (`whatsapp_number` per property). `enabled` = hanya saat kontak dibutuhkan (hemat panggilan publik yang di-rate-limit).
 */
export function usePublicContacts(enabled: boolean, propertyName?: string | null): PublicContacts {
  const cached = cachedManagementContact();
  const needList = enabled && (!!propertyName || !cached.whatsapp_number);
  const q = useQuery({ queryKey: ["reg", "properties"], queryFn: () => api().properties(), enabled: needList, staleTime: 10 * 60_000, retry: false });
  return resolvePublicContacts(cached, q.data, propertyName);
}

/** Satu tombol untuk kontak utama, atau satu tombol per property; null bila tidak ada nomor sama sekali. */
export function PublicContactButtons({ contacts, text, className }: { contacts: PublicContacts; text: (propertyName: string | null) => string; className?: string }) {
  if (contacts.primary) return <WhatsAppButton number={contacts.primary.whatsapp_number} text={text(contacts.primary.property_name)} className={className} />;
  if (!contacts.options.length) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {contacts.options.map((o) => (
        <WhatsAppButton key={o.property_name + o.whatsapp_number} number={o.whatsapp_number} text={text(o.property_name)} label={`WhatsApp pengelola ${o.property_name}`} variant="outline" />
      ))}
    </div>
  );
}

export function WhatsAppButton({ number, text, label = "Hubungi pengelola via WhatsApp", className, variant = "solid" }: { number: string | null | undefined; text?: string; label?: string; className?: string; variant?: "solid" | "outline" }) {
  const href = waLink(number, text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        openExternal(href);
      }}
      className={cn(
        "tap inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold",
        variant === "solid" ? "bg-[#25D366] text-white shadow-[0_6px_18px_rgb(37_211_102/0.28)]" : "border border-[#25D366] bg-card text-[#128C7E]",
        className,
      )}
    >
      <MessageCircle size={18} /> {label}
    </a>
  );
}
