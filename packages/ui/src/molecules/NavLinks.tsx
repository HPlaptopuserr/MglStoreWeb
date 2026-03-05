import React from 'react';
import Link from 'next/link';

const links = [
  { label: 'All Categories', href: '#' },
  { label: 'Meat', href: '#' },
  { label: 'Dairy', href: '#' },
  { label: 'Produce', href: '#' },
  { label: 'Bakery', href: '#' },
  { label: 'Deals', href: '#', highlight: true },
];

export const NavLinks = () => {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {links.map((link) => (
        <Link 
          key={link.label} 
          href={link.href}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            link.highlight 
              ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-amber-600'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
};
