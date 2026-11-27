import { CoachView } from "./coach-view";

export default async function CoachPage({ params, searchParams }: PageProps<"/sesuaikan/[id]">) {
  const [{ id }, { dari }] = await Promise.all([params, searchParams]);
  return <CoachView resultId={decodeURIComponent(id)} fromBookmarks={dari === "tersimpan"} />;
}
