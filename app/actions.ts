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
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  reference: z.string().min(3),
  unitCost: z.number().min(0)
});

const salesOrderSchema = z.object({
  id: z.string().min(3),
  customer: z.string().min(2),
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0)
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
  const po = await prisma.purchaseOrder.create({
    data: {
      id: data.id,
      supplierId: data.supplierId,
      status: "ORDERED",
      orderDate: today,
      expectedDate: new Date(data.expectedDate),
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
    lines: po.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitCost: Number(line.unitCost), received: line.received }))
  };
}

export async function createStockReceipt(input: z.infer<typeof stockReceiptSchema>) {
  await requireAdmin();
  const data = stockReceiptSchema.parse(input);
  const movement = await prisma.stockMovement.create({
    data: {
      date: new Date(),
      productId: data.productId,
      type: "PURCHASE_RECEIPT",
      reference: data.reference,
      quantity: data.quantity,
      unitCost: data.unitCost
    }
  });
  revalidatePath("/");

  return {
    id: movement.id,
    date: movement.date.toISOString().slice(0, 10),
    productId: movement.productId,
    type: "Purchase Receipt" as const,
    reference: movement.reference,
    quantity: movement.quantity,
    unitCost: Number(movement.unitCost)
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
        status: "SHIPPED",
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
    status: "Shipped" as const,
    lines: sale.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: Number(line.unitPrice) }))
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
