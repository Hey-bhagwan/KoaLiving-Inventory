import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, type } = body as { sku: string; type: 'INWARD' | 'OUTWARD' };

    if (!sku || !type || !['INWARD', 'OUTWARD'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 1. Find the product
    const product = await prisma.product.findUnique({ where: { sku } });

    if (!product) {
      return NextResponse.json({ error: `SKU "${sku}" not found` }, { status: 404 });
    }

    // 2. Guard: Cannot go below 0
    if (type === 'OUTWARD' && product.quantity <= 0) {
      return NextResponse.json(
        { error: `"${product.name}" is out of stock` },
        { status: 400 }
      );
    }

    // 3. Atomic transaction: update quantity + insert log
    const [updatedProduct, log] = await prisma.$transaction([
      prisma.product.update({
        where: { sku },
        data: {
          quantity: type === 'INWARD' ? { increment: 1 } : { decrement: 1 },
        },
      }),
      prisma.inventoryLog.create({
        data: { sku, type },
      }),
    ]);

    return NextResponse.json({ product: updatedProduct, log }, { status: 200 });
  } catch (error) {
    console.error('POST /api/inventory/scan error:', error);
    return NextResponse.json({ error: 'Scan processing failed' }, { status: 500 });
  }
}
