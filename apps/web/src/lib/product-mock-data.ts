import type { Product } from "@/components/organisms/home/grid/ProductGrid";

const baseProducts: Omit<Product, "id">[] = [
  {
    title: "Organic Bananas",
    price: 1.99,
    originalPrice: 2.49,
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=500&fit=crop",
    tag: "Best Seller",
    rating: 5,
    reviews: 124,
    store: { name: "Fresh Farms" },
  },
  {
    title: "Fresh Strawberries",
    price: 4.99,
    image:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=500&fit=crop",
    tag: "Local",
    rating: 4,
    reviews: 89,
    store: { name: "Berry Good" },
  },
  {
    title: "Whole Milk",
    price: 3.49,
    originalPrice: 3.99,
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=500&fit=crop",
    rating: 5,
    reviews: 256,
    store: { name: "Dairy Co." },
  },
  {
    title: "Avocados (Pack of 4)",
    price: 5.99,
    image:
      "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=500&fit=crop",
    tag: "-15%",
    rating: 4,
    reviews: 42,
    store: { name: "Green Grocers" },
  },
  {
    title: "Sourdough Bread",
    price: 6.49,
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=500&fit=crop",
    rating: 5,
    reviews: 210,
    store: { name: "Artisan Bakery" },
  },
  {
    title: "Free-Range Eggs",
    price: 5.29,
    image:
      "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=500&fit=crop",
    tag: "Organic",
    rating: 5,
    reviews: 155,
    store: { name: "Happy Hens" },
  },
  {
    title: "Fresh Salmon Fillet",
    price: 12.99,
    originalPrice: 15.99,
    image:
      "https://images.unsplash.com/photo-1499125562588-29fb8a56b5d5?w=400&h=500&fit=crop",
    rating: 4,
    reviews: 67,
    store: { name: "Ocean Catch" },
  },
  {
    title: "Greek Yogurt",
    price: 4.49,
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=500&fit=crop",
    rating: 4,
    reviews: 132,
    store: { name: "Dairy Co." },
  },
];

export const products: Product[] = Array.from({ length: 30 }, (_, index) => {
  const base = baseProducts[index % baseProducts.length];
  return {
    ...base,
    id: `prod_v${index + 1}`,
    title:
      index < baseProducts.length
        ? base.title
        : `${base.title} v.${index + 1}`,
    price: Number((base.price + index * 0.15).toFixed(2)),
    originalPrice: base.originalPrice
      ? Number((base.originalPrice + index * 0.15).toFixed(2))
      : undefined,
    image: base.image,
    reviews: base.reviews + index * 13,
    store: base.store,
  };
});
