"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileText,
  LogOut,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserRound
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createProduct, createSupplier, login, logout } from "@/app/actions";
import type { SessionUser } from "@/lib/auth";
import { money, type ErpData, type Product, type StockMovement, type Supplier } from "@/lib/erp";

type Role = "admin" | "user";
type RouteKey = "dashboard" | "products" | "suppliers" | "purchase" | "receipts" | "sales" | "reports";

const demoUsers = {
  admin: { email: "admin@smarterp.test", password: "admin123", name: "Aisha Admin", role: "admin" as Role },
  user: { email: "viewer@smarterp.test", password: "viewer123", name: "Omar Viewer", role: "user" as Role }
};

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "products", label: "Products", icon: Boxes },
  { key: "suppliers", label: "Suppliers", icon: Factory },
  { key: "purchase", label: "Purchase", icon: ClipboardList },
  { key: "receipts", label: "Goods Receipt", icon: PackageCheck },
  { key: "sales", label: "Sales", icon: ShoppingCart },
  { key: "reports", label: "Reports", icon: ReceiptText }
] satisfies Array<{ key: RouteKey; label: string; icon: typeof Boxes }>;

const flowData = [
  { day: "Jul 10", receipts: 0, shipments: 16 },
  { day: "Jul 11", receipts: 45, shipments: 22 },
  { day: "Jul 12", receipts: 0, shipments: 18 },
  { day: "Jul 13", receipts: 500, shipments: 18 },
  { day: "Jul 14", receipts: 150, shipments: 76 }
];

export default function ErpWorkspace({ initialData, initialUser }: { initialData: ErpData; initialUser: SessionUser | null }) {
  const [session, setSession] = useState<SessionUser | null>(initialUser);
  const [loginMode, setLoginMode] = useState<Role>("admin");
  const [route, setRoute] = useState<RouteKey>("dashboard");
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialData.suppliers);
  const [purchaseOrders] = useState(initialData.purchaseOrders);
  const [sales] = useState(initialData.sales);
  const [movements] = useState(initialData.movements);
  const [message, setMessage] = useState("Use the demo credentials to enter the ERP workspace.");

  function handleLogout() {
    startLogoutTransition(async () => {
      await logout();
      setSession(null);
      window.location.reload();
    });
  }

  const [isLoggingOut, startLogoutTransition] = useTransition();

  const inventoryRows = useMemo(
    () =>
      products.map((product) => {
        const stock = stockFor(product.id, movements);
        return {
          ...product,
          stock,
          value: stock * product.cost,
          status: stock <= product.reorderLevel ? "Reorder" : stock <= product.reorderLevel * 1.4 ? "Watch" : "Healthy"
        };
      }),
    [products, movements]
  );

  const totals = useMemo(() => {
    const monthlyRevenue = sales.reduce((total, sale) => total + sale.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), 0);
    const inventoryValue = inventoryRows.reduce((total, row) => total + row.value, 0);
    const openPoValue = purchaseOrders
      .filter((po) => po.status !== "Received")
      .reduce((total, po) => total + po.lines.reduce((sum, line) => sum + (line.quantity - line.received) * line.unitCost, 0), 0);
    return { monthlyRevenue, inventoryValue, openPoValue, lowStockCount: inventoryRows.filter((row) => row.status === "Reorder").length };
  }, [inventoryRows]);

  if (!session) {
    return <LoginScreen loginMode={loginMode} setLoginMode={setLoginMode} message={message} setMessage={setMessage} />;
  }

  const isAdmin = session.role === "admin";
  const visibleNav = isAdmin ? navItems : navItems.filter((item) => ["dashboard", "reports"].includes(item.key));

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-ink/10 bg-white px-5 py-6 lg:block">
          <Brand />
          <nav className="mt-8 space-y-1">
            {visibleNav.map((item) => (
              <button
                className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-medium ${route === item.key ? "bg-wheat text-ink" : "text-ink/65 hover:bg-ink/5"}`}
                key={item.key}
                onClick={() => setRoute(item.key)}
                type="button"
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded border border-ink/10 bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Signed in as</p>
            <p className="mt-2 font-semibold">{session.name}</p>
            <p className="text-sm capitalize text-ink/60">{session.role} access</p>
            <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-ink/15 bg-white text-sm font-semibold hover:bg-ink/5 disabled:opacity-60" disabled={isLoggingOut} onClick={handleLogout} type="button">
              <LogOut size={17} />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <Header route={route} isAdmin={isAdmin} handleLogout={handleLogout} isLoggingOut={isLoggingOut} />
          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {!isAdmin && <ReadOnlyNotice />}
            {route === "dashboard" && <Dashboard inventoryRows={inventoryRows} totals={totals} suppliers={suppliers} />}
            {isAdmin && route === "products" && <ProductsAdmin products={products} setProducts={setProducts} inventoryRows={inventoryRows} />}
            {isAdmin && route === "suppliers" && <SuppliersAdmin suppliers={suppliers} setSuppliers={setSuppliers} />}
            {isAdmin && route === "purchase" && <PurchaseAdmin purchaseOrders={purchaseOrders} suppliers={suppliers} />}
            {isAdmin && route === "receipts" && <ReceiptsAdmin movements={movements} products={products} />}
            {isAdmin && route === "sales" && <SalesAdmin inventoryRows={inventoryRows} sales={sales} />}
            {route === "reports" && <Reports inventoryRows={inventoryRows} totals={totals} movements={movements} products={products} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginScreen({ loginMode, setLoginMode, message, setMessage }: { loginMode: Role; setLoginMode: (role: Role) => void; message: string; setMessage: (message: string) => void }) {
  const activeUser = demoUsers[loginMode];
  const [email, setEmail] = useState(activeUser.email);
  const [password, setPassword] = useState(activeUser.password);
  const [isPending, startTransition] = useTransition();

  function switchRole(role: Role) {
    setLoginMode(role);
    setEmail(demoUsers[role].email);
    setPassword(demoUsers[role].password);
    setMessage(role === "admin" ? "Admin can manage master data and transactions." : "Viewer can only see dashboards and reports.");
  }

  function submit() {
    setMessage("Signing in with Supabase Auth...");
    startTransition(async () => {
      try {
        await login({ email, password });
        window.location.reload();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Login failed.");
      }
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-8 text-ink">
      <section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col justify-center rounded border border-ink/10 bg-white p-8 shadow-soft">
          <Brand />
          <h1 className="mt-10 text-4xl font-bold tracking-normal sm:text-5xl">Procurement and inventory ERP demo.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/65">A portfolio SaaS-style workspace showing role-based access, product and supplier management, purchase orders, goods receipt, stock ledger reporting, and sales visibility.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <DemoCredential title="Admin" email={demoUsers.admin.email} password={demoUsers.admin.password} />
            <DemoCredential title="Viewer" email={demoUsers.user.email} password={demoUsers.user.password} />
          </div>
        </div>
        <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
          <div className="flex rounded bg-paper p-1">
            <button className={`h-10 flex-1 rounded text-sm font-semibold ${loginMode === "admin" ? "bg-white shadow" : "text-ink/60"}`} onClick={() => switchRole("admin")} type="button">Admin</button>
            <button className={`h-10 flex-1 rounded text-sm font-semibold ${loginMode === "user" ? "bg-white shadow" : "text-ink/60"}`} onClick={() => switchRole("user")} type="button">Viewer</button>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">Email
              <input className="mt-2 h-11 w-full rounded border border-ink/15 bg-paper px-3 outline-none focus:border-moss" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-sm font-semibold">Password
              <input className="mt-2 h-11 w-full rounded border border-ink/15 bg-paper px-3 outline-none focus:border-moss" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <p className="rounded bg-wheat px-3 py-2 text-sm text-ink/70">{message}</p>
            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white hover:bg-fern disabled:opacity-60" disabled={isPending} onClick={submit} type="button">
              <ShieldCheck size={18} />
              {isPending ? "Signing in..." : "Sign in with Supabase"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ inventoryRows, totals, suppliers }: { inventoryRows: InventoryRow[]; totals: Totals; suppliers: Supplier[] }) {
  const categoryData = categoryTotals(inventoryRows);
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Inventory value" value={money(totals.inventoryValue)} detail="Calculated from stock movements" icon={Boxes} />
        <Metric title="Open PO exposure" value={money(totals.openPoValue)} detail="Ordered but not received" icon={ClipboardList} />
        <Metric title="July sales" value={money(totals.monthlyRevenue)} detail="Confirmed sales orders" icon={ShoppingCart} />
        <Metric title="Reorder alerts" value={String(totals.lowStockCount)} detail="Below configured threshold" icon={AlertTriangle} tone="warning" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <ChartPanel title="Stock Movement Flow" subtitle="Receipts and shipments over the last five operating days.">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowData} margin={{ left: -24, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="#e8dfca" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#6d766f" fontSize={12} />
              <YAxis stroke="#6d766f" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="receipts" stroke="#5c8a45" fill="#dcebcf" strokeWidth={2} />
              <Area type="monotone" dataKey="shipments" stroke="#b65f35" fill="#f0d7c8" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Inventory Value by Category" subtitle="Useful for working capital review.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 8 }}>
              <CartesianGrid stroke="#e8dfca" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#6d766f" fontSize={12} />
              <YAxis dataKey="category" type="category" width={98} stroke="#6d766f" fontSize={12} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Bar dataKey="value" fill="#355e3b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <InventoryTable inventoryRows={inventoryRows} />
        <div className="space-y-6"><WorkflowPanel /><SupplierPanel suppliers={suppliers} /></div>
      </section>
    </>
  );
}

function ProductsAdmin({ products, setProducts, inventoryRows }: { products: Product[]; setProducts: (products: Product[]) => void; inventoryRows: InventoryRow[] }) {
  const [draft, setDraft] = useState({ sku: "NEW-SKU-06", name: "Warehouse Scanner", category: "Equipment", unit: "pcs", reorderLevel: 12, cost: 88, price: 145 });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function addProduct() {
    setError("");
    startTransition(async () => {
      try {
        const product = await createProduct(draft);
        setProducts([...products, product]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create product.");
      }
    });
  }
  return (
    <AdminSection title="Product Management" subtitle="CRUD-style master data area for SKUs, pricing, units, and reorder levels.">
      <FormGrid>
        <Input label="SKU" value={draft.sku} onChange={(value) => setDraft({ ...draft, sku: value })} />
        <Input label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <Input label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
        <Input label="Unit" value={draft.unit} onChange={(value) => setDraft({ ...draft, unit: value })} />
        <Input label="Reorder" value={String(draft.reorderLevel)} onChange={(value) => setDraft({ ...draft, reorderLevel: Number(value) || 0 })} />
        <Input label="Cost" value={String(draft.cost)} onChange={(value) => setDraft({ ...draft, cost: Number(value) || 0 })} />
      </FormGrid>
      <button className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} onClick={addProduct} type="button"><Plus size={17} /> {isPending ? "Saving..." : "Add product"}</button>
      {error && <p className="mt-3 rounded bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}
      <div className="mt-6"><InventoryTable inventoryRows={inventoryRows} /></div>
    </AdminSection>
  );
}

function SuppliersAdmin({ suppliers, setSuppliers }: { suppliers: Supplier[]; setSuppliers: (suppliers: Supplier[]) => void }) {
  const [draft, setDraft] = useState({ name: "Prime Logistics FZCO", contact: "Layla Noor", email: "layla@prime.example", paymentTerms: "Net 30", reliability: 93 });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function addSupplier() {
    setError("");
    startTransition(async () => {
      try {
        const supplier = await createSupplier(draft);
        setSuppliers([...suppliers, supplier]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create supplier.");
      }
    });
  }
  return (
    <AdminSection title="Supplier Management" subtitle="Maintain supplier contacts, terms, and reliability score.">
      <FormGrid>
        <Input label="Supplier" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <Input label="Contact" value={draft.contact} onChange={(value) => setDraft({ ...draft, contact: value })} />
        <Input label="Email" value={draft.email} onChange={(value) => setDraft({ ...draft, email: value })} />
        <Input label="Terms" value={draft.paymentTerms} onChange={(value) => setDraft({ ...draft, paymentTerms: value })} />
      </FormGrid>
      <button className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} onClick={addSupplier} type="button"><Plus size={17} /> {isPending ? "Saving..." : "Add supplier"}</button>
      {error && <p className="mt-3 rounded bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}
      <div className="mt-6"><SupplierPanel suppliers={suppliers} /></div>
    </AdminSection>
  );
}

function PurchaseAdmin({ purchaseOrders, suppliers }: { purchaseOrders: ErpData["purchaseOrders"]; suppliers: Supplier[] }) {
  return <AdminSection title="Purchase Orders" subtitle="Create and monitor supplier purchase orders."><TransactionTable title="Open Purchase Orders" rows={purchaseOrders.map((po) => ({ id: po.id, party: supplierName(po.supplierId, suppliers), date: po.expectedDate, status: po.status, amount: po.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0) }))} /></AdminSection>;
}

function ReceiptsAdmin({ movements, products }: { movements: StockMovement[]; products: Product[] }) {
  return <AdminSection title="Goods Receipt" subtitle="Receiving stock posts positive inventory movements and closes PO quantities."><MovementsTable filter="Purchase Receipt" movements={movements} products={products} /></AdminSection>;
}

function SalesAdmin({ inventoryRows, sales }: { inventoryRows: InventoryRow[]; sales: ErpData["sales"] }) {
  return <AdminSection title="Sales Orders" subtitle="Sales fulfillment validates stock availability and posts outbound movements."><TransactionTable title="Sales Orders" rows={sales.map((sale) => ({ id: sale.id, party: sale.customer, date: sale.date, status: sale.status, amount: sale.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) }))} /><div className="mt-6"><InventoryTable inventoryRows={inventoryRows} /></div></AdminSection>;
}

function Reports({ inventoryRows, totals, movements, products }: { inventoryRows: InventoryRow[]; totals: Totals; movements: StockMovement[]; products: Product[] }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3"><Metric title="Inventory report" value={money(totals.inventoryValue)} detail="Current valuation" icon={FileText} /><Metric title="Purchase report" value={money(totals.openPoValue)} detail="Open commitments" icon={ClipboardList} /><Metric title="Sales report" value={money(totals.monthlyRevenue)} detail="Month to date" icon={ShoppingCart} /></section>
      <section className="grid gap-6 xl:grid-cols-2"><InventoryTable inventoryRows={inventoryRows} /><MovementsTable movements={movements} products={products} /></section>
    </>
  );
}

type InventoryRow = Product & { stock: number; value: number; status: string };
type Totals = { monthlyRevenue: number; inventoryValue: number; openPoValue: number; lowStockCount: number };

function Header({ route, isAdmin, handleLogout, isLoggingOut }: { route: RouteKey; isAdmin: boolean; handleLogout: () => void; isLoggingOut: boolean }) {
  const title = navItems.find((item) => item.key === route)?.label ?? "Dashboard";
  return (
    <header className="border-b border-ink/10 bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-clay">{isAdmin ? "Admin workspace" : "Viewer workspace"}</p><h2 className="mt-1 text-3xl font-bold tracking-normal sm:text-4xl">{title}</h2></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="relative block min-w-0 sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} /><input className="h-11 w-full rounded border border-ink/15 bg-paper pl-10 pr-3 text-sm outline-none focus:border-moss" placeholder="Search SKU, PO, supplier" /></label><button className="inline-flex h-11 items-center justify-center gap-2 rounded border border-ink/15 bg-white px-4 text-sm font-semibold hover:bg-ink/5 disabled:opacity-60 lg:hidden" disabled={isLoggingOut} onClick={handleLogout} type="button"><LogOut size={18} /> {isLoggingOut ? "Signing out..." : "Sign out"}</button></div>
      </div>
    </header>
  );
}

function Brand() {
  return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded bg-moss text-white"><Boxes size={21} /></div><div><p className="text-sm font-semibold uppercase tracking-wider text-clay">SmartERP</p><h1 className="text-xl font-bold">Lite</h1></div></div>;
}

function DemoCredential({ title, email, password }: { title: string; email: string; password: string }) {
  return <div className="rounded border border-ink/10 bg-paper p-4"><p className="font-semibold">{title}</p><p className="mt-2 font-mono text-xs text-ink/65">{email}</p><p className="mt-1 font-mono text-xs text-ink/65">{password}</p></div>;
}

function ReadOnlyNotice() {
  return <div className="flex items-center gap-3 rounded border border-ink/10 bg-white p-4 text-sm text-ink/70"><UserRound className="text-moss" size={20} /> Viewer role is intentionally read-only. Admin-only modules are hidden from the sidebar.</div>;
}

function Metric({ title, value, detail, icon: Icon, tone = "default" }: { title: string; value: string; detail: string; icon: typeof Boxes; tone?: "default" | "warning" }) {
  return <div className="rounded border border-ink/10 bg-white p-5 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-ink/60">{title}</p><p className="mt-2 text-3xl font-bold tracking-normal">{value}</p></div><div className={`grid h-10 w-10 place-items-center rounded ${tone === "warning" ? "bg-clay/12 text-clay" : "bg-moss/10 text-moss"}`}><Icon size={20} /></div></div><p className="mt-3 text-sm text-ink/55">{detail}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "Healthy" || status === "Received" || status === "Shipped" ? "bg-moss/10 text-moss" : status === "Reorder" ? "bg-clay/12 text-clay" : "bg-wheat text-ink/70";
  return <span className={`inline-flex min-w-20 justify-center rounded px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="rounded border border-ink/10 bg-white p-5 shadow-soft"><h3 className="text-lg font-bold">{title}</h3><p className="text-sm text-ink/60">{subtitle}</p><div className="mt-5 h-72">{children}</div></div>;
}

function InventoryTable({ inventoryRows }: { inventoryRows: InventoryRow[] }) {
  return <TableShell title="Inventory Control" subtitle="Products, stock-on-hand, reorder status, and valuation."><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3 text-right">Stock</th><th className="px-5 py-3 text-right">Reorder</th><th className="px-5 py-3 text-right">Value</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-ink/10">{inventoryRows.map((row) => <tr key={row.id} className="hover:bg-paper/70"><td className="px-5 py-4 font-mono text-xs text-ink/70">{row.sku}</td><td className="px-5 py-4 font-semibold">{row.name}</td><td className="px-5 py-4 text-ink/65">{row.category}</td><td className="px-5 py-4 text-right font-semibold">{row.stock}</td><td className="px-5 py-4 text-right text-ink/65">{row.reorderLevel}</td><td className="px-5 py-4 text-right">{money(row.value)}</td><td className="px-5 py-4"><StatusBadge status={row.status} /></td></tr>)}</tbody></table></TableShell>;
}

function TransactionTable({ title, rows }: { title: string; rows: Array<{ id: string; party: string; date: string; status: string; amount: number }> }) {
  return <TableShell title={title}><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Party</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-ink/10">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-mono text-xs">{row.id}</td><td className="px-5 py-4 font-semibold">{row.party}</td><td className="px-5 py-4 text-ink/65">{row.date}</td><td className="px-5 py-4"><StatusBadge status={row.status} /></td><td className="px-5 py-4 text-right">{money(row.amount)}</td></tr>)}</tbody></table></TableShell>;
}

function MovementsTable({ filter, movements, products }: { filter?: string; movements: StockMovement[]; products: Product[] }) {
  const rows = filter ? movements.filter((movement) => movement.type === filter) : movements;
  return <TableShell title="Stock Ledger" subtitle="Every stock change is auditable by product and reference."><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Qty</th></tr></thead><tbody className="divide-y divide-ink/10">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4">{row.date}</td><td className="px-5 py-4 font-semibold">{productName(row.productId, products)}</td><td className="px-5 py-4">{row.type}</td><td className="px-5 py-4 font-mono text-xs">{row.reference}</td><td className={`px-5 py-4 text-right font-semibold ${row.quantity < 0 ? "text-clay" : "text-moss"}`}>{row.quantity}</td></tr>)}</tbody></table></TableShell>;
}

function WorkflowPanel() {
  const steps = [{ label: "Create PO", detail: "Supplier, expected date, line items", icon: ClipboardList }, { label: "Receive goods", detail: "Partial receipt allowed per line", icon: Truck }, { label: "Post stock", detail: "Every receipt creates movement", icon: PackageCheck }, { label: "Fulfill sales", detail: "Shipment reduces available stock", icon: CheckCircle2 }];
  return <div className="rounded border border-ink/10 bg-white p-5 shadow-soft"><h3 className="text-lg font-bold">Workflow Integrity</h3><p className="text-sm text-ink/60">The demo models stock as a ledger, so reports can be reconciled.</p><div className="mt-5 space-y-4">{steps.map((step, index) => <div className="flex gap-3" key={step.label}><div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-wheat text-ink"><step.icon size={18} /></div><div className="min-w-0"><p className="font-semibold">{index + 1}. {step.label}</p><p className="text-sm text-ink/60">{step.detail}</p></div></div>)}</div></div>;
}

function SupplierPanel({ suppliers }: { suppliers: Supplier[] }) {
  return <div className="rounded border border-ink/10 bg-white p-5 shadow-soft"><h3 className="text-lg font-bold">Supplier Health</h3><div className="mt-4 space-y-3">{suppliers.map((supplier) => <div className="rounded border border-ink/10 p-3" key={supplier.id}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{supplier.name}</p><span className="text-sm font-bold text-moss">{supplier.reliability}%</span></div><p className="mt-1 text-sm text-ink/60">{supplier.contact} · {supplier.paymentTerms}</p></div>)}</div></div>;
}

function AdminSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded border border-ink/10 bg-white p-5 shadow-soft"><h3 className="text-xl font-bold">{title}</h3><p className="mt-1 text-sm text-ink/60">{subtitle}</p><div className="mt-5">{children}</div></section>;
}

function TableShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="rounded border border-ink/10 bg-white shadow-soft"><div className="border-b border-ink/10 p-5"><h3 className="text-lg font-bold">{title}</h3>{subtitle && <p className="text-sm text-ink/60">{subtitle}</p>}</div><div className="overflow-x-auto">{children}</div></div>;
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold">{label}<input className="mt-2 h-10 w-full rounded border border-ink/15 bg-paper px-3 outline-none focus:border-moss" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function categoryTotals(inventoryRows: InventoryRow[]) {
  return inventoryRows.reduce<Array<{ category: string; value: number }>>((acc, row) => {
    const existing = acc.find((item) => item.category === row.category);
    if (existing) existing.value += row.value;
    else acc.push({ category: row.category, value: row.value });
    return acc;
  }, []);
}

function stockFor(productId: string, movements: StockMovement[]) {
  return movements.filter((movement) => movement.productId === productId).reduce((total, movement) => total + movement.quantity, 0);
}

function productName(productId: string, products: Product[]) {
  return products.find((product) => product.id === productId)?.name ?? "Unknown product";
}

function supplierName(supplierId: string, suppliers: Supplier[]) {
  return suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "Unknown supplier";
}
