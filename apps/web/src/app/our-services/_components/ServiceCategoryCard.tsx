import React from "react";
import { ServiceCategory, ServiceItem } from "../types";
import { Check, CheckSquare, Square, Info } from "lucide-react";

interface Props {
  category: ServiceCategory;
  selectedItems: Set<string>;
  onToggleItem: (id: string, price: number) => void;
}

export function ServiceCategoryCard({ category, selectedItems, onToggleItem }: Props) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8 transition-shadow hover:shadow-md">
      <div className="bg-slate-50 px-6 py-5 border-b border-gray-100 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden bg-black shadow-sm">
          {category.icon && category.icon.startsWith("http") ? (
            <img src={category.icon} alt={category.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-2xl">{category.title.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-black tracking-tight">{category.title}</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-2xl">{category.description}</p>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-10">
          {category.subCategories.map((sub) => (
            <div key={sub.id} className="relative">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">{sub.title}</h3>
              {sub.description && (
                <div className="flex gap-2 items-start bg-blue-50/50 p-3 rounded-xl mb-4 text-sm text-slate-600">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p>{sub.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sub.items.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => onToggleItem(item.id, item.price)}
                      className={`group cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
                        isSelected 
                          ? "border-black bg-black/5" 
                          : "border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 shrink-0">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-black text-white">
                              <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-gray-400 transition-colors" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold text-sm transition-colors ${isSelected ? "text-black" : "text-gray-900"}`}>
                            {item.name}
                          </h4>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="font-bold text-black">
                              {item.priceLabel || `${item.price.toLocaleString()}₮`}
                            </span>
                            {!item.priceLabel && <span className="text-xs text-gray-500 font-medium">/ нийт</span>}
                          </div>
                          
                          {item.features && item.features.length > 0 && (
                            <ul className="mt-3 space-y-1.5 border-t border-gray-100/50 pt-3">
                              {item.features.map((feature, idx) => (
                                <li key={idx} className="text-xs text-gray-500 flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
