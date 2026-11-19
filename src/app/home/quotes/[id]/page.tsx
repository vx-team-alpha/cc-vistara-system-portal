import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { QuoteStatus } from "@/components/portal/quote-status";
import { PageHead, Card, Badge, portalStyles as s, formatDate } from "@/components/portal/ui";
import { getQuote } from "@/server/portal/data";
import type { Json } from "@/types/supabase";
export const metadata = { title: "Query details" };
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const q = await getQuote(id);
  if (!q) notFound();
  const spec = (
    q.spec && typeof q.spec === "object" && !Array.isArray(q.spec) ? q.spec : {}
  ) as Record<string, Json | undefined>;
  const details = [
    ["Product", spec.product],
    ["Range", spec.range],
    ["System", spec.system],
    ["Customer message", spec.message],
    ["Preview", spec.preview],
  ].filter(([, value]) => typeof value === "string" && value);
  const config =
    spec.configuration &&
    typeof spec.configuration === "object" &&
    !Array.isArray(spec.configuration)
      ? spec.configuration
      : {};
  const particulars = Array.isArray(config.particulars)
    ? config.particulars.filter(
        (p): p is { [key: string]: Json | undefined } =>
          !!p && typeof p === "object" && !Array.isArray(p),
      )
    : [];
  return (
    <>
      <PageHead
        title={q.name || "Quote query"}
        note={`Received ${formatDate(q.created_at)} · ${q.embed_widgets?.name || "Direct query"}`}
      >
        <Badge state={q.status}>{q.status}</Badge>
      </PageHead>
      <div className={s.stack}>
        <Link href="/home/quotes" className={s.link}>
          ← All queries
        </Link>
        <div className={s.grid2}>
          <Card title="Contact details">
            <dl className={s.spec}>
              <dt>Name</dt>
              <dd>{q.name || "Not provided"}</dd>
              <dt>Email</dt>
              <dd>
                {q.email ? (
                  <a className={s.link} href={`mailto:${q.email}`}>
                    {q.email}
                  </a>
                ) : (
                  "Not provided"
                )}
              </dd>
              <dt>Phone</dt>
              <dd>{q.phone || "Not provided"}</dd>
            </dl>
          </Card>
          <Card title="Follow-up">
            <QuoteStatus id={q.id} status={q.status} />
          </Card>
        </div>
        <Card
          title="Saved specification"
          note="This is the original submission. Updating the query status does not change it."
        >
          <dl className={s.spec}>
            {details.length ? (
              details.map(([label, value]) => (
                <div key={String(label)}>
                  <dt>{String(label)}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))
            ) : (
              <div>
                <dt>Specification</dt>
                <dd>No product details were included with this query.</dd>
              </div>
            )}
          </dl>
          {particulars.length > 0 && (
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Configuration option</th>
                    <th>Selected value</th>
                  </tr>
                </thead>
                <tbody>
                  {particulars.map((p, index) => (
                    <tr key={index}>
                      <td>{typeof p.question === "string" ? p.question : "Option"}</td>
                      <td>{typeof p.answer === "string" ? p.answer : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
