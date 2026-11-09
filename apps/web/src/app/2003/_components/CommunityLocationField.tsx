import {
  COMMUNITY_LOCATIONS,
  communityLocationLabel,
  normalizeCommunityLocation,
} from "../community/locations";
export function CommunityLocationField({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const normalized = normalizeCommunityLocation(defaultValue);
  const legacy =
    normalized &&
    !COMMUNITY_LOCATIONS.some((location) => location === normalized);
  return (
    <label htmlFor="city" className="block text-sm font-medium text-slate-700">
      Аймаг / хот
      <select
        id="city"
        name="city"
        defaultValue={normalized}
        autoComplete="address-level1"
        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
      >
        <option value="">Аймаг, хот сонгох</option>
        {COMMUNITY_LOCATIONS.map((location) => (
          <option key={location} value={location}>
            {communityLocationLabel(location)}
          </option>
        ))}
        {legacy && <option value={normalized}>{normalized}</option>}
      </select>
    </label>
  );
}
