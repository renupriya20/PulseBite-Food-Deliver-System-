export const createSocketService = ({ io, inMemory = {} }) => {
    const driverLatestLocation = inMemory.driverLatestLocation || (inMemory.driverLatestLocation = new Map());

    const buildOrderRoom = (orderId) => `customer:${orderId}`;
    const buildAdminRoom = () => "admin";

    const isValidLngLat = (coords) => {
        if (!Array.isArray(coords) || coords.length !== 2) return false;
        const [lng, lat] = coords;
        return Number.isFinite(Number(lng)) && Number.isFinite(Number(lat));
    };

    io.on("connection", (socket) => {
        socket.on("join_order_room", ({ orderId }) => {
            if (!orderId) return;
            socket.join(buildOrderRoom(orderId));
        });

        socket.on("update_driver_location", async ({ driverId, activeOrderId, coordinates }) => {
            if (!driverId || !activeOrderId) return;
            if (!isValidLngLat(coordinates)) return;

            const payload = {
                activeOrderId: String(activeOrderId),
                deliveryBoyId: String(driverId),
                coordinates: {
                    latitude: Number(coordinates[1]),
                    longitude: Number(coordinates[0]),
                },
                at: Date.now(),
            };

            driverLatestLocation.set(String(driverId), payload);

            // Broadcast updated live position JSON string directly to the customer room.
            io.to(buildOrderRoom(activeOrderId)).emit("update_driver_location", JSON.stringify(payload));
        });

        socket.on("trigger_sos_alert", ({ adminRoomOrderId, orderId, coordinates, reason }) => {
            const coordsOk = isValidLngLat(coordinates);
            if (!coordsOk) return;

            const payload = {
                event: "SOS_ALERT",
                orderId: orderId || null,
                roomId: orderId ? buildOrderRoom(orderId) : null,
                coordinates: {
                    latitude: Number(coordinates[1]),
                    longitude: Number(coordinates[0]),
                },
                reason: reason || "SOS",
                createdAt: new Date().toISOString(),
            };

            io.to(buildAdminRoom()).emit("trigger_sos_alert", payload);

            if (orderId) {
                io.to(buildOrderRoom(orderId)).emit("trigger_sos_alert", payload);
            }
        });
    });
};

