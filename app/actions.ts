"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

const supplierSchema = z.object({
  name: z.string().min(2),
  contact: z.string().min(2),
  email: z.string().email(),
  paymentTerms: z.string().min(2),
  reliability: z.number().int().min(0).max(100)
});

export async function createProduct(input: z.infer<typeof productSchema>) {
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

export async function createSupplier(input: z.infer<typeof supplierSchema>) {
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
