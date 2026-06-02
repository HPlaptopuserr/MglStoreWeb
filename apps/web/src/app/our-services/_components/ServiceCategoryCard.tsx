import React from "react";
import { ServiceCategory, ServiceItem } from "../types";
import { Check, CheckSquare, Square, Info } from "lucide-react";

interface Props {
  category: ServiceCategory;
  selectedItems: Set<string>;
  onToggleItem: (id: string, price: number, parentId?: string) => void;
}

export function ServiceCategoryCard({ category, selectedItems, onToggleItem }: Props) {
  return (
    <div
      id={category.id}
      className="scroll-mt-28 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8 transition-shadow hover:shadow-md"
    >
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
                  const hasOptions = item.options && item.options.length > 0;
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={!hasOptions ? () => onToggleItem(item.id, item.price) : undefined}
                      className={`rounded-2xl border-2 transition-all duration-200 ${
                        hasOptions 
                          ? "border-gray-100 bg-white p-5" 
                          : (isSelected 
                              ? "border-black bg-black/5 p-4 group cursor-pointer" 
                              : "border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 p-4 group cursor-pointer"
                            )
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {!hasOptions && (
                          <div className="mt-1 shrink-0">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded flex items-center justify-center bg-black text-white">
                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-gray-400 transition-colors" />
                            )}
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className={`font-semibold text-sm transition-colors ${isSelected && !hasOptions ? "text-black" : "text-gray-900"}`}>
                            {item.name}
                          </h4>
                          
                          {!hasOptions && (
                            <div className="mt-1.5 flex items-baseline gap-1.5">
                              <span className="font-bold text-black">
                                {item.priceLabel || `${item.price.toLocaleString()}₮`}
                              </span>
                              {!item.priceLabel && <span className="text-xs text-gray-500 font-medium">/ нийт</span>}
                            </div>
                          )}
                          
                          {item.features && item.features.length > 0 && (
                            <ul className={`space-y-1.5 pt-3 ${hasOptions ? "mt-2 border-t-0" : "mt-3 border-t border-gray-100/50"}`}>
                              {item.features.map((feature, idx) => (
                                <li key={idx} className="text-xs text-gray-500 flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {hasOptions && item.options && (
                            <div className="mt-5 space-y-2 border-t border-gray-100/50 pt-5">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Хувилбар сонгох:</p>
                              <div className="flex flex-col gap-2">
                                {item.options.map(opt => {
                                  const optId = `${item.id}_${opt.id}`;
                                  const isOptSelected = selectedItems.has(optId);
                                  return (
                                    <div 
                                      key={opt.id}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onToggleItem(optId, opt.price, item.id);
                                      }}
                                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${isOptSelected ? "border-black bg-black/5 shadow-sm" : "border-gray-100 hover:border-gray-300 bg-white hover:shadow-sm"}`}
                                    >
                                      <div className="shrink-0 flex items-center">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isOptSelected ? "border-black bg-black" : "border-gray-300 bg-white"}`}>
                                          {isOptSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                      </div>
                                      <div className="flex-1 flex justify-between items-center text-sm">
                                        <span className={`font-semibold ${isOptSelected ? "text-black" : "text-gray-700"}`}>{opt.name}</span>
                                        <span className="font-bold text-black">{opt.price.toLocaleString()}₮</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
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
