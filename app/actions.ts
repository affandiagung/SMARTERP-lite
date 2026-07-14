"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, signInWithPassword, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const productSchema = z.object({
  sku: z.string().min(3),
  name: z.string().min(2),
  category: z.string().min(2),
  unit: z.string().min(1),
  reorderLevel: z.number().int().min(0),
  cost: z.number().min(0),
  price: z.number().min(0)
});

const reorderLevelSchema = z.object({
  productId: z.string().min(1),
  reorderLevel: z.number().int().min(0)
});

const supplierSchema = z.object({
  name: z.string().min(2),
  contact: z.string().min(2),
  email: z.string().email(),
  paymentTerms: z.string().min(2).default("Standard"),
  reliability: z.number().int().min(0).max(100).default(90)
});

const purchaseOrderSchema = z.object({
  id: z.string().min(3),
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
  expectedDate: z.string().min(10)
});

const stockReceiptSchema = z.object({
  purchaseOrderId: z.string().min(3),
  lineId: z.string().min(1),
  quantity: z.number().int().min(1)
});

const salesOrderSchema = z.object({
  id: z.string().min(3),
  customer: z.string().min(2),
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0)
});

const salesStatusSchema = z.object({
  id: z.string().min(3),
  status: z.enum(["Confirmed", "Packed", "Shipped"])
});

export async function createProduct(input: z.infer<typeof productSchema>) {
  await requireAdmin();
  const data = productSchema.parse(input);
  const product = await prisma.product.create({ data });
  revalidatePath("/");

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    reorderLevel: product.reorderLevel,
    cost: Number(product.cost),
    price: Number(product.price)
  };
}

export async function updateProductReorderLevel(input: z.infer<typeof reorderLevelSchema>) {
  await requireAdmin();
  const data = reorderLevelSchema.parse(input);
  const product = await prisma.product.update({
    where: { id: data.productId },
    data: { reorderLevel: data.reorderLevel }
  });
  revalidatePath("/");

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    reorderLevel: product.reorderLevel,
    cost: Number(product.cost),
    price: Number(product.price)
  };
}

export async function createSupplier(input: z.infer<typeof supplierSchema>) {
  await requireAdmin();
  const data = supplierSchema.parse(input);
  const supplier = await prisma.supplier.create({ data });
  revalidatePath("/");

  return {
    id: supplier.id,
    name: supplier.name,
    contact: supplier.contact,
    email: supplier.email,
    paymentTerms: supplier.paymentTerms,
    reliability: supplier.reliability
  };
}

export async function createPurchaseOrder(input: z.infer<typeof purchaseOrderSchema>) {
  await requireAdmin();
  const data = purchaseOrderSchema.parse(input);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expectedDate = new Date(data.expectedDate);

  if (expectedDate < tomorrow) {
    throw new Error("Expected date must be at least one day after the PO creation date.");
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      id: data.id,
      supplierId: data.supplierId,
      status: "ORDERED",
      orderDate: today,
      expectedDate,
      lines: {
        create: [{ productId: data.productId, quantity: data.quantity, unitCost: data.unitCost, received: 0 }]
      }
    },
    include: { lines: true }
  });
  revalidatePath("/");

  return {
    id: po.id,
    supplierId: po.supplierId,
    status: "Ordered" as const,
    orderDate: po.orderDate.toISOString().slice(0, 10),
    expectedDate: po.expectedDate.toISOString().slice(0, 10),
    lines: po.lines.map((line) => ({ id: line.id, productId: line.productId, quantity: line.quantity, unitCost: Number(line.unitCost), received: line.received }))
  };
}

export async function createStockReceipt(input: z.infer<typeof stockReceiptSchema>) {
  await requireAdmin();
  const data = stockReceiptSchema.parse(input);
  const result = await prisma.$transaction(async (tx) => {
    const line = await tx.purchaseOrderLine.findUnique({
      where: { id: data.lineId },
      include: { purchaseOrder: { include: { lines: true } } }
    });

    if (!line || line.purchaseOrderId !== data.purchaseOrderId) {
      throw new Error("Purchase order line was not found.");
    }

    const remaining = line.quantity - line.received;
    if (remaining <= 0) throw new Error("This PO line has already been fully received.");
    if (data.quantity > remaining) throw new Error(`Receipt quantity cannot exceed remaining quantity (${remaining}).`);

    await tx.purchaseOrderLine.update({
      where: { id: line.id },
      data: { received: line.received + data.quantity }
    });

    const movement = await tx.stockMovement.create({
      data: {
        date: new Date(),
        productId: line.productId,
        type: "PURCHASE_RECEIPT",
        reference: data.purchaseOrderId,
        quantity: data.quantity,
        unitCost: line.unitCost
      }
    });

    const updatedLines = line.purchaseOrder.lines.map((poLine) => (poLine.id === line.id ? { ...poLine, received: line.received + data.quantity } : poLine));
    const allReceived = updatedLines.every((poLine) => poLine.received >= poLine.quantity);
    const anyReceived = updatedLines.some((poLine) => poLine.received > 0);
    const status = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : "ORDERED";

    const po = await tx.purchaseOrder.update({
      where: { id: data.purchaseOrderId },
      data: { status },
      include: { lines: true }
    });

    return { movement, po };
  });
  revalidatePath("/");

  return {
    movement: {
    id: result.movement.id,
    date: result.movement.date.toISOString().slice(0, 10),
    productId: result.movement.productId,
    type: "Purchase Receipt" as const,
    reference: result.movement.reference,
    quantity: result.movement.quantity,
    unitCost: Number(result.movement.unitCost)
    },
    purchaseOrder: {
      id: result.po.id,
      supplierId: result.po.supplierId,
      status: result.po.status === "RECEIVED" ? "Received" as const : result.po.status === "PARTIALLY_RECEIVED" ? "Partially Received" as const : "Ordered" as const,
      orderDate: result.po.orderDate.toISOString().slice(0, 10),
      expectedDate: result.po.expectedDate.toISOString().slice(0, 10),
      lines: result.po.lines.map((line) => ({ id: line.id, productId: line.productId, quantity: line.quantity, unitCost: Number(line.unitCost), received: line.received }))
    }
  };
}

export async function createSalesOrder(input: z.infer<typeof salesOrderSchema>) {
  await requireAdmin();
  const data = salesOrderSchema.parse(input);
  const movements = await prisma.stockMovement.findMany({ where: { productId: data.productId } });
  const available = movements.reduce((total, movement) => total + movement.quantity, 0);
  const inventoryValue = movements.reduce((total, movement) => total + movement.quantity * Number(movement.unitCost), 0);
  const averageCost = available > 0 ? inventoryValue / available : 0;

  if (available < data.quantity) {
    throw new Error(`Insufficient stock. Available quantity is ${available}.`);
  }

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        id: data.id,
        customer: data.customer,
        date: new Date(),
        status: "CONFIRMED",
        lines: { create: [{ productId: data.productId, quantity: data.quantity, unitPrice: data.unitPrice }] }
      },
      include: { lines: true }
    });

    await tx.stockMovement.create({
      data: {
        date: new Date(),
        productId: data.productId,
        type: "SALES_SHIPMENT",
        reference: data.id,
        quantity: -data.quantity,
        unitCost: averageCost
      }
    });

    return created;
  });
  revalidatePath("/");

  return {
    id: sale.id,
    customer: sale.customer,
    date: sale.date.toISOString().slice(0, 10),
    status: "Confirmed" as const,
    lines: sale.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: Number(line.unitPrice) }))
  };
}

export async function updateSalesOrderStatus(input: z.infer<typeof salesStatusSchema>) {
  await requireAdmin();
  const data = salesStatusSchema.parse(input);
  const sale = await prisma.salesOrder.findUnique({ where: { id: data.id } });
  if (!sale) throw new Error("Sales order was not found.");

  const current = sale.status === "CONFIRMED" ? "Confirmed" : sale.status === "PACKED" ? "Packed" : "Shipped";
  const rank = { Confirmed: 1, Packed: 2, Shipped: 3 } as const;
  if (rank[data.status] < rank[current]) throw new Error("Sales status cannot move backwards.");

  const status = data.status === "Confirmed" ? "CONFIRMED" : data.status === "Packed" ? "PACKED" : "SHIPPED";
  const updated = await prisma.salesOrder.update({ where: { id: data.id }, data: { status }, include: { lines: true } });
  revalidatePath("/");

  return {
    id: updated.id,
    customer: updated.customer,
    date: updated.date.toISOString().slice(0, 10),
    status: data.status,
    lines: updated.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: Number(line.unitPrice) }))
  };
}

export async function login(input: { email: string; password: string }) {
  const credentials = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(input);
  await signInWithPassword(credentials.email, credentials.password);
  revalidatePath("/");
}

export async function logout() {
  await signOut();
  revalidatePath("/");
  redirect("/");
}
