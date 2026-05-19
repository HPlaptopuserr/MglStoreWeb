import React, { useState, useRef } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Settings, Info, ImagePlus, Loader2, Save, Check, ArrowUp, ArrowDown } from "lucide-react";
import { ServiceCategory, ServiceSubCategory, ServiceItem, ServiceOption } from "@/lib/sections/types";
import { API, adminFetch } from "@/lib/api";

const generateId = () => Math.random().toString(36).substring(2, 10);

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1000;
      const scale = img.width > MAX_W ? MAX_W / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compress алдаа")), "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface Props {
  mglServices: ServiceCategory[];
  setMglServices: (update: ServiceCategory[] | ((prev: ServiceCategory[]) => ServiceCategory[])) => void;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
}

export function MglServicesSection({ mglServices, setMglServices, onSave, saving, saved }: Props) {
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [uploadingCatId, setUploadingCatId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addCategory = () => {
    setMglServices([
      ...mglServices,
      {
        id: generateId(),
        title: "Шинэ ангилал",
        description: "",
        icon: "",
        subCategories: [],
      },
    ]);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newItems = [...mglServices];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      setMglServices(newItems);
    } else if (direction === 'down' && index < mglServices.length - 1) {
      const newItems = [...mglServices];
      [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
      setMglServices(newItems);
    }
  };

  const updateCategory = (id: string, field: keyof ServiceCategory, value: any) => {
    setMglServices(mglServices.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCategory = (id: string) => {
    if (confirm("Устгах уу?")) {
      setMglServices(mglServices.filter((c) => c.id !== id));
    }
  };

  const addSubCategory = (catId: string) => {
    setMglServices(mglServices.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          subCategories: [
            ...c.subCategories,
            { id: generateId(), title: "Шинэ дэд хэсэг", items: [] }
          ]
        };
      }
      return c;
    }));
  };

  const updateSubCategory = (catId: string, subId: string, field: keyof ServiceSubCategory, value: any) => {
    setMglServices(mglServices.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          subCategories: c.subCategories.map(sub => sub.id === subId ? { ...sub, [field]: value } : sub)
        };
      }
      return c;
    }));
  };

  const removeSubCategory = (catId: string, subId: string) => {
    if (confirm("Устгах уу?")) {
      setMglServices(mglServices.map(c => {
        if (c.id === catId) {
          return { ...c, subCategories: c.subCategories.filter(s => s.id !== subId) };
        }
        return c;
      }));
    }
  };

  const addItem = (catId: string, subId: string) => {
    setMglServices(mglServices.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          subCategories: c.subCategories.map(sub => {
            if (sub.id === subId) {
              return {
                ...sub,
                items: [...sub.items, { id: generateId(), name: "Шинэ үйлчилгээ", price: 0 }]
              };
            }
            return sub;
          })
        };
      }
      return c;
    }));
  };

  const updateItem = (catId: string, subId: string, itemId: string, field: keyof ServiceItem, value: any) => {
    setMglServices(mglServices.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          subCategories: c.subCategories.map(sub => {
            if (sub.id === subId) {
              return {
                ...sub,
                items: sub.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
              };
            }
            return sub;
          })
        };
      }
      return c;
    }));
  };

  const removeItem = (catId: string, subId: string, itemId: string) => {
    if (confirm("Устгах уу?")) {
      setMglServices(mglServices.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            subCategories: c.subCategories.map(sub => {
              if (sub.id === subId) {
                return { ...sub, items: sub.items.filter(item => item.id !== itemId) };
              }
              return sub;
            })
          };
        }
        return c;
      }));
    }
  };

  const addOption = (catId: string, subId: string, itemId: string) => {
    setMglServices(mglServices.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          subCategories: c.subCategories.map(sub => {
            if (sub.id === subId) {
              return {
                ...sub,
                items: sub.items.map(item => {
                  if (item.id === itemId) {
                    return {
                      ...item,
                      options: [...(item.options || []), { id: generateId(), name: "Шинэ сонголт", price: 0 }]
                    };
                  }
                  return item;
                })
              };
            }
            return sub;
          })
        };
      }
      return c;
    }));
  };

  const updateOption = (catId: string, subId: string, itemId: string, optionId: string, field: keyof ServiceOption, value: any) => {
    setMglServices(mglServices.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          subCategories: c.subCategories.map(sub => {
            if (sub.id === subId) {
              return {
                ...sub,
                items: sub.items.map(item => {
                  if (item.id === itemId) {
                    return {
                      ...item,
                      options: (item.options || []).map(opt => opt.id === optionId ? { ...opt, [field]: value } : opt)
                    };
                  }
                  return item;
                })
              };
            }
            return sub;
          })
        };
      }
      return c;
    }));
  };

  const removeOption = (catId: string, subId: string, itemId: string, optionId: string) => {
    if (confirm("Устгах уу?")) {
      setMglServices(mglServices.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            subCategories: c.subCategories.map(sub => {
              if (sub.id === subId) {
                return {
                  ...sub,
                  items: sub.items.map(item => {
                    if (item.id === itemId) {
                      return {
                        ...item,
                        options: (item.options || []).filter(opt => opt.id !== optionId)
                      };
                    }
                    return item;
                  })
                };
              }
              return sub;
            })
          };
        }
        return c;
      }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadingCatId) return;
    
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append("image", compressed, "service-icon.jpg");
      
      const res = await adminFetch(`${API}/site-settings/banner-upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Зураг оруулах үед алдаа гарлаа");
      
      const { url } = await res.json() as { url: string };
      updateCategory(uploadingCatId, "icon", url);
    } catch (err) {
      alert("Зураг оруулахад алдаа гарлаа");
    } finally {
      setUploadingCatId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900">MGL Үйлчилгээнүүд</h2>
          <p className="text-sm text-slate-500">MGL Store-оос санал болгож буй багц үйлчилгээнүүдийн тохиргоо</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addCategory}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Plus size={16} /> Ангилал нэмэх
          </button>
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm ${
                saved ? "bg-green-500" : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-70`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {saving ? "Хадгалж байна..." : saved ? "Хадгалагдсан" : "Бүгдийг хадгалах"}
            </button>
          )}
        </div>
      </div>
      
      <input 
        type="file" 
        ref={fileRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="space-y-4">
        {mglServices.map((cat) => {
          const isExpanded = expandedCats[cat.id] ?? true;
          return (
            <div key={cat.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button onClick={() => setExpandedCats({ ...expandedCats, [cat.id]: !isExpanded })} className="text-slate-400 hover:text-slate-700">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  <input
                    value={cat.title}
                    onChange={(e) => updateCategory(cat.id, "title", e.target.value)}
                    className="font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-base flex-1"
                    placeholder="Үндсэн ангиллын нэр"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveCategory(mglServices.indexOf(cat), 'up')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors" title="Дээшлүүлэх"><ArrowUp size={16} /></button>
                  <button onClick={() => moveCategory(mglServices.indexOf(cat), 'down')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors" title="Доошлуулах"><ArrowDown size={16} /></button>
                  <button onClick={() => removeCategory(cat.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 ml-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-24 shrink-0">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Зураг/Icon</label>
                      <div 
                        onClick={() => { setUploadingCatId(cat.id); fileRef.current?.click(); }}
                        className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden relative group"
                      >
                        {uploadingCatId === cat.id ? (
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        ) : cat.icon && cat.icon.startsWith("http") ? (
                          <>
                            <img src={cat.icon} alt={cat.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImagePlus className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-slate-400 group-hover:text-blue-500">
                            <ImagePlus className="w-8 h-8 mx-auto mb-1" />
                            <span className="text-[10px] font-medium">Оруулах</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Тайлбар</label>
                      <textarea
                        value={cat.description}
                        onChange={(e) => updateCategory(cat.id, "description", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-slate-400 h-24 resize-none"
                        placeholder="Энэ үйлчилгээний талаарх товч тайлбар..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {cat.subCategories.map((sub) => (
                      <div key={sub.id} className="border border-slate-100 rounded-xl bg-slate-50/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            value={sub.title}
                            onChange={(e) => updateSubCategory(cat.id, sub.id, "title", e.target.value)}
                            className="font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:border-slate-500 focus:outline-none px-1 py-0.5 text-sm w-64"
                            placeholder="Дэд хэсгийн нэр (жишээ нь: ЖДБ-үүд)"
                          />
                          <button onClick={() => removeSubCategory(cat.id, sub.id)} className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1">
                            <Trash2 size={12} /> Устгах
                          </button>
                        </div>

                        <div className="mb-3">
                          <input
                            value={sub.description || ""}
                            onChange={(e) => updateSubCategory(cat.id, sub.id, "description", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-slate-400"
                            placeholder="Дэлгэрэнгүй тайлбар (заавал биш)"
                          />
                        </div>

                        <div className="space-y-2">
                          {sub.items.map((item) => (
                            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2 relative group">
                              <button onClick={() => removeItem(cat.id, sub.id, item.id)} className="absolute right-2 top-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Үйлчилгээний нэр</label>
                                  <div className="bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                    <input
                                      value={item.name}
                                      onChange={(e) => updateItem(cat.id, sub.id, item.id, "name", e.target.value)}
                                      className="w-full border-none focus:outline-none font-semibold text-sm bg-transparent p-0 text-slate-800"
                                      placeholder="Үйлчилгээний нэр..."
                                    />
                                  </div>
                                </div>
                                <div className="w-36">
                                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Үнэ</label>
                                  <div className="relative bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                    <input
                                      type="text"
                                      value={item.price ? item.price.toLocaleString() : ""}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        updateItem(cat.id, sub.id, item.id, "price", val ? Number(val) : 0);
                                      }}
                                      className="w-full border-none focus:outline-none font-bold text-sm bg-transparent p-0 pr-4 text-slate-800 text-right"
                                      placeholder="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">₮</span>
                                  </div>
                                </div>
                                <div className="w-48 pr-2">
                                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Текстийн харагдац</label>
                                  <div className="bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                    <input
                                      value={item.priceLabel || ""}
                                      onChange={(e) => updateItem(cat.id, sub.id, item.id, "priceLabel", e.target.value)}
                                      className="w-full border-none focus:outline-none text-sm bg-transparent p-0 text-slate-600"
                                      placeholder="Жнь: 30,000₮ - 60,000₮"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                                  Багцад багтах зүйлс (Features) <Info size={10} />
                                </label>
                                <textarea
                                  value={item.features?.join("\n") || ""}
                                  onChange={(e) => updateItem(cat.id, sub.id, item.id, "features", e.target.value.split("\n").filter(Boolean))}
                                  className="w-full border border-slate-100 bg-slate-50 rounded p-2 text-xs focus:outline-none focus:border-slate-300"
                                  rows={2}
                                  placeholder="Мөр мөрөөр бичнэ үү..."
                                />
                              </div>

                              <div className="mt-2 border-t border-slate-100 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-[10px] uppercase font-bold text-slate-400">Нэмэлт сонголтууд (Сонгох боломжтой үнэ)</label>
                                  <button onClick={() => addOption(cat.id, sub.id, item.id)} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium bg-blue-50 px-2 py-1 rounded">
                                    <Plus size={12} /> Сонголт нэмэх
                                  </button>
                                </div>
                                
                                {item.options && item.options.length > 0 && (
                                  <div className="space-y-2 mt-2">
                                    {item.options.map(opt => (
                                      <div key={opt.id} className="flex gap-3 items-center bg-white p-2 rounded-xl border border-slate-200 group/opt hover:border-blue-200 hover:shadow-sm transition-all">
                                        <div className="flex-1 bg-slate-50 rounded-lg px-3 py-1.5 border border-transparent focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                          <input
                                            value={opt.name}
                                            onChange={(e) => updateOption(cat.id, sub.id, item.id, opt.id, "name", e.target.value)}
                                            className="w-full text-xs font-semibold border-none focus:outline-none bg-transparent p-0 text-slate-800"
                                            placeholder="Сонголтын нэр (Жнь: Хувилбар 1)"
                                          />
                                        </div>
                                        <div className="w-36 relative bg-slate-50 rounded-lg px-3 py-1.5 border border-transparent focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                          <input
                                            type="text"
                                            value={opt.price ? opt.price.toLocaleString() : ""}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/[^0-9]/g, '');
                                              updateOption(cat.id, sub.id, item.id, opt.id, "price", val ? Number(val) : 0);
                                            }}
                                            className="w-full text-xs font-bold border-none focus:outline-none bg-transparent p-0 pr-4 text-slate-800 text-right"
                                            placeholder="0"
                                          />
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">₮</span>
                                        </div>
                                        <button onClick={() => removeOption(cat.id, sub.id, item.id, opt.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 opacity-0 group-hover/opt:opacity-100 transition-all rounded-md mr-1">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addItem(cat.id, sub.id)} className="w-full border-2 border-dashed border-slate-200 rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                            <Plus size={14} /> Нэгж үйлчилгээ нэмэх
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button onClick={() => addSubCategory(cat.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                      <Plus size={14} /> Дэд хэсэг нэмэх (Subcategory)
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {mglServices.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <Settings className="mx-auto w-10 h-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">Тохиргоо олдсонгүй</h3>
          <p className="text-sm text-slate-500 mt-1">Та "Үндсэн ангилал нэмэх" товчийг дарж шинээр үүсгэнэ үү.</p>
        </div>
      )}
    </div>
  );
}
