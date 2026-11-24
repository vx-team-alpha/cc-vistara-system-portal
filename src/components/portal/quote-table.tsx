import { ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";

import { formatDate } from "./ui";

type Quote = {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  embed_widgets: { name: string } | null;
};

export function QuoteTable({ quotes }: { quotes: Quote[] }) {
  if (!quotes.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-accent3 text-brand-txt-secondary">
          <MessageSquare className="size-6" />
        </div>
        <Typography variant="h3" className="text-title-2 font-bold text-brand-txt-primary">
          No quote queries yet
        </Typography>
        <Typography className="text-body mt-1 max-w-sm text-brand-txt-secondary">
          When a visitor requests a quote from one of your widgets or components, it will appear
          here with contact details.
        </Typography>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/80 bg-brand-backgroundSecondary/50 hover:bg-transparent">
            <TableHead className="py-3.5 pl-6 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Customer
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Component
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Status
            </TableHead>
            <TableHead className="py-3.5 text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Received
            </TableHead>
            <TableHead className="py-3.5 pr-6 text-right text-xs font-semibold tracking-wider text-brand-txt-secondary uppercase">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((q) => (
            <TableRow
              key={q.id}
              className="group border-b border-border/60 transition-colors hover:bg-brand-backgroundMain/40"
            >
              <TableCell className="py-4 pl-6">
                <Link
                  href={`/home/quotes/${q.id}`}
                  className="flex flex-col transition-colors group-hover:text-brand-accent5"
                >
                  <span className="text-body font-semibold text-brand-txt-primary">
                    {q.name || "Unnamed customer"}
                  </span>
                  <span className="text-caption text-brand-txt-secondary">
                    {q.email || "No email address"}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-subtitle py-4 font-medium text-brand-txt-primary">
                {q.embed_widgets?.name || "Direct inquiry"}
              </TableCell>
              <TableCell className="py-4">
                <Badge variant={q.status === "new" ? "lime" : "secondary"}>{q.status}</Badge>
              </TableCell>
              <TableCell className="text-subtitle py-4 text-brand-txt-secondary">
                {formatDate(q.created_at)}
              </TableCell>
              <TableCell className="py-4 pr-6 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 px-2.5 text-brand-txt-secondary hover:bg-brand-accent3 hover:text-brand-txt-primary"
                >
                  <Link
                    href={`/home/quotes/${q.id}`}
                    className="text-caption inline-flex items-center gap-1 font-semibold"
                  >
                    <span>View</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
