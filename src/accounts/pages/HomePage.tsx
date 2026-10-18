import type { Me } from "@dominos/shared";
import { useState } from "react";
import { Button } from "../../components/Button";
import { AuthLayout, FormError } from "../components";
import { useSession } from "../useSession";
import { errorMessage, useAccountsText } from "../text";

/** A placeholder for signed-in people until the events screens exist. */
export function HomePage({ me }: { me: Me }) {
  const t = useAccountsText();
  const { signOut } = useSession();
  const [error, setError] = useState<unknown>(null);

  const leave = async () => {
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <AuthLayout title={t.homeGreeting(me.name)} subtitle={t.homeBody}>
      <div className="space-y-6">
        <p className="flex flex-wrap items-center gap-2 text-sm text-cream-300/80">
          {t.signedInAs(me.email)}
          {me.role === "staff" && (
            <span className="rounded-full bg-sauce-500 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-cream-100 uppercase">
              {t.staffBadge}
            </span>
          )}
        </p>
        <FormError message={error === null ? null : errorMessage(error, t)} />
        <Button variant="ghost" className="w-full" onClick={leave}>
          {t.signOut}
        </Button>
      </div>
    </AuthLayout>
  );
}
