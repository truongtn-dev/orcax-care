import { useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import WalletMockCheckout from "../components/wallet/WalletMockCheckout.jsx";

export default function PatientWalletSepayMockCheckoutPage() {
  const [searchParams] = useSearchParams();
  return (
    <PageLayout>
      <WalletMockCheckout provider="sepay" reference={searchParams.get("orderId")} />
    </PageLayout>
  );
}
