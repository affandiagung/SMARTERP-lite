const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const products = [
  { id: "p-001", sku: "RAW-CBL-01", name: "Copper Cable 25m", category: "Raw Material", unit: "roll", reorderLevel: 35, cost: 42, price: 67 },
  { id: "p-002", sku: "ELC-SEN-02", name: "Smart Motion Sensor", category: "Electronics", unit: "pcs", reorderLevel: 80, cost: 11, price: 19 },
  { id: "p-003", sku: "PKG-BOX-03", name: "Export Carton Box", category: "Packaging", unit: "pcs", reorderLevel: 220, cost: 1.4, price: 2.1 },
  { id: "p-004", sku: "FIN-HUB-04", name: "IoT Control Hub", category: "Finished Goods", unit: "pcs", reorderLevel: 45, cost: 72, price: 129 },
  { id: "p-005", sku: "SPP-BAT-05", name: "Backup Battery Pack", category: "Spare Parts", unit: "pcs", reorderLevel: 60, cost: 18, price: 31 }
];

const suppliers = [
  { id: "s-001", name: "Gulf Components LLC", contact: "Mina Farouk", email: "mina@gulfcomponents.example", paymentTerms: "Net 30", reliability: 96 },
  { id: "s-002", name: "Al Noor Industrial Supply", contact: "Rashid Khan", email: "rashid@alnoor.example", paymentTerms: "Net 15", reliability: 91 },
  { id: "s-003", name: "Metro Packaging FZCO", contact: "Dina Malik", email: "dina@metropack.example", paymentTerms: "Due on receipt", reliability: 88 }
];

const purchaseOrders = [
  {
    id: "PO-2026-0712",
    supplierId: "s-001",
    status: "PARTIALLY_RECEIVED",
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
    status: "RECEIVED",
    orderDate: "2026-07-09",
    expectedDate: "2026-07-13",
    lines: [{ productId: "p-003", quantity: 500, unitCost: 1.4, received: 500 }]
  },
  {
    id: "PO-2026-0714",
    supplierId: "s-002",
    status: "ORDERED",
    orderDate: "2026-07-14",
    expectedDate: "2026-07-21",
    lines: [
      { productId: "p-001", quantity: 75, unitCost: 42, received: 0 },
      { productId: "p-004", quantity: 40, unitCost: 72, received: 0 }
    ]
  }
];

const salesOrders = [
  { id: "SO-2026-1031", customer: "Bright Facilities UAE", date: "2026-07-13", status: "SHIPPED", lines: [{ productId: "p-004", quantity: 18, unitPrice: 129 }] },
  { id: "SO-2026-1032", customer: "Nexa Retail Systems", date: "2026-07-14", status: "PACKED", lines: [{ productId: "p-002", quantity: 52, unitPrice: 19 }, { productId: "p-005", quantity: 24, unitPrice: 31 }] },
  { id: "SO-2026-1033", customer: "Desert Line Contracting", date: "2026-07-14", status: "CONFIRMED", lines: [{ productId: "p-001", quantity: 20, unitPrice: 67 }] }
];

const movements = [
  { id: "m-001", date: "2026-07-01", productId: "p-001", type: "OPENING", reference: "Opening Balance", quantity: 52, unitCost: 42 },
  { id: "m-002", date: "2026-07-01", productId: "p-002", type: "OPENING", reference: "Opening Balance", quantity: 105, unitCost: 10 },
  { id: "m-003", date: "2026-07-01", productId: "p-003", type: "OPENING", reference: "Opening Balance", quantity: 340, unitCost: 1.35 },
  { id: "m-004", date: "2026-07-01", productId: "p-004", type: "OPENING", reference: "Opening Balance", quantity: 64, unitCost: 72 },
  { id: "m-005", date: "2026-07-01", productId: "p-005", type: "OPENING", reference: "Opening Balance", quantity: 58, unitCost: 18 },
  { id: "m-006", date: "2026-07-13", productId: "p-003", type: "PURCHASE_RECEIPT", reference: "GRN-2026-0709", quantity: 500, unitCost: 1.4 },
  { id: "m-007", date: "2026-07-13", productId: "p-004", type: "SALES_SHIPMENT", reference: "SO-2026-1031", quantity: -18, unitCost: 72 },
  { id: "m-008", date: "2026-07-14", productId: "p-002", type: "PURCHASE_RECEIPT", reference: "GRN-2026-0712-A", quantity: 120, unitCost: 11 },
  { id: "m-009", date: "2026-07-14", productId: "p-005", type: "PURCHASE_RECEIPT", reference: "GRN-2026-0712-A", quantity: 30, unitCost: 18 },
  { id: "m-010", date: "2026-07-14", productId: "p-002", type: "SALES_SHIPMENT", reference: "SO-2026-1032", quantity: -52, unitCost: 10.53 },
  { id: "m-011", date: "2026-07-14", productId: "p-005", type: "SALES_SHIPMENT", reference: "SO-2026-1032", quantity: -24, unitCost: 18 }
];

async function main() {
  await prisma.stockMovement.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.product.deleteMany();

  for (const product of products) await prisma.product.create({ data: product });
  for (const supplier of suppliers) await prisma.supplier.create({ data: supplier });
  for (const po of purchaseOrders) {
    await prisma.purchaseOrder.create({
      data: {
        id: po.id,
        supplierId: po.supplierId,
        status: po.status,
        orderDate: new Date(po.orderDate),
        expectedDate: new Date(po.expectedDate),
        lines: { create: po.lines }
      }
    });
  }
  for (const sale of salesOrders) {
    await prisma.salesOrder.create({
      data: {
        id: sale.id,
        customer: sale.customer,
        date: new Date(sale.date),
        status: sale.status,
        lines: { create: sale.lines }
      }
    });
  }
  for (const movement of movements) await prisma.stockMovement.create({ data: { ...movement, date: new Date(movement.date) } });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
