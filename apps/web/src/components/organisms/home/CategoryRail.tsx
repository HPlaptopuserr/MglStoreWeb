'use client';
import { ShoppingBasket, Coffee, Cookie, UtensilsCrossed, Pill, Home, Sparkles, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

const categories = [
  { name: 'Groceries', icon: ShoppingBasket, color: 'bg-green-50 text-green-600', hover: 'group-hover:bg-green-600 group-hover:text-white' },
  { name: 'Drinks', icon: Coffee, color: 'bg-blue-50 text-blue-600', hover: 'group-hover:bg-blue-600 group-hover:text-white' },
  { name: 'Snacks', icon: Cookie, color: 'bg-yellow-50 text-yellow-600', hover: 'group-hover:bg-yellow-500 group-hover:text-white' },
  { name: 'Prepared Food', icon: UtensilsCrossed, color: 'bg-orange-50 text-orange-600', hover: 'group-hover:bg-orange-500 group-hover:text-white' },
  { name: 'Pharmacy', icon: Pill, color: 'bg-red-50 text-red-600', hover: 'group-hover:bg-red-500 group-hover:text-white' },
  { name: 'Household', icon: Home, color: 'bg-teal-50 text-teal-600', hover: 'group-hover:bg-teal-500 group-hover:text-white' },
  { name: 'Personal Care', icon: Sparkles, color: 'bg-pink-50 text-pink-600', hover: 'group-hover:bg-pink-500 group-hover:text-white' },
  { name: 'Electronics', icon: Smartphone, color: 'bg-purple-50 text-purple-600', hover: 'group-hover:bg-purple-500 group-hover:text-white' },
];

export default function Categories() {
  return (
    <div className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Shop by Category</h2>
          <p className="text-lg text-gray-500">Find exactly what you need from our partner network</p>
        </motion.div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-6">
          {categories.map((cat, index) => (
            <motion.button 
              key={cat.name} 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all group border border-transparent hover:border-gray-100"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${cat.color} ${cat.hover}`}>
                <cat.icon className="w-7 h-7" />
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900">{cat.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
