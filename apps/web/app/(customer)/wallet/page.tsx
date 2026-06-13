import { redirect } from "next/navigation";
import { WALLET_ENABLED } from "../../../lib/features";

export default function WalletPage() {
  if (!WALLET_ENABLED) {
    redirect("/account");
  }

  return (
    <>
      <h1 className="mn-page-title">Wallet</h1>
      <p className="mn-page-sub">Your Monana wallet balance and transactions</p>
    </>
  );
}
