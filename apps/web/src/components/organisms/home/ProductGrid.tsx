import React from "react";
import { ProductCard } from "@mgl/ui";
import { Button } from "@mgl/ui";
import { ArrowRight } from "lucide-react";

export interface Store {
  name: string;
  logo?: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  tag?: string;
  rating: number;
  reviews: number;
  store: Store;
}

const baseProducts: Omit<Product, "id">[] = [
  {
    title: "Organic Bananas",
    price: 1.99,
    originalPrice: 2.49,
    image: "https://picsum.photos/seed/bananas/400/300",
    tag: "Best Seller",
    rating: 5,
    reviews: 124,
    store: {
      name: "Fresh Farms",
      logo: "https://picsum.photos/seed/farm1/100/100",
    },
  },
  {
    title: "Fresh Strawberries",
    price: 4.99,
    image: "https://picsum.photos/seed/strawberries/400/300",
    tag: "Local",
    rating: 4,
    reviews: 89,
    store: {
      name: "Berry Good",
      logo: "https://picsum.photos/seed/farm2/100/100",
    },
  },
  {
    title: "Whole Milk",
    price: 3.49,
    originalPrice: 3.99,
    image: "https://picsum.photos/seed/milk/400/300",
    rating: 5,
    reviews: 256,
    store: { name: "Dairy Co." },
  },
  {
    title: "Avocados (Pack of 4)",
    price: 5.99,
    image: "https://picsum.photos/seed/avocado/400/300",
    tag: "-15%",
    rating: 4,
    reviews: 42,
    store: { name: "Green Grocers" },
  },
  {
    title: "Sourdough Bread",
    price: 6.49,
    image: "https://picsum.photos/seed/bread/400/300",
    rating: 5,
    reviews: 210,
    store: {
      name: "Artisan Bakery",
      logo: "https://picsum.photos/seed/bakery/100/100",
    },
  },
  {
    title: "Free-Range Eggs",
    price: 5.29,
    image: "https://picsum.photos/seed/eggs/400/300",
    tag: "Organic",
    rating: 5,
    reviews: 155,
    store: { name: "Happy Hens" },
  },
  {
    title: "Fresh Salmon Fillet",
    price: 12.99,
    originalPrice: 15.99,
    image: "https://picsum.photos/seed/salmon/400/300",
    rating: 4,
    reviews: 67,
    store: {
      name: "Ocean Catch",
      logo: "https://picsum.photos/seed/fish/100/100",
    },
  },
  {
    title: "Greek Yogurt",
    price: 4.49,
    image: "https://picsum.photos/seed/yogurt/400/300",
    rating: 4,
    reviews: 132,
    store: { name: "Dairy Co." },
  },
];

export const products: Product[] = Array.from({ length: 30 }, (_, index) => {
  const base = baseProducts[index % baseProducts.length];

  const seedWord = base.title
    .split(" ")[0]
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return {
    ...base,
    id: `prod_v${index + 1}`,
    title:
      index < baseProducts.length ? base.title : `${base.title} v.${index + 1}`,
    price: Number((base.price + index * 0.15).toFixed(2)),
    originalPrice: base.originalPrice
      ? Number((base.originalPrice + index * 0.15).toFixed(2))
      : undefined,
    image: `https://picsum.photos/seed/${seedWord}${index}/400/300`,
    reviews: base.reviews + index * 13,
    store: {
      ...base.store,
      logo: base.store.logo
        ? `https://picsum.photos/seed/store_${seedWord}${index}/100/100`
        : undefined,
    },
  };
});

export const ProductGrid = () => {
  return (
    <section className="py-8 bg-slate-50/50 rounded-2xl my-6">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">
              Бүтээгдэхүүнүүд
            </h2>
            <p className="text-sm text-slate-500">
              Fresh picks from our local partners
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex text-sm h-9"
          >
            View All Products
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.map((product, idx) => (
            <ProductCard
              key={idx}
              image={product.image}
              price={product.price}
              name={product.title}
              category={"—"}
              originalPrice={product.originalPrice}
              tag={product.tag}
              rating={product.rating}
              reviews={product.reviews}
              storeName={product.store?.name}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-center md:hidden">
          <Button variant="outline" size="sm" className="w-full h-9 text-sm">
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};
