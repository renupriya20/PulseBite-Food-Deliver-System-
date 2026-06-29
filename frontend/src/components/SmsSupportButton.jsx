import { useMemo } from "react";
import { FaSms } from "react-icons/fa";

/**
 * Floating SMS button across all pages.
 * Uses mailto-like pattern via SMS: sms:<number>?body=<text>
 */
function SmsSupportButton({ phoneNumber, message }) {
    const href = useMemo(() => {
        const number = (phoneNumber || "").replace(/[^0-9+]/g, "");
        if (!number) return null;

        const body = encodeURIComponent(message || "Order karo");
        return `sms:${number}?body=${body}`;
    }, [phoneNumber, message]);

    if (!href) return null;

    return (
        <a
            href={href}
            className="fixed bottom-6 right-6 z-[99999] w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 flex items-center justify-center cursor-pointer"
            title="Message / Order karo"
            aria-label="Message / Order karo"
        >
            <FaSms className="text-xl" />
        </a>
    );
}

export default SmsSupportButton;

