import { redirect } from "next/navigation";

export default function NewOrderPage() {
  redirect("/home/quotes?new=1");
}
