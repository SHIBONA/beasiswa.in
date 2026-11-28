import { DevelopmentView, type Filters } from "./development-view";

export const metadata = { title: "Persiapan · beasiswa.in" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Filters live in the URL, so a filtered list can be shared and survives a reload.
export default async function DevelopmentPage({ searchParams }: PageProps<"/development">) {
  const params = await searchParams;
  const filters: Filters = { area: one(params.area), free: one(params.gratis) === "1", q: one(params.q) };
  return <DevelopmentView initial={filters} />;
}
