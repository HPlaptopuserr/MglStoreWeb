"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Plus,
  Tag,
  Barcode,
  Package,
  Search,
  X,
  Image as ImageIcon,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  images: string[];
  ownerId?: string;
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    name: "Wireless Headphones",
    sku: "WH-001-BLK",
    description: "High quality noise cancelling wireless headphones.",
    images: [],
  },
  {
    id: "prod-002",
    name: "Gaming Mouse",
    sku: "GM-002-RGB",
    description: "Ergonomic gaming mouse with RGB lighting.",
    images: [],
  },
  {
    id: "prod-003",
    name: "Smart Watch",
    sku: "SW-003-SLV",
    description: "Stylish smartwatch with health tracking features.",
    images: [],
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<{
    name: string;
    sku: string;
    description: string;
    images: string[];
  }>({
    name: "",
    sku: "",
    description: "",
    images: [],
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setProducts(MOCK_PRODUCTS);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const resetForm = () => {
    setNewProduct({
      name: "",
      sku: "",
      description: "",
      images: [],
    });
    setEditingProduct(null);
    setIsAdding(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (newProduct.images.length >= 2) {
      alert("You can only upload a maximum of 2 images.");
      return;
    }

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      setNewProduct((prev) => ({
        ...prev,
        images: [...prev.images, reader.result as string].slice(0, 2),
      }));
    };

    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setNewProduct((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === editingProduct.id
            ? {
                ...product,
                name: newProduct.name,
                sku: newProduct.sku,
                description: newProduct.description,
                images: newProduct.images,
              }
            : product,
        ),
      );
    } else {
      const createdProduct: Product = {
        id: `prod-${Date.now()}`,
        name: newProduct.name,
        sku: newProduct.sku,
        description: newProduct.description,
        images: newProduct.images,
      };

      setProducts((prev) => [createdProduct, ...prev]);
    }

    resetForm();
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      sku: product.sku,
      description: product.description,
      images: product.images || [],
    });
    setIsAdding(true);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-8 p-2">
      <div className="flex flex-col gap-4 justify-between md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">
            Products
          </h2>
          <p className="mt-1 font-medium text-slate-500">
            Manage your product catalog
          </p>
        </div>

        <div className="flex w-full items-center gap-3 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-12 rounded-full border-slate-200 bg-white pl-10 font-medium focus:border-black focus:ring-black"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            onClick={() => {
              if (isAdding) {
                resetForm();
              } else {
                setEditingProduct(null);
                setNewProduct({
                  name: "",
                  sku: "",
                  description: "",
                  images: [],
                });
                setIsAdding(true);
              }
            }}
            className="whitespace-nowrap rounded-full bg-black px-6 py-6 text-white shadow-lg shadow-black/20 transition-all hover:scale-105 hover:bg-slate-800"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span className="font-bold">Add Product</span>
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="animate-in slide-in-from-top-4 overflow-hidden rounded-3xl border-none shadow-2xl shadow-slate-200 fade-in duration-300">
          <div className="bg-black p-6">
            <h3 className="text-xl font-black text-white">
              {editingProduct ? "Edit Product" : "New Product"}
            </h3>
            <p className="text-sm font-medium text-white/70">
              Enter product details below
            </p>
          </div>

          <CardContent className="p-8">
            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product Name
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. Wireless Headphones"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    SKU
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. WH-001-BLK"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, sku: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. High quality noise cancelling..."
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        description: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product Images (Max 2)
                  </label>

                  <div className="flex items-center gap-4">
                    {newProduct.images.map((img, index) => (
                      <div
                        key={index}
                        className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200"
                      >
                        <img
                          src={img}
                          alt={`Preview ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {newProduct.images.length < 2 && (
                      <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 transition-colors hover:border-black hover:bg-slate-50">
                        <ImageIcon className="mb-1 h-6 w-6 text-slate-400" />
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          Upload
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  className="h-12 rounded-xl px-6 font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="h-12 rounded-xl bg-[#FFAD02] px-8 font-bold text-black shadow-lg shadow-orange-500/20 hover:bg-amber-500"
                >
                  {editingProduct ? "Update Product" : "Save Product"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-black"></div>
          <h3 className="text-xl font-black text-slate-900">My Products</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            {filteredProducts.length}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-black"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                <Tag className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                No products found
              </h3>
              <p className="mt-1 text-slate-500">
                {searchQuery
                  ? "No products match your search."
                  : "Get started by adding a new product."}
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/80"
              >
                {product.images && product.images.length > 0 ? (
                  <div className="relative mb-4 h-48 w-full overflow-hidden rounded-2xl bg-slate-100 transition-transform duration-300 group-hover:scale-[1.02]">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute right-2 top-2 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur-sm">
                      <Barcode className="h-3 w-3 text-slate-400" />
                      <span className="font-mono text-xs font-bold text-slate-600">
                        {product.sku}
                      </span>
                    </div>

                    {product.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                        +1 more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 transition-colors group-hover:bg-blue-100">
                      <Package className="h-7 w-7 text-blue-600" />
                    </div>

                    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                      <Barcode className="h-3 w-3 text-slate-400" />
                      <span className="font-mono text-xs font-bold text-slate-600">
                        {product.sku}
                      </span>
                    </div>
                  </div>
                )}

                <h3 className="mb-2 text-xl font-black text-slate-900">
                  {product.name}
                </h3>

                <div className="flex-1">
                  <p className="line-clamp-3 text-sm font-medium text-slate-500">
                    {product.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    ID: {product.id.slice(0, 6)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(product)}
                    className="rounded-lg font-bold text-slate-900 hover:bg-slate-50"
                  >
                    Edit Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
