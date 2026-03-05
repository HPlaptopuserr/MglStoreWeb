import React from 'react';
import { Leaf } from 'lucide-react';

export const Logo = () => {
  return (
    <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
      <div className="bg-amber-100 p-1.5 rounded-lg text-amber-500">
        <Leaf size={20} strokeWidth={2.5} />
      </div>
      <span>MGL<span className="text-amber-500">Store</span></span>
    </div>
  );
};
