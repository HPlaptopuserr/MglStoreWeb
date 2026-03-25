import type { CardPartner } from "@/lib/sections/types";

type Props = {
  partners: CardPartner[];
  selectedId: string;
  setSelectedId: (id: string) => void;
};

export function CardPartnerSelector({ partners, selectedId, setSelectedId }: Props) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        Байгууллага сонгох
      </label>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
      >
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
