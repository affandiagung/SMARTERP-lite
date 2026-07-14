"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Factory,
  FileText,
  LogOut,
  Menu,
  PackageCheck,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  X,
  UserRound
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createProduct, createPurchaseOrder, createSalesOrder, createStockReceipt, createSupplier, login, logout, updateProductReorderLevel, updateSalesOrderStatus } from "@/app/actions";
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
  const [purchaseOrders, setPurchaseOrders] = useState(initialData.purchaseOrders);
  const [sales, setSales] = useState(initialData.sales);
  const [movements, setMovements] = useState(initialData.movements);
  const [message, setMessage] = useState("Use the demo credentials to enter the ERP workspace.");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        const valuation = valuationFor(product.id, movements);
        const stock = valuation.stock;
        return {
          ...product,
          stock,
          value: valuation.value,
          averageCost: valuation.averageCost,
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
          <Header route={route} isAdmin={isAdmin} handleLogout={handleLogout} isLoggingOut={isLoggingOut} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          {mobileMenuOpen && <MobileNav visibleNav={visibleNav} route={route} setRoute={setRoute} setMobileMenuOpen={setMobileMenuOpen} session={session} handleLogout={handleLogout} isLoggingOut={isLoggingOut} />}
          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {!isAdmin && <ReadOnlyNotice />}
            {route === "dashboard" && <Dashboard inventoryRows={inventoryRows} totals={totals} suppliers={suppliers} />}
            {isAdmin && route === "products" && <ProductsAdmin products={products} setProducts={setProducts} inventoryRows={inventoryRows} />}
            {isAdmin && route === "suppliers" && <SuppliersAdmin suppliers={suppliers} setSuppliers={setSuppliers} />}
            {isAdmin && route === "purchase" && <PurchaseAdmin purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} suppliers={suppliers} products={products} />}
            {isAdmin && route === "receipts" && <ReceiptsAdmin movements={movements} setMovements={setMovements} products={products} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} />}
            {isAdmin && route === "sales" && <SalesAdmin inventoryRows={inventoryRows} sales={sales} setSales={setSales} products={products} setMovements={setMovements} movements={movements} />}
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("category");

  const categories = ["all", ...Array.from(new Set(inventoryRows.map((row) => row.category)))];
  const visibleRows = inventoryRows
    .filter((row) => categoryFilter === "all" || row.category === categoryFilter)
    .filter((row) => statusFilter === "all" || row.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "value") return b.value - a.value;
      if (sortBy === "status") return statusRank(a.status) - statusRank(b.status);
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    });

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
    <AdminSection title="Product Management" subtitle="Master data for SKUs. Stock is not typed here; stock changes are posted through Goods Receipt and Sales.">
      <InfoStrip title="How product status and value work" text="Status is calculated automatically from stock compared with reorder level. Inventory Value uses weighted average cost from stock movements, so different receipt prices are handled correctly." />
      <FormGrid>
        <Input label="SKU" value={draft.sku} onChange={(value) => setDraft({ ...draft, sku: value })} />
        <Input label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <Input label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
        <Input label="Unit" value={draft.unit} onChange={(value) => setDraft({ ...draft, unit: value })} />
        <Input label="Reorder level" value={String(draft.reorderLevel)} onChange={(value) => setDraft({ ...draft, reorderLevel: Number(value) || 0 })} />
        <Input label="Cost" value={String(draft.cost)} onChange={(value) => setDraft({ ...draft, cost: Number(value) || 0 })} />
      </FormGrid>
      <button className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} onClick={addProduct} type="button"><Plus size={17} /> {isPending ? "Saving..." : "Add product"}</button>
      {error && <p className="mt-3 rounded bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}
      <div className="mt-6 grid gap-3 rounded border border-ink/10 bg-paper p-4 md:grid-cols-3">
        <Select label="Filter category" value={categoryFilter} options={categories.map((category) => ({ label: category === "all" ? "All categories" : category, value: category }))} onChange={setCategoryFilter} />
        <Select label="Filter status" value={statusFilter} options={["all", "Reorder", "Watch", "Healthy"].map((status) => ({ label: status === "all" ? "All statuses" : status, value: status }))} onChange={setStatusFilter} />
        <Select label="Sort by" value={sortBy} options={[{ label: "Category", value: "category" }, { label: "Inventory value", value: "value" }, { label: "Status priority", value: "status" }]} onChange={setSortBy} />
      </div>
      <div className="mt-6"><InventoryTable inventoryRows={visibleRows} editableReorder products={products} setProducts={setProducts} /></div>
    </AdminSection>
  );
}

function SuppliersAdmin({ suppliers, setSuppliers }: { suppliers: Supplier[]; setSuppliers: (suppliers: Supplier[]) => void }) {
  const [draft, setDraft] = useState({ name: "Prime Logistics FZCO", contact: "Layla Noor", email: "layla@prime.example", paymentTerms: "Standard", reliability: 90 });
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
    <AdminSection title="Supplier Management" subtitle="Maintain supplier contacts used when creating purchase orders.">
      <FormGrid>
        <Input label="Supplier" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <Input label="Contact" value={draft.contact} onChange={(value) => setDraft({ ...draft, contact: value })} />
        <Input label="Email" value={draft.email} onChange={(value) => setDraft({ ...draft, email: value })} />
      </FormGrid>
      <button className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} onClick={addSupplier} type="button"><Plus size={17} /> {isPending ? "Saving..." : "Add supplier"}</button>
      {error && <p className="mt-3 rounded bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}
      <div className="mt-6"><SupplierPanel suppliers={suppliers} /></div>
    </AdminSection>
  );
}

function PurchaseAdmin({ purchaseOrders, setPurchaseOrders, suppliers, products }: { purchaseOrders: ErpData["purchaseOrders"]; setPurchaseOrders: (purchaseOrders: ErpData["purchaseOrders"]) => void; suppliers: Supplier[]; products: Product[] }) {
  const minExpectedDate = tomorrowDate();
  const [draft, setDraft] = useState({ id: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, supplierId: suppliers[0]?.id ?? "", productId: products[0]?.id ?? "", quantity: 10, unitCost: products[0]?.cost ?? 0, expectedDate: minExpectedDate });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedPo, setSelectedPo] = useState<ErpData["purchaseOrders"][number] | null>(null);

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        const po = await createPurchaseOrder(draft);
        setPurchaseOrders([po, ...purchaseOrders]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create purchase order.");
      }
    });
  }

  return <AdminSection title="Purchase Orders" subtitle="Create purchase orders for items that need replenishment. Expected date must be at least tomorrow."><FormGrid><Input label="PO number" value={draft.id} onChange={(value) => setDraft({ ...draft, id: value })} /><Select label="Supplier" value={draft.supplierId} options={suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))} onChange={(value) => setDraft({ ...draft, supplierId: value })} /><Select label="Product" value={draft.productId} options={products.map((product) => ({ label: `${product.sku} - ${product.name}`, value: product.id }))} onChange={(value) => setDraft({ ...draft, productId: value, unitCost: products.find((product) => product.id === value)?.cost ?? draft.unitCost })} /><Input label="Quantity" value={String(draft.quantity)} onChange={(value) => setDraft({ ...draft, quantity: Number(value) || 0 })} /><Input label="Unit cost" value={String(draft.unitCost)} onChange={(value) => setDraft({ ...draft, unitCost: Number(value) || 0 })} /><Input label="Expected date" type="date" min={minExpectedDate} value={draft.expectedDate} onChange={(value) => setDraft({ ...draft, expectedDate: value })} /></FormGrid><button className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} onClick={submit} type="button"><Plus size={17} /> {isPending ? "Saving..." : "Create PO"}</button>{error && <p className="mt-3 rounded bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}<div className="mt-6"><PurchaseOrderTable purchaseOrders={purchaseOrders} suppliers={suppliers} onSelect={setSelectedPo} /></div>{selectedPo && <PurchaseOrderModal po={selectedPo} suppliers={suppliers} products={products} onClose={() => setSelectedPo(null)} />}</AdminSection>;
}

function ReceiptsAdmin({ movements, setMovements, products, purchaseOrders, setPurchaseOrders }: { movements: StockMovement[]; setMovements: (movements: StockMovement[]) => void; products: Product[]; purchaseOrders: ErpData["purchaseOrders"]; setPurchaseOrders: (purchaseOrders: ErpData["purchaseOrders"]) => void }) {
  const openLines = purchaseOrders.flatMap((po) => po.lines.filter((line) => line.received < line.quantity).map((line) => ({ po, line })));
  const [selectedLineKey, setSelectedLineKey] = useState(openLines[0] ? `${openLines[0].po.id}|${openLines[0].line.id}` : "");
  const selected = openLines.find((item) => `${item.po.id}|${item.line.id}` === selectedLineKey);
  const remaining = selected ? selected.line.quantity - selected.line.received : 0;
  const [draft, setDraft] = useState({ quantity: Math.min(10, remaining || 10) });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<StockMovement | null>(null);

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        if (!selected) throw new Error("Select an open purchase order line first.");
        const result = await createStockReceipt({ purchaseOrderId: selected.po.id, lineId: selected.line.id, quantity: draft.quantity });
        setMovements([result.movement, ...movements]);
        setPurchaseOrders(purchaseOrders.map((po) => (po.id === result.purchaseOrder.id ? result.purchaseOrder : po)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to receive goods.");
      }
    });
  }

  return <AdminSection title="Goods Receipt" subtitle="Receive against an open PO. Unit cost follows the PO line and cannot be changed here."><FormGrid><Select label="Open PO line" value={selectedLineKey} options={openLines.map(({ po, line }) => ({ label: `${po.id} - ${productName(line.productId, products)} (${line.quantity - line.received} remaining @ ${money(line.unitCost)})`, value: `${po.id}|${line.id}` }))} onChange={(value) => { setSelectedLineKey(value); const item = openLines.find((line) => `${line.po.id}|${line.line.id}` === value); setDraft({ quantity: Math.min(10, item ? item.line.quantity - item.line.received : 10) }); }} /><Input label="Quantity received" value={String(draft.quantity)} onChange={(value) => setDraft({ quantity: Number(value) || 0 })} /><ReadOnlyField label="PO unit cost" value={selected ? money(selected.line.unitCost) : "-"} /></FormGrid><button className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending || !selected || remaining <= 0} onClick={submit} type="button"><PackageCheck size={17} /> {isPending ? "Posting..." : "Post receipt"}</button>{error && <p className="mt-3 rounded bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}<div className="mt-6"><ReceiptTable movements={movements.filter((movement) => movement.type === "Purchase Receipt")} products={products} onSelect={setSelectedReceipt} /></div>{selectedReceipt && <ReceiptModal receipt={selectedReceipt} products={products} onClose={() => setSelectedReceipt(null)} />}</AdminSection>;
}

function SalesAdmin({ inventoryRows, sales, setSales, products, movements, setMovements }: { inventoryRows: InventoryRow[]; sales: ErpData["sales"]; setSales: (sales: ErpData["sales"]) => void; products: Product[]; movements: StockMovement[]; setMovements: (movements: StockMovement[]) => void }) {
  const [draft, setDraft] = useState({ id: `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, customer: "New Customer", productId: products[0]?.id ?? "", quantity: 1, unitPrice: products[0]?.price ?? 0 });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        const sale = await createSalesOrder(draft);
        setSales([sale, ...sales]);
        const valuation = valuationFor(draft.productId, movements);
        setMovements([{ id: `local-${sale.id}`, date: sale.date, productId: draft.productId, type: "Sales Shipment", reference: sale.id, quantity: -draft.quantity, unitCost: valuation.averageCost }, ...movements]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create sales order.");
      }
    });
  }

  function advanceStatus(sale: ErpData["sales"][number]) {
    const nextStatus = sale.status === "Confirmed" ? "Packed" : sale.status === "Packed" ? "Shipped" : null;
    if (!nextStatus) return;

    startTransition(async () => {
      try {
        const updated = await updateSalesOrderStatus({ id: sale.id, status: nextStatus });
        setSales(sales.map((item) => (item.id === updated.id ? updated : item)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update sales status.");
      }
    });
  }

  return <AdminSection title="Sales Orders" subtitle="Unit price defaults from product selling price. Status can only move forward: Confirmed, Packed, then Shipped."><FormGrid><Input label="SO number" value={draft.id} onChange={(value) => setDraft({ ...draft, id: value })} /><Input label="Customer" value={draft.customer} onChange={(value) => setDraft({ ...draft, customer: value })} /><Select label="Product" value={draft.productId} options={products.map((product) => ({ label: `${product.sku} - ${product.name}`, value: product.id }))} onChange={(value) => setDraft({ ...draft, productId: value, unitPrice: products.find((product) => product.id === value)?.price ?? draft.unitPrice })} /><Input label="Quantity" value={String(draft.quantity)} onChange={(value) => setDraft({ ...draft, quantity: Number(value) || 0 })} /><Input label="Unit price" value={String(draft.unitPrice)} onChange={(value) => setDraft({ ...draft, unitPrice: Number(value) || 0 })} /></FormGrid><button className="mt-4 inline-flex h-10 items-center gap-2 rounded bg-moss px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} onClick={submit} type="button"><ShoppingCart size={17} /> {isPending ? "Saving..." : "Create sale"}</button>{error && <p className="mt-3 rounded bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}<div className="mt-6"><SalesOrderTable sales={sales} onAdvance={advanceStatus} /></div><div className="mt-6"><InventoryTable inventoryRows={inventoryRows} /></div></AdminSection>;
}

function Reports({ inventoryRows, totals, movements, products }: { inventoryRows: InventoryRow[]; totals: Totals; movements: StockMovement[]; products: Product[] }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3"><Metric title="Inventory report" value={money(totals.inventoryValue)} detail="Current valuation" icon={FileText} /><Metric title="Purchase report" value={money(totals.openPoValue)} detail="Open commitments" icon={ClipboardList} /><Metric title="Sales report" value={money(totals.monthlyRevenue)} detail="Month to date" icon={ShoppingCart} /></section>
      <section className="grid gap-6 xl:grid-cols-2"><InventoryTable inventoryRows={inventoryRows} /><MovementsTable movements={movements} products={products} /></section>
    </>
  );
}

type InventoryRow = Product & { stock: number; value: number; averageCost: number; status: string };
type Totals = { monthlyRevenue: number; inventoryValue: number; openPoValue: number; lowStockCount: number };

function Header({ route, isAdmin, handleLogout, isLoggingOut, mobileMenuOpen, setMobileMenuOpen }: { route: RouteKey; isAdmin: boolean; handleLogout: () => void; isLoggingOut: boolean; mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void }) {
  const title = navItems.find((item) => item.key === route)?.label ?? "Dashboard";
  return (
    <header className="border-b border-ink/10 bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wider text-clay">{isAdmin ? "Admin workspace" : "Viewer workspace"}</p><h2 className="mt-1 text-3xl font-bold tracking-normal sm:text-4xl">{title}</h2></div><button className="inline-grid h-11 w-11 shrink-0 place-items-center rounded border border-ink/15 bg-paper lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} type="button" aria-label="Open menu">{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="relative block min-w-0 sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} /><input className="h-11 w-full rounded border border-ink/15 bg-paper pl-10 pr-3 text-sm outline-none focus:border-moss" placeholder="Search SKU, PO, supplier" /></label><button className="hidden h-11 items-center justify-center gap-2 rounded border border-ink/15 bg-white px-4 text-sm font-semibold hover:bg-ink/5 disabled:opacity-60 sm:inline-flex lg:hidden" disabled={isLoggingOut} onClick={handleLogout} type="button"><LogOut size={18} /> {isLoggingOut ? "Signing out..." : "Sign out"}</button></div>
      </div>
    </header>
  );
}

function MobileNav({ visibleNav, route, setRoute, setMobileMenuOpen, session, handleLogout, isLoggingOut }: { visibleNav: typeof navItems; route: RouteKey; setRoute: (route: RouteKey) => void; setMobileMenuOpen: (open: boolean) => void; session: SessionUser; handleLogout: () => void; isLoggingOut: boolean }) {
  return <div className="border-b border-ink/10 bg-white px-4 py-3 lg:hidden"><div className="grid gap-2 sm:grid-cols-2">{visibleNav.map((item) => <button className={`flex h-11 items-center gap-3 rounded px-3 text-left text-sm font-semibold ${route === item.key ? "bg-wheat text-ink" : "bg-paper text-ink/70"}`} key={item.key} onClick={() => { setRoute(item.key); setMobileMenuOpen(false); }} type="button"><item.icon size={18} />{item.label}</button>)}</div><div className="mt-3 flex flex-col gap-2 rounded border border-ink/10 bg-paper p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{session.name}</p><p className="text-xs capitalize text-ink/60">{session.role} access</p></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded border border-ink/15 bg-white px-3 text-sm font-semibold disabled:opacity-60" disabled={isLoggingOut} onClick={handleLogout} type="button"><LogOut size={17} />{isLoggingOut ? "Signing out..." : "Sign out"}</button></div></div>;
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

function InventoryTable({ inventoryRows, editableReorder = false, products, setProducts }: { inventoryRows: InventoryRow[]; editableReorder?: boolean; products?: Product[]; setProducts?: (products: Product[]) => void }) {
  return <TableShell title="Inventory Control" subtitle="Inventory Value uses weighted average cost from stock movements."><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3 text-right">Stock</th><th className="px-5 py-3 text-right">Reorder level</th><th className="px-5 py-3 text-right">Avg cost</th><th className="px-5 py-3 text-right">Inventory value</th><th className="px-5 py-3">Status</th>{editableReorder && <th className="px-5 py-3 text-right">Action</th>}</tr></thead><tbody className="divide-y divide-ink/10">{inventoryRows.map((row) => <InventoryRowItem key={row.id} row={row} editableReorder={editableReorder} products={products} setProducts={setProducts} />)}</tbody></table></TableShell>;
}

function InventoryRowItem({ row, editableReorder, products, setProducts }: { row: InventoryRow; editableReorder: boolean; products?: Product[]; setProducts?: (products: Product[]) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [reorderLevel, setReorderLevel] = useState(String(row.reorderLevel));
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const updated = await updateProductReorderLevel({ productId: row.id, reorderLevel: Number(reorderLevel) || 0 });
      if (products && setProducts) {
        setProducts(products.map((product) => (product.id === updated.id ? updated : product)));
      }
      setIsEditing(false);
    });
  }

  return <tr className="hover:bg-paper/70"><td className="px-5 py-4 font-mono text-xs text-ink/70">{row.sku}</td><td className="px-5 py-4 font-semibold">{row.name}</td><td className="px-5 py-4 text-ink/65">{row.category}</td><td className="px-5 py-4 text-right font-semibold">{row.stock}</td><td className="px-5 py-4 text-right text-ink/65">{isEditing ? <input className="h-9 w-24 rounded border border-ink/15 bg-white px-2 text-right outline-none focus:border-moss" value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} /> : row.reorderLevel}</td><td className="px-5 py-4 text-right">{money(row.averageCost)}</td><td className="px-5 py-4 text-right">{money(row.value)}</td><td className="px-5 py-4"><StatusBadge status={row.status} /></td>{editableReorder && <td className="px-5 py-4 text-right">{isEditing ? <button className="inline-flex h-9 items-center gap-2 rounded bg-moss px-3 text-xs font-semibold text-white disabled:opacity-60" disabled={isPending} onClick={save} type="button"><Save size={14} />{isPending ? "Saving" : "Save"}</button> : <button className="inline-flex h-9 items-center gap-2 rounded border border-ink/15 bg-white px-3 text-xs font-semibold hover:bg-paper" onClick={() => setIsEditing(true)} type="button"><Edit3 size={14} />Edit</button>}</td>}</tr>;
}

function TransactionTable({ title, rows }: { title: string; rows: Array<{ id: string; party: string; date: string; status: string; amount: number }> }) {
  return <TableShell title={title}><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Party</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-ink/10">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-mono text-xs">{row.id}</td><td className="px-5 py-4 font-semibold">{row.party}</td><td className="px-5 py-4 text-ink/65">{row.date}</td><td className="px-5 py-4"><StatusBadge status={row.status} /></td><td className="px-5 py-4 text-right">{money(row.amount)}</td></tr>)}</tbody></table></TableShell>;
}

function PurchaseOrderTable({ purchaseOrders, suppliers, onSelect }: { purchaseOrders: ErpData["purchaseOrders"]; suppliers: Supplier[]; onSelect: (po: ErpData["purchaseOrders"][number]) => void }) {
  return <TableShell title="Purchase Orders" subtitle="Click a PO to view line and receipt progress."><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">PO number</th><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Expected</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-ink/10">{purchaseOrders.map((po) => <tr className="cursor-pointer hover:bg-paper" key={po.id} onClick={() => onSelect(po)}><td className="px-5 py-4 font-mono text-xs">{po.id}</td><td className="px-5 py-4 font-semibold">{supplierName(po.supplierId, suppliers)}</td><td className="px-5 py-4 text-ink/65">{po.orderDate}</td><td className="px-5 py-4 text-ink/65">{po.expectedDate}</td><td className="px-5 py-4"><StatusBadge status={po.status} /></td><td className="px-5 py-4 text-right">{money(po.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0))}</td></tr>)}</tbody></table></TableShell>;
}

function ReceiptTable({ movements, products, onSelect }: { movements: StockMovement[]; products: Product[]; onSelect: (receipt: StockMovement) => void }) {
  return <TableShell title="Goods Receipts" subtitle="Click a receipt to view the posting detail."><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">PO reference</th><th className="px-5 py-3">Product</th><th className="px-5 py-3 text-right">Qty</th><th className="px-5 py-3 text-right">Unit cost</th><th className="px-5 py-3 text-right">Value</th></tr></thead><tbody className="divide-y divide-ink/10">{movements.map((row) => <tr className="cursor-pointer hover:bg-paper" key={row.id} onClick={() => onSelect(row)}><td className="px-5 py-4">{row.date}</td><td className="px-5 py-4 font-mono text-xs">{row.reference}</td><td className="px-5 py-4 font-semibold">{productName(row.productId, products)}</td><td className="px-5 py-4 text-right font-semibold text-moss">{row.quantity}</td><td className="px-5 py-4 text-right">{money(row.unitCost)}</td><td className="px-5 py-4 text-right">{money(row.quantity * row.unitCost)}</td></tr>)}</tbody></table></TableShell>;
}

function SalesOrderTable({ sales, onAdvance }: { sales: ErpData["sales"]; onAdvance: (sale: ErpData["sales"][number]) => void }) {
  return <TableShell title="Sales Orders" subtitle="Advance status in order. Shipped orders are locked."><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">SO number</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-ink/10">{sales.map((sale) => { const next = sale.status === "Confirmed" ? "Mark packed" : sale.status === "Packed" ? "Mark shipped" : "Locked"; return <tr key={sale.id}><td className="px-5 py-4 font-mono text-xs">{sale.id}</td><td className="px-5 py-4 font-semibold">{sale.customer}</td><td className="px-5 py-4 text-ink/65">{sale.date}</td><td className="px-5 py-4"><StatusBadge status={sale.status} /></td><td className="px-5 py-4 text-right">{money(sale.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))}</td><td className="px-5 py-4 text-right"><button className="inline-flex h-9 items-center rounded border border-ink/15 bg-white px-3 text-xs font-semibold disabled:opacity-50" disabled={sale.status === "Shipped"} onClick={() => onAdvance(sale)} type="button">{next}</button></td></tr>; })}</tbody></table></TableShell>;
}

function PurchaseOrderModal({ po, suppliers, products, onClose }: { po: ErpData["purchaseOrders"][number]; suppliers: Supplier[]; products: Product[]; onClose: () => void }) {
  return <Modal title={po.id} onClose={onClose}><div className="grid gap-3 sm:grid-cols-2"><Detail label="Supplier" value={supplierName(po.supplierId, suppliers)} /><Detail label="Created" value={po.orderDate} /><Detail label="Expected" value={po.expectedDate} /><Detail label="Status" value={po.status} /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-right">Ordered</th><th className="px-4 py-3 text-right">Received</th><th className="px-4 py-3 text-right">Remaining</th><th className="px-4 py-3 text-right">Unit cost</th></tr></thead><tbody className="divide-y divide-ink/10">{po.lines.map((line) => <tr key={line.id}><td className="px-4 py-3 font-semibold">{productName(line.productId, products)}</td><td className="px-4 py-3 text-right">{line.quantity}</td><td className="px-4 py-3 text-right">{line.received}</td><td className="px-4 py-3 text-right">{line.quantity - line.received}</td><td className="px-4 py-3 text-right">{money(line.unitCost)}</td></tr>)}</tbody></table></div></Modal>;
}

function ReceiptModal({ receipt, products, onClose }: { receipt: StockMovement; products: Product[]; onClose: () => void }) {
  return <Modal title={receipt.reference} onClose={onClose}><div className="grid gap-3 sm:grid-cols-2"><Detail label="Receipt date" value={receipt.date} /><Detail label="Product" value={productName(receipt.productId, products)} /><Detail label="Quantity received" value={String(receipt.quantity)} /><Detail label="Unit cost from PO" value={money(receipt.unitCost)} /><Detail label="Receipt value" value={money(receipt.quantity * receipt.unitCost)} /><Detail label="Stock movement" value={receipt.id} /></div></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4"><div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded border border-ink/10 bg-white shadow-soft"><div className="flex items-center justify-between gap-3 border-b border-ink/10 p-5"><h3 className="text-xl font-bold">{title}</h3><button className="grid h-9 w-9 place-items-center rounded border border-ink/15 bg-paper" onClick={onClose} type="button"><X size={18} /></button></div><div className="p-5">{children}</div></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-ink/10 bg-paper p-3"><p className="text-xs font-semibold uppercase tracking-wider text-ink/50">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function MovementsTable({ filter, movements, products }: { filter?: string; movements: StockMovement[]; products: Product[] }) {
  const rows = filter ? movements.filter((movement) => movement.type === filter) : movements;
  return <TableShell title="Stock Ledger" subtitle="Every movement carries a unit cost for weighted average valuation."><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Qty</th><th className="px-5 py-3 text-right">Unit cost</th><th className="px-5 py-3 text-right">Movement value</th></tr></thead><tbody className="divide-y divide-ink/10">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4">{row.date}</td><td className="px-5 py-4 font-semibold">{productName(row.productId, products)}</td><td className="px-5 py-4">{row.type}</td><td className="px-5 py-4 font-mono text-xs">{row.reference}</td><td className={`px-5 py-4 text-right font-semibold ${row.quantity < 0 ? "text-clay" : "text-moss"}`}>{row.quantity}</td><td className="px-5 py-4 text-right">{money(row.unitCost)}</td><td className={`px-5 py-4 text-right font-semibold ${row.quantity < 0 ? "text-clay" : "text-moss"}`}>{money(row.quantity * row.unitCost)}</td></tr>)}</tbody></table></TableShell>;
}

function WorkflowPanel() {
  const steps = [{ label: "Create PO", detail: "Supplier, expected date, line items", icon: ClipboardList }, { label: "Receive goods", detail: "Partial receipt allowed per line", icon: Truck }, { label: "Post stock", detail: "Every receipt creates movement", icon: PackageCheck }, { label: "Fulfill sales", detail: "Shipment reduces available stock", icon: CheckCircle2 }];
  return <div className="rounded border border-ink/10 bg-white p-5 shadow-soft"><h3 className="text-lg font-bold">Workflow Integrity</h3><p className="text-sm text-ink/60">The demo models stock as a ledger, so reports can be reconciled.</p><div className="mt-5 space-y-4">{steps.map((step, index) => <div className="flex gap-3" key={step.label}><div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-wheat text-ink"><step.icon size={18} /></div><div className="min-w-0"><p className="font-semibold">{index + 1}. {step.label}</p><p className="text-sm text-ink/60">{step.detail}</p></div></div>)}</div></div>;
}

function SupplierPanel({ suppliers }: { suppliers: Supplier[] }) {
  return <div className="rounded border border-ink/10 bg-white p-5 shadow-soft"><h3 className="text-lg font-bold">Suppliers</h3><div className="mt-4 space-y-3">{suppliers.map((supplier) => <div className="rounded border border-ink/10 p-3" key={supplier.id}><p className="font-semibold">{supplier.name}</p><p className="mt-1 text-sm text-ink/60">{supplier.contact}</p><p className="mt-1 text-sm text-ink/60">{supplier.email}</p></div>)}</div></div>;
}

function InfoStrip({ title, text }: { title: string; text: string }) {
  return <div className="mb-5 rounded border border-moss/20 bg-moss/5 p-4"><p className="text-sm font-bold text-moss">{title}</p><p className="mt-1 text-sm leading-6 text-ink/70">{text}</p></div>;
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

function Input({ label, value, onChange, type = "text", min }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string }) {
  return <label className="block text-sm font-semibold">{label}<input className="mt-2 h-10 w-full rounded border border-ink/15 bg-paper px-3 outline-none focus:border-moss" min={min} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="block text-sm font-semibold">{label}<div className="mt-2 flex h-10 items-center rounded border border-ink/10 bg-ink/5 px-3 text-ink/70">{value}</div></div>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ label: string; value: string }>; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold">{label}<select className="mt-2 h-10 w-full rounded border border-ink/15 bg-paper px-3 outline-none focus:border-moss" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function categoryTotals(inventoryRows: InventoryRow[]) {
  return inventoryRows.reduce<Array<{ category: string; value: number }>>((acc, row) => {
    const existing = acc.find((item) => item.category === row.category);
    if (existing) existing.value += row.value;
    else acc.push({ category: row.category, value: row.value });
    return acc;
  }, []);
}

function valuationFor(productId: string, movements: StockMovement[]) {
  const productMovements = movements.filter((movement) => movement.productId === productId);
  const stock = productMovements.reduce((total, movement) => total + movement.quantity, 0);
  const value = productMovements.reduce((total, movement) => total + movement.quantity * movement.unitCost, 0);

  return {
    stock,
    value,
    averageCost: stock > 0 ? value / stock : 0
  };
}

function productName(productId: string, products: Product[]) {
  return products.find((product) => product.id === productId)?.name ?? "Unknown product";
}

function supplierName(supplierId: string, suppliers: Supplier[]) {
  return suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "Unknown supplier";
}

function statusRank(status: string) {
  if (status === "Reorder") return 1;
  if (status === "Watch") return 2;
  return 3;
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
