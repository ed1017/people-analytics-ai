/** Ephemeral lifecycle for an internal selection harness; no persistence or public UI entry. */
export function createWorkforceSelectionSession<Context, Proposal>(verify: (context: Context, snapshot: unknown, ids: string[]) => Promise<Proposal>) {
  let context: Context | undefined, identity = "", generation = 0;
  let state: {status: "idle" | "checking" | "staged" | "rejected"; proposal: Proposal | null} = {status: "idle", proposal: null};
  const cancel = () => {generation++; state = {status: "idle", proposal: null}};
  return {
    // Call on every goal/evidence/input publication, including A → B → A transitions.
    setContext(next: Context) {
      const nextIdentity = JSON.stringify(next);
      if (nextIdentity !== identity) cancel();
      context = structuredClone(next); identity = nextIdentity;
    },
    cancel,
    getState: () => structuredClone(state),
    async select(snapshot: unknown, ids: string[]) {
      cancel();
      if (context === undefined) {state = {status: "rejected", proposal: null}; return false}
      const ticket = generation;
      state = {status: "checking", proposal: null};
      try {
        const proposal = await verify(structuredClone(context), structuredClone(snapshot), [...ids]);
        if (ticket === generation) {state = {status: "staged", proposal: structuredClone(proposal)}; return true}
      } catch {
        if (ticket === generation) state = {status: "rejected", proposal: null};
      }
      return false;
    },
  };
}
