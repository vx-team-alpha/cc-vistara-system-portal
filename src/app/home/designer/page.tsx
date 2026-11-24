import { redirect } from "next/navigation";

export default function RetiredDesignerPage() {
  redirect("/home/quotes?new=1");
}
