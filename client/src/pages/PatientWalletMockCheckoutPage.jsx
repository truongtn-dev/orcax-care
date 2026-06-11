import { useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import WalletMockCheckout from "../components/wallet/WalletMockCheckout.jsx";

export default function PatientWalletMockCheckoutPage() {
  const [searchParams] = useSearchParams();
  return (
    <PageLayout>
      <WalletMockCheckout provider="payos" reference={searchParams.get("orderCode")} />
    </PageLayout>
  );
}
