"use client";
import React, { useState } from "react";
import {
  Menu,
  ChevronRight,
  ChevronDown,
  Apple,
  Beef,
  Milk,
  Croissant,
  ShoppingBasket,
  Candy,
  Coffee,
  Sparkles,
  Smile,
  Baby,
} from "lucide-react";
import { Button } from "@mgl/ui";

const MEGA_CATEGORIES = [
  {
    id: "fresh",
    name: "Fresh Produce",
    icon: Apple,
    subcategories: [
      "Organic Fruits",
      "Fresh Vegetables",
      "Exotic Fruits",
      "Herbs & Seasonings",
      "Pre-cut Salads",
    ],
  },
  {
    id: "meat",
    name: "Meat & Seafood",
    icon: Beef,
    subcategories: [
      "Premium Beef",
      "Poultry",
      "Pork",
      "Fresh Fish",
      "Shellfish",
      "Plant-based Meat",
    ],
  },
  {
    id: "dairy",
    name: "Dairy & Eggs",
    icon: Milk,
    subcategories: [
      "Farm Eggs",
      "Fresh Milk",
      "Artisan Cheese",
      "Yogurt & Kefir",
      "Butter & Cream",
    ],
  },
  {
    id: "bakery",
    name: "Bakery & Bread",
    icon: Croissant,
    subcategories: [
      "Sourdough",
      "Tortillas & Wraps",
      "Pastries",
      "Gluten-Free",
      "Bagels",
    ],
  },
  {
    id: "pantry",
    name: "Pantry Staples",
    icon: ShoppingBasket,
    subcategories: [
      "Pasta & Grains",
      "Canned Goods",
      "Oils & Vinegars",
      "Spices",
      "Baking Needs",
    ],
  },
  {
    id: "snacks",
    name: "Snacks & Sweets",
    icon: Candy,
    subcategories: [
      "Chips & Pretzels",
      "Chocolate",
      "Cookies",
      "Nuts & Seeds",
      "Healthy Snacks",
    ],
  },
  {
    id: "beverages",
    name: "Beverages",
    icon: Coffee,
    subcategories: ["Coffee & Tea", "Juice", "Water", "Soda", "Energy Drinks"],
  },
  {
    id: "household",
    name: "Household",
    icon: Sparkles,
    subcategories: [
      "Cleaning Supplies",
      "Paper Goods",
      "Laundry",
      "Dishwashing",
      "Trash Bags",
    ],
  },
  {
    id: "health",
    name: "Health & Beauty",
    icon: Smile,
    subcategories: [
      "Vitamins",
      "Personal Care",
      "Skin Care",
      "Hair Care",
      "First Aid",
    ],
  },
  {
    id: "baby",
    name: "Baby & Kids",
    icon: Baby,
    subcategories: [
      "Diapers",
      "Baby Food",
      "Formula",
      "Bath & Skin Care",
      "Kids Snacks",
    ],
  },
];

export const MegaMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(MEGA_CATEGORIES[0]);

  return (
    <div
      className="relative h-full flex items-center"
      onClick={() => setIsOpen((prev) => !prev)}
    >
      <Button
        variant="ghost"
        className="flex items-center gap-3 text-slate-800 hover:text-amber-600 font-bold bg-transparent hover:bg-slate-50 h-full px-4 rounded-xl"
        onClick={(e) => {
          // prevent the container click from immediately toggling twice
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
      >
        <Menu size={20} className="text-slate-700" />
        <span className="hidden xl:inline-block">Бүх ангилал</span>
        <ChevronDown size={14} className="text-slate-400 ml-1" />
      </Button>

      {isOpen && (
        <div className="absolute top-12 left-[-25] right-0 md:left-0 w-[calc(100vw-16px)] md:w-200 lg:w-225 max-h-[85vh] md:max-h-138 bg-white rounded-2xl shadow-2xl border border-slate-100 mt-2 z-50 overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-top-2 duration-200 mx-2 md:mx-0">
          <div className="md:hidden flex-none w-full bg-linear-to-r from-slate-50 to-white border-b border-slate-100 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 p-3 min-w-min">
              {MEGA_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory.id === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all text-xs font-medium shrink-0 ${
                      isActive
                        ? "bg-amber-500 text-white shadow-md"
                        : "bg-slate-100 text-slate-600 active:bg-slate-200"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden md:flex flex-col flex-none w-full md:w-55 lg:w-70 bg-slate-50 border-r border-slate-100 overflow-y-auto py-2 h-full">
            {MEGA_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory.id === category.id;
              return (
                <div
                  key={category.id}
                  className={`flex items-center justify-between px-4 lg:px-5 py-3 cursor-pointer transition-colors text-sm ${
                    isActive
                      ? "bg-white text-amber-500 font-bold shadow-sm border-y border-r-0 border-slate-100 relative -mr-px z-10"
                      : "text-slate-600 hover:text-amber-500 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    <Icon
                      size={16}
                      className={isActive ? "text-amber-500" : "text-slate-400"}
                    />
                    <span className="text-xs lg:text-sm">{category.name}</span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`hidden lg:block ${isActive ? "text-amber-500" : "text-slate-300"}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex-1 bg-white p-3 md:p-6 lg:p-8 overflow-y-auto">
            <h2 className="text-base md:text-xl lg:text-2xl font-bold text-slate-800 mb-3 md:mb-6">
              {activeCategory.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 md:gap-y-6 gap-x-4 md:gap-x-8">
              <div className="flex flex-col space-y-2 md:space-y-4">
                <h3 className="text-xs md:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Popular Subcategories
                </h3>
                <ul className="space-y-1.5 md:space-y-3">
                  {activeCategory.subcategories.map((sub, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="text-xs md:text-sm text-slate-500 hover:text-amber-500 hover:underline line-clamp-1 md:line-clamp-none"
                      >
                        {sub}
                      </a>
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className="text-xs md:text-sm font-semibold text-amber-500 pt-1 md:pt-2 flex items-center gap-1 group w-fit"
                >
                  Shop all
                  <ChevronRight
                    size={12}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </a>
              </div>

              <div className="hidden md:flex bg-amber-50 rounded-xl p-4 md:p-6 flex-col justify-between border border-amber-100">
                <div>
                  <span className="inline-block px-2 py-1 bg-white text-amber-500 text-[8px] md:text-[10px] font-bold uppercase tracking-wider rounded-md mb-2">
                    Offer
                  </span>
                  <h3 className="text-sm md:text-lg font-bold text-slate-800 leading-tight">
                    Up to 20% off
                    <br />
                    {activeCategory.name}
                  </h3>
                </div>
                <Button
                  size="sm"
                  className="mt-3 md:mt-4 bg-amber-500 hover:bg-amber-600 text-white shadow-none w-fit text-xs md:text-sm py-1 md:py-2 px-3 md:px-4"
                >
                  Цааш үзэх
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
