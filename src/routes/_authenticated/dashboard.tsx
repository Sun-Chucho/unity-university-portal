import { createFileRoute, redirect } from "@tanstack/react-router";
import { meQuery, ROLE_HOME } from "@/lib/session";

// Sends each person to the home that matches their highest role.
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me?.primary) throw redirect({ to: "/auth" });
    throw redirect({ to: ROLE_HOME[me.primary] });
  },
});
