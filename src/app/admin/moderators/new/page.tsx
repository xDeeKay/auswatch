import { redirect } from "next/navigation";
import { ModeratorRole } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/moderator-access";
import { createModeratorProfile } from "@/lib/actions/admin-moderators";
import { GrantMatrix } from "@/components/GrantMatrix";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Label, Select, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default async function NewModeratorPage() {
  const access = await requireAdmin();
  if (access.status !== "ok") return null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Breadcrumb href="/admin/moderators" label="Back to moderators" />
        <PageHeader title="Add a moderator" />
      </div>

      <form
        action={async (formData: FormData) => {
          "use server";
          const result = await createModeratorProfile(formData);
          if (result.status === "ok") {
            redirect("/admin/moderators");
          }
        }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1">
          <Label>EMAIL</Label>
          <TextInput type="email" name="email" required placeholder="mod@example.com" />
          <p className="text-xs text-parchment/50">
            A new moderator starts with zero access. Grant access below, or leave it for later.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <Label>ROLE</Label>
          <Select name="role" defaultValue={ModeratorRole.moderator} className="max-w-xs">
            <option value={ModeratorRole.moderator}>Moderator (scoped)</option>
            <option value={ModeratorRole.admin}>Admin (unrestricted)</option>
          </Select>
          <p className="text-xs text-parchment/50">
            The grant matrix below only applies to the Moderator role. Admins have full access and ignore it.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>GRANTS</Label>
          <GrantMatrix />
        </div>

        <Button type="submit" className="self-start">
          Create moderator
        </Button>
      </form>
    </>
  );
}
