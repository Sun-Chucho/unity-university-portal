import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel } from "@/components/portal";
import { supabase } from "@/integrations/supabase/client";
import { errorText } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/student/profile")({
  component: Profile,
});

function Profile() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const [phone, setPhone] = useState(me.profile?.phone ?? "");
  const [address, setAddress] = useState(me.profile?.address ?? "");

  // Students can only touch contact details. A database trigger blocks everything else.
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ phone: phone.trim().slice(0, 30), address: address.trim().slice(0, 240) }).eq("id", me.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e) => toast.error(errorText(e)),
  });

  return (
    <>
      <PageHeader title="Profile" description="Your name and academic details are managed by your department." />
      <Panel className="max-w-xl">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={me.profile?.full_name ?? ""} disabled className="rounded-xl" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={me.email} disabled className="rounded-xl" /></div>
          <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" /></div>
          <div className="space-y-1.5"><Label htmlFor="address">Address</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" /></div>
          <Button type="submit" variant="hero" disabled={save.isPending}>Save changes</Button>
        </form>
      </Panel>
    </>
  );
}
