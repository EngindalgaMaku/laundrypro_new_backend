import { redirect } from "next/navigation";

// Sign-up and the app introduction live on the start page
export default function OnboardingPage() {
  redirect("/");
}
