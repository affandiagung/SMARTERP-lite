import ErpWorkspace from "@/components/erp-workspace";
import { getCurrentUser } from "@/lib/auth";
import { getErpData } from "@/lib/erp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, user] = await Promise.all([getErpData(), getCurrentUser()]);

  return <ErpWorkspace initialData={data} initialUser={user} />;
}
