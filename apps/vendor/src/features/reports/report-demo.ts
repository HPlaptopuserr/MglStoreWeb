import type { Product } from "@/features/products";
import { createSalesHistoryDemo } from "@/features/pos/utils/sales-history-demo";
import { filterSalesHistory } from "@/features/pos/utils/sales-history-filters";
import type { BestSellingProduct } from "./best-selling-products";

/** Local preview only. No fixture is persisted or submitted to an API. */
export function createReportDemo(day: string, start = "") {
  const receipts = createSalesHistoryDemo(new Date(`${day}T12:00:00+08:00`));
  const products: Product[] = receipts.slice(0, 2).map((receipt, index) => {
    const line = receipt.lines[0];
    return {
      id: line.productId,
      name: line.name,
      sku: line.sku ?? "",
      barcode: line.barcode ?? "",
      description: "Тайлан шалгах тест бараа",
      price: line.unitPrice,
      wholesalePrice: line.unitPrice - 500,
      orderPrice: line.unitPrice,
      costPrice: line.unitCost ?? 2000,
      taxType: "VAT_ABLE",
      cityTaxRate: 0,
      classificationCode: line.classificationCode ?? "",
      taxProductCode: line.taxProductCode ?? "",
      stock: 50 + index * 20,
      lowStockThreshold: 5,
      unit: "pcs",
      supplyType: "IN_STOCK",
      isActive: true,
      businessCategoryId: `test-category-${index}`,
      businessCategory: {
        id: `test-category-${index}`,
        name: index ? "Талх, нарийн боов" : "Ундаа",
      },
      createdAt: `${day}T09:00:00+08:00`,
      images: [],
      preorderLeadTimeDays: null,
      preorderCapacity: null,
      preorderSupplierFrontImageUrl: null,
      preorderSupplierBackImageUrl: null,
      preorderNote: null,
      preorderPriceCurrency: null,
      preorderPriceAmount: null,
      preorderExchangeRate: null,
      preorderMarkupPercent: null,
      preorderRateSource: null,
      preorderRateFetchedAt: null,
      marketplacePriority: 0,
    };
  });
  const bestSellingProducts: BestSellingProduct[] = products
    .map((product, index) => {
      const sales = filterSalesHistory(receipts, start, "", day)
        .filter((receipt) => receipt.status === "COMPLETED")
        .flatMap((receipt) => receipt.lines)
        .filter((line) => line.productId === product.id);
      return {
        rank: index + 1,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: "pcs",
        quantitySold: sales.reduce((sum, line) => sum + line.qty, 0),
        revenue: sales.reduce((sum, line) => sum + line.lineTotal, 0),
        salesCount: sales.length,
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .map((product, index) => ({ ...product, rank: index + 1 }));
  return { products, bestSellingProducts, receipts };
}
