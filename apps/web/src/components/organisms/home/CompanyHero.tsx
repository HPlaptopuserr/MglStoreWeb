import React from 'react';
import Image from 'next/image';
import { MapPin, Clock, Info, Search, Truck, Star, Phone, Globe } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { Badge } from '@/components/atoms/Badge';
import { Company } from '@/lib/mock-data';

interface CompanyHeroProps {
  company: Company;
}

export const CompanyHero = ({ company }: CompanyHeroProps) => {
  return (
    <div className="w-full bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100">
      <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left: Visual Identity */}
        <div className="lg:col-span-5 relative min-h-[300px] lg:h-full rounded-[2rem] overflow-hidden group">
          <Image 
            src={company.banner} 
            alt={company.name} 
            fill 
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative h-16 w-16 rounded-2xl bg-white p-1 shadow-lg">
                <div className="relative h-full w-full rounded-xl overflow-hidden">
                  <Image src={company.logo} alt={company.name} fill className="object-cover" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="text-orange-400 fill-orange-400" size={16} />
                  <span className="font-bold text-lg">{company.rating}</span>
                </div>
                <p className="text-sm text-white/80 font-medium">Trusted by 10k+ locals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Information & Actions */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={company.isOpen ? "default" : "secondary"} className={`px-3 py-1 text-sm ${company.isOpen ? "bg-amber-500" : "bg-slate-100 text-slate-500"}`}>
                {company.isOpen ? "Open Now" : "Closed"}
              </Badge>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Official Store</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">{company.name}</h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl">{company.description}</p>
          </div>

          {/* Info Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/50 transition-colors">
              <div className="p-2 bg-white rounded-full text-amber-500 shadow-sm">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Opening Hours</p>
                <p className="font-semibold text-slate-900">{company.openingHours}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/50 transition-colors">
              <div className="p-2 bg-white rounded-full text-amber-500 shadow-sm">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Delivery Time</p>
                <p className="font-semibold text-slate-900">{company.deliveryTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/50 transition-colors sm:col-span-2">
              <div className="p-2 bg-white rounded-full text-amber-500 shadow-sm">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Address</p>
                <p className="font-semibold text-slate-900">{company.address}</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
            <Input 
              placeholder={`Search products in ${company.name}...`} 
              className="pl-12 h-14 rounded-2xl bg-white border-2 border-slate-100 focus:border-amber-500/50 shadow-sm text-base"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
