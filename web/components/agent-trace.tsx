"use client";

import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { Reveal } from "@/components/transitions";
import { Spinner } from "@/components/ui/spinner";
import {
  Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle,
} from "@/components/ui/trace";

type Props = { steps: { text: string }[]; live: boolean; error?: string | null };

// The agent's steps as a trace. While the search runs every step stays visible and the newest one is marked
// running; once it finishes the steps fold away behind their summary so the results come first.
export function AgentTrace({ steps, live, error }: Props) {
  const lines = (
    <Trace className="gap-2.5">
      {steps.length === 0 && <Line text="Menyiapkan agen…" running />}
      {/* Each step rises in as the poll brings it; steps already shown stay put. */}
      {steps.map((s, i) => <Reveal key={i}><Line text={s.text} running={live && i === steps.length - 1} /></Reveal>)}
      {error && <Line text={error} error />}
    </Trace>
  );
  if (live || error) return lines;
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger className="text-sm pointer-coarse:min-h-11">Tampilkan {steps.length} langkah agen</TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="pt-1">{lines}</TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

function Line({ text, running = false, error = false }: { text: string; running?: boolean; error?: boolean }) {
  return (
    <TraceLine status={error ? "error" : running ? "running" : undefined} className="items-start">
      <TraceIcon className="mt-0.5">
        {error ? <CircleAlertIcon /> : running ? <Spinner aria-hidden="true" /> : <CheckIcon />}
      </TraceIcon>
      {/* Steps are full sentences, so they wrap instead of truncating. */}
      <TraceTitle className="overflow-visible whitespace-normal">{text}</TraceTitle>
    </TraceLine>
  );
}
