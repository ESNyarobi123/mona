import { api } from "../services/api.service";

export function getRestaurantMenu(slot: "BREAKFAST" | "LUNCH" | "DINNER") {
  return api.listRestaurantMenu(slot);
}
