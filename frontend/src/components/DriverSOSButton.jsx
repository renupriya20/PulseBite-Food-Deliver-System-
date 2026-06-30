import { FaSiren } from "react-icons/fa";

export default function DriverSOSButton({ onClick, disabled }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${disabled
                    ? "bg-red-200 text-red-900 opacity-60 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
        >
            <FaSiren /> SOS Emergency
        </button>
    );
}

