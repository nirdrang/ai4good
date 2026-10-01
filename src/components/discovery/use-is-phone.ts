import { useEffect, useState } from "react";

const PHONE = "(max-width: 767px)";

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(PHONE).matches : false,
  );
  useEffect(() => {
    const media = window.matchMedia(PHONE);
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return phone;
}
