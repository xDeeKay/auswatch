import { redirect } from "next/navigation";

export default function ModerateCorrectionsPage() {
  redirect("/moderate?kind=correction");
}
