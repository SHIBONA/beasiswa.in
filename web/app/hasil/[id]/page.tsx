import { ResultView } from "./result-view";

export default async function ResultPage({ params }: PageProps<"/hasil/[id]">) {
  const { id } = await params;
  return <ResultView id={decodeURIComponent(id)} />;
}
