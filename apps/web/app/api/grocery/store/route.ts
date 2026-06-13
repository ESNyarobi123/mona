import { getGroceryStoreEntry } from "@monana/grocery";
import { handle, ok } from "../../../../lib/api";

/** Mteja anapoingia Grocery store — machaguo mawili makuu */
export function GET() {
  return handle(async () => ok(getGroceryStoreEntry()));
}
