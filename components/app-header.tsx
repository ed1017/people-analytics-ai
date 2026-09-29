import type { Persona } from "@/lib/types";

type AppHeaderProps = {
  selectedPersona: Persona;
  onPersonaChange: (persona: Persona) => void;
};

export function AppHeader({
  selectedPersona,
  onPersonaChange,
}: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>
        <h1 className="text-xl font-semibold">
          People Analytics AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Workforce Intelligence
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          View as
        </span>

        <select
          value={selectedPersona}
          onChange={(event) =>
            onPersonaChange(
              event.target.value as Persona
            )
          }
          className="h-10 min-w-32 cursor-pointer rounded-md border border-input bg-background px-3 pr-8 text-sm font-medium shadow-sm outline-none"
          aria-label="Select persona"
        >
          <option value="HR">HR</option>
          <option value="Leader">Leader</option>
          <option value="Finance">Finance</option>
        </select>
      </div>
    </header>
  );
}
