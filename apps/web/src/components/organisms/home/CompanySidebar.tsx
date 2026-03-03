import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, LayoutGrid } from 'lucide-react';

interface CompanySidebarProps {
  categories: string[];
  activeCategory?: string;
}

export const CompanySidebar = ({ categories, activeCategory }: CompanySidebarProps) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-6 px-2">
        <LayoutGrid size={18} className="text-slate-400" />
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Menu</h3>
      </div>
      
      <nav className="space-y-1">
        <button
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
            !activeCategory 
              ? "bg-amber-500 text-white shadow-md shadow-amber-200" 
              : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
          )}
        >
          <span>All Products</span>
          {!activeCategory && <ChevronRight size={16} />}
        </button>
        
        {categories.map((category) => (
          <button
            key={category}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
              activeCategory === category
                ? "bg-amber-500 text-white shadow-md shadow-amber-200" 
                : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
            )}
          >
            <span>{category}</span>
            {activeCategory === category && <ChevronRight size={16} />}
          </button>
        ))}
      </nav>
    </div>
  );
};
