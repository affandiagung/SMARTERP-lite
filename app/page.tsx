import ErpWorkspace from "@/components/erp-workspace";
import { getErpData } from "@/lib/erp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getErpData();

  return <ErpWorkspace initialData={data} />;
}
