import { redirect } from "next/navigation";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/home/quotes/${id}?edit=1`);
}
