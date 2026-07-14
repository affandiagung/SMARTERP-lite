import { prisma } from "@/lib/prisma";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  reorderLevel: number;
  cost: number;
  price: number;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  paymentTerms: string;
  reliability: number;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  status: "Draft" | "Ordered" | "Partially Received" | "Received" | "Cancelled";
  orderDate: string;
  expectedDate: string;
  lines: Array<{ id: string; productId: string; quantity: number; unitCost: number; received: number }>;
};

export type Sale = {
  id: string;
  customer: string;
  date: string;
  status: "Confirmed" | "Packed" | "Shipped" | "Cancelled";
  lines: Array<{ productId: string; quantity: number; unitPrice: number }>;
};

export type StockMovement = {
  id: string;
  date: string;
  productId: string;
  type: "Opening" | "Purchase Receipt" | "Sales Shipment" | "Adjustment";
  reference: string;
  quantity: number;
  unitCost: number;
};

export type ErpData = {
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  sales: Sale[];
  movements: StockMovement[];
};

const purchaseStatusLabel = {
  DRAFT: "Draft",
  ORDERED: "Ordered",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled"
} as const;

const salesStatusLabel = {
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  CANCELLED: "Cancelled"
} as const;

const movementTypeLabel = {
  OPENING: "Opening",
  PURCHASE_RECEIPT: "Purchase Receipt",
  SALES_SHIPMENT: "Sales Shipment",
  ADJUSTMENT: "Adjustment"
} as const;

export async function getErpData(): Promise<ErpData> {
  const [products, suppliers, purchaseOrders, sales, movements] = await Promise.all([
    prisma.product.findMany({ orderBy: { sku: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({ include: { lines: true }, orderBy: { expectedDate: "desc" } }),
    prisma.salesOrder.findMany({ include: { lines: true }, orderBy: { date: "desc" } }),
    prisma.stockMovement.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] })
  ]);

  return {
    products: products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      unit: product.unit,
      reorderLevel: product.reorderLevel,
      cost: Number(product.cost),
      price: Number(product.price)
    })),
    suppliers,
    purchaseOrders: purchaseOrders.map((po) => ({
      id: po.id,
      supplierId: po.supplierId,
      status: purchaseStatusLabel[po.status],
      orderDate: po.orderDate.toISOString().slice(0, 10),
      expectedDate: po.expectedDate.toISOString().slice(0, 10),
      lines: po.lines.map((line) => ({ id: line.id, productId: line.productId, quantity: line.quantity, unitCost: Number(line.unitCost), received: line.received }))
    })),
    sales: sales.map((sale) => ({
      id: sale.id,
      customer: sale.customer,
      date: sale.date.toISOString().slice(0, 10),
      status: salesStatusLabel[sale.status],
      lines: sale.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: Number(line.unitPrice) }))
    })),
    movements: movements.map((movement) => ({
      id: movement.id,
      date: movement.date.toISOString().slice(0, 10),
      productId: movement.productId,
      type: movementTypeLabel[movement.type],
      reference: movement.reference,
      quantity: movement.quantity,
      unitCost: Number(movement.unitCost)
    }))
  };
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
