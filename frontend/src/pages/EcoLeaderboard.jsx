import { useEffect, useState } from "react";
import axiosInstance from "../lib/axios";
import { BACKEND_URL } from "../constants/endpoints";
import Navbar from "../components/Navbar";

function RankBadge({ rank }) {
    const colors =
        rank === 1
            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
            : rank === 2
                ? "bg-stone-200 text-stone-700 border-stone-300"
                : rank === 3
                    ? "bg-orange-100 text-orange-700 border-orange-200"
                    : "bg-stone-50 text-stone-500 border-stone-100";

    return (
        <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border ${colors}`}
        >
            {rank}
        </div>
    );
}

export default function EcoLeaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await axiosInstance.get(
                    `${BACKEND_URL}/api/delivery/leaderboard?limit=10`,
                );
                setLeaderboard(res?.data?.leaderboard || []);
            } catch (e) {
                setError(e?.response?.data?.message || "Failed to load leaderboard");
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    return (
        <div className="min-h-screen w-full bg-stone-50">
            <Navbar />

            <div className="w-full max-w-2xl mx-auto px-4 py-8">
                <div className="text-center mb-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
                        PulseBite Green Riders
                    </p>
                    <h1 className="text-2xl font-black text-stone-900 mt-1">
                        🌱 Eco Leaderboard
                    </h1>
                    <p className="text-xs text-stone-400 mt-2">
                        Top delivery partners saving the most carbon this month
                    </p>
                </div>

                {loading && (
                    <div className="flex flex-col gap-3">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="h-16 bg-white border border-stone-200 rounded-2xl animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-4 text-center">
                        {error}
                    </div>
                )}

                {!loading && !error && leaderboard.length === 0 && (
                    <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
                        <p className="text-sm text-stone-500">No riders ranked yet.</p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {leaderboard.map((rider) => (
                        <div
                            key={rider.rank}
                            className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex items-center gap-4"
                        >
                            <RankBadge rank={rider.rank} />

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-stone-900 truncate">
                                    {rider.name}
                                </p>
                                <p className="text-xs text-stone-400 mt-0.5">
                                    {rider.badge} · {rider.vehicleType}
                                </p>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-emerald-600">
                                    {rider.ecoScore} pts
                                </p>
                                <p className="text-[10px] text-stone-400">
                                    Safety {rider.safetyRating}%
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}