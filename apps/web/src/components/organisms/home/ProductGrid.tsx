import React from "react";
import { ProductCard } from "@/components/molecules/cards/ProductCard";
import { Button } from "@/components/atoms/Button";
import { ArrowRight } from "lucide-react";

const products = [
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

        {/* Scaled down cards by using more columns and less gap */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.map((product, idx) => (
            <ProductCard key={idx} {...product} />
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
