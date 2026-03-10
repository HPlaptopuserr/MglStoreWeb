import React from "react";
import { MapPin, ChevronDown } from "lucide-react";

export const LocationSelector = () => {
  return (
    <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group text-left">
      <div className="bg-amber-50 p-2 rounded-full text-amber-500 group-hover:bg-amber-100 transition-colors">
        <MapPin size={18} />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Delivering to
        </span>
        <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
          <span>Downtown, Seattle</span>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </button>
  );
};
