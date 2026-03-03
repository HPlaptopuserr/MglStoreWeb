import { Plus, Minus } from "lucide-react";

export const FAQIcon = ({ isOpen }: { isOpen: boolean }) => (
  <span className="ml-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
    {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
  </span>
);
