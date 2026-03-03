import React from "react";

// sample categories with placeholder images
const CATEGORY_LIST = [
  {
    name: "Fruits",
    img: "https://images.unsplash.com/photo-1502741126161-b048400d946e?auto=format&fit=crop&w=400&q=60",
  },
  {
    name: "Vegetables",
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=60",
  },
  {
    name: "Meat",
    img: "https://images.unsplash.com/photo-1604908177520-d36b3b0db011?auto=format&fit=crop&w=400&q=60",
  },
  {
    name: "Dairy",
    img: "https://images.unsplash.com/photo-1585238342024-78fdc829eb03?auto=format&fit=crop&w=400&q=60",
  },
  {
    name: "Bakery",
    img: "https://images.unsplash.com/photo-1601924920590-0e615a250277?auto=format&fit=crop&w=400&q=60",
  },
];

export const CategorySearch = () => {
  return (
    <div className="w-full h-[40px] shrink-0">
      <div className="flex overflow-x-auto gap-3 py-0 scrollbar-hide no-scrollbar h-full items-center">
        {CATEGORY_LIST.map((cat, idx) => (
          <button
            key={cat.name}
            className={`relative flex-shrink-0 w-28 h-9 rounded-full overflow-hidden shadow-sm focus:outline-none transition-all hover:opacity-100 cursor-pointer ${idx === 1
                ? "opacity-100 ring-2 ring-orange-400 ring-offset-2"
                : "opacity-60 grayscale hover:grayscale-0"
              }`}
          >
            <img
              src={cat.img}
              alt={cat.name}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold tracking-wide transition-colors ${idx === 1 ? 'bg-black/20 text-white' : 'bg-black/40 text-white hover:bg-black/20'}`}>
              {cat.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
