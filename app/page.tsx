import { redirect } from "next/navigation";
import { getCurrent } from "@/lib/auth";

export default async function Home() {
  const { user, profile } = await getCurrent();
  if (!user) redirect("/login");
  if (!profile) redirect("/no-access");
  redirect(profile.role === "athlete" ? "/me" : "/dashboard");
}
