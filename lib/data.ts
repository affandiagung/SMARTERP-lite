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
  status: "Draft" | "Ordered" | "Partially Received" | "Received";
  orderDate: string;
  expectedDate: string;
  lines: Array<{ productId: string; quantity: number; unitCost: number; received: number }>;
};

export type Sale = {
  id: string;
  customer: string;
  date: string;
  status: "Confirmed" | "Packed" | "Shipped";
  lines: Array<{ productId: string; quantity: number; unitPrice: number }>;
};

export type StockMovement = {
  id: string;
  date: string;
  productId: string;
  type: "Opening" | "Purchase Receipt" | "Sales Shipment" | "Adjustment";
  reference: string;
  quantity: number;
};

export const products: Product[] = [
  { id: "p-001", sku: "RAW-CBL-01", name: "Copper Cable 25m", category: "Raw Material", unit: "roll", reorderLevel: 35, cost: 42, price: 67 },
  { id: "p-002", sku: "ELC-SEN-02", name: "Smart Motion Sensor", category: "Electronics", unit: "pcs", reorderLevel: 80, cost: 11, price: 19 },
  { id: "p-003", sku: "PKG-BOX-03", name: "Export Carton Box", category: "Packaging", unit: "pcs", reorderLevel: 220, cost: 1.4, price: 2.1 },
  { id: "p-004", sku: "FIN-HUB-04", name: "IoT Control Hub", category: "Finished Goods", unit: "pcs", reorderLevel: 45, cost: 72, price: 129 },
  { id: "p-005", sku: "SPP-BAT-05", name: "Backup Battery Pack", category: "Spare Parts", unit: "pcs", reorderLevel: 60, cost: 18, price: 31 }
];

export const suppliers: Supplier[] = [
  { id: "s-001", name: "Gulf Components LLC", contact: "Mina Farouk", email: "mina@gulfcomponents.example", paymentTerms: "Net 30", reliability: 96 },
  { id: "s-002", name: "Al Noor Industrial Supply", contact: "Rashid Khan", email: "rashid@alnoor.example", paymentTerms: "Net 15", reliability: 91 },
  { id: "s-003", name: "Metro Packaging FZCO", contact: "Dina Malik", email: "dina@metropack.example", paymentTerms: "Due on receipt", reliability: 88 }
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-2026-0712",
    supplierId: "s-001",
    status: "Partially Received",
    orderDate: "2026-07-12",
    expectedDate: "2026-07-18",
    lines: [
      { productId: "p-002", quantity: 180, unitCost: 11, received: 120 },
      { productId: "p-005", quantity: 90, unitCost: 18, received: 30 }
    ]
  },
  {
    id: "PO-2026-0709",
    supplierId: "s-003",
    status: "Received",
    orderDate: "2026-07-09",
    expectedDate: "2026-07-13",
    lines: [{ productId: "p-003", quantity: 500, unitCost: 1.4, received: 500 }]
  },
  {
    id: "PO-2026-0714",
    supplierId: "s-002",
    status: "Ordered",
    orderDate: "2026-07-14",
    expectedDate: "2026-07-21",
    lines: [
      { productId: "p-001", quantity: 75, unitCost: 42, received: 0 },
      { productId: "p-004", quantity: 40, unitCost: 72, received: 0 }
    ]
  }
];

export const sales: Sale[] = [
  {
    id: "SO-2026-1031",
    customer: "Bright Facilities UAE",
    date: "2026-07-13",
    status: "Shipped",
    lines: [{ productId: "p-004", quantity: 18, unitPrice: 129 }]
  },
  {
    id: "SO-2026-1032",
    customer: "Nexa Retail Systems",
    date: "2026-07-14",
    status: "Packed",
    lines: [
      { productId: "p-002", quantity: 52, unitPrice: 19 },
      { productId: "p-005", quantity: 24, unitPrice: 31 }
    ]
  },
  {
    id: "SO-2026-1033",
    customer: "Desert Line Contracting",
    date: "2026-07-14",
    status: "Confirmed",
    lines: [{ productId: "p-001", quantity: 20, unitPrice: 67 }]
  }
];

export const movements: StockMovement[] = [
  { id: "m-001", date: "2026-07-01", productId: "p-001", type: "Opening", reference: "Opening Balance", quantity: 52 },
  { id: "m-002", date: "2026-07-01", productId: "p-002", type: "Opening", reference: "Opening Balance", quantity: 105 },
  { id: "m-003", date: "2026-07-01", productId: "p-003", type: "Opening", reference: "Opening Balance", quantity: 340 },
  { id: "m-004", date: "2026-07-01", productId: "p-004", type: "Opening", reference: "Opening Balance", quantity: 64 },
  { id: "m-005", date: "2026-07-01", productId: "p-005", type: "Opening", reference: "Opening Balance", quantity: 58 },
  { id: "m-006", date: "2026-07-13", productId: "p-003", type: "Purchase Receipt", reference: "GRN-2026-0709", quantity: 500 },
  { id: "m-007", date: "2026-07-13", productId: "p-004", type: "Sales Shipment", reference: "SO-2026-1031", quantity: -18 },
  { id: "m-008", date: "2026-07-14", productId: "p-002", type: "Purchase Receipt", reference: "GRN-2026-0712-A", quantity: 120 },
  { id: "m-009", date: "2026-07-14", productId: "p-005", type: "Purchase Receipt", reference: "GRN-2026-0712-A", quantity: 30 },
  { id: "m-010", date: "2026-07-14", productId: "p-002", type: "Sales Shipment", reference: "SO-2026-1032", quantity: -52 },
  { id: "m-011", date: "2026-07-14", productId: "p-005", type: "Sales Shipment", reference: "SO-2026-1032", quantity: -24 }
];

export function stockFor(productId: string) {
  return movements.filter((movement) => movement.productId === productId).reduce((total, movement) => total + movement.quantity, 0);
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function productName(productId: string) {
  return products.find((product) => product.id === productId)?.name ?? "Unknown product";
}

export function supplierName(supplierId: string) {
  return suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "Unknown supplier";
}
