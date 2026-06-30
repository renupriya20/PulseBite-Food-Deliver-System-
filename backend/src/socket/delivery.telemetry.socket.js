import { createSocketService } from "./socketService.js";

export const registerDeliverySocket = (io) => {
  createSocketService({ io });
};


