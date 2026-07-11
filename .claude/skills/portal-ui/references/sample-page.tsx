"use client";

/**
 * /admin/notifications — a sample page built exclusively from the portal-ui
 * skill to validate the design system is captured correctly.
 *
 * Layout: PageHead + SectionNav + long settings form (StickySave) + a data
 * table showing recent notifications.
 */

import { useDatabase } from "@/lib/db";
import { saveSettings } from "../actions";
import { SectionNav } from "../Sections";
import { StickySave } from "../StickySave";
import { FormModal } from "../Modal";
import {
  PageHead,
  Card,
  Field,
  TextArea,
  Select,
  Check,
  Empty,
  SaveButton,
  DeleteButton,
  Actions,
  adminStyles as s,
} from "../ui";

/* ── demo data ─────────────────────────────────────────────────────────── */

const DEMO_NOTIFICATIONS = [
  { id: "1", type: "Email", recipient: "john@example.com", subject: "Welcome aboard!", sentAt: "2 hours ago", status: "delivered" },
  { id: "2", type: "SMS",   recipient: "+1 555-0100",      subject: "Booking confirmed", sentAt: "5 hours ago", status: "delivered" },
  { id: "3", type: "Email", recipient: "sara@example.com", subject: "Intro Call reminder", sentAt: "1 day ago", status: "bounced" },
  { id: "4", type: "Email", recipient: "mike@example.com", subject: "Follow-up", sentAt: "3 days ago", status: "pending" },
];

const STATUS_LABEL: Record<string, string> = {
  delivered: "Delivered",
  bounced:   "Bounced",
  pending:   "Pending",
};

/* status → data-stage mapping for the status badge dot colours */
const STATUS_STAGE: Record<string, "upcoming" | "past" | "cancelled" | "unscheduled"> = {
  delivered: "upcoming",   /* green */
  bounced:   "cancelled",  /* red   */
  pending:   "unscheduled",/* amber  */
};

/* ── page ───────────────────────────────────────────────────────────────── */

export default function NotificationsPage() {
  useDatabase();

  return (
    <>
      {/* ---- page head ------------------------------------------------- */}
      <PageHead
        title="Notifications"
        note="Configure how and when the site sends emails and SMS messages to clients."
      >
        <FormModal
          label="Send test"
          title="Send a test notification"
          description="Sends a sample message to the address below — nothing is stored."
          done="Test sent"
        >
          <form action={saveSettings}>
            <Field
              label="Recipient"
              name="test.recipient"
              type="email"
              placeholder="you@example.com"
              required
            />
            <div style={{ height: 14 }} />
            <Select
              label="Channel"
              name="test.channel"
              options={[
                { value: "email", label: "Email" },
                { value: "sms",   label: "SMS"   },
              ]}
            />
            <Actions>
              <SaveButton label="Send test" />
            </Actions>
          </form>
        </FormModal>
      </PageHead>

      {/* ---- section nav for long form ---------------------------------- */}
      <SectionNav
        items={[
          { id: "email",    label: "Email"    },
          { id: "sms",      label: "SMS"      },
          { id: "triggers", label: "Triggers" },
          { id: "log",      label: "Log"      },
        ]}
      />

      {/* ---- settings form --------------------------------------------- */}
      <form action={saveSettings}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Email settings */}
          <Card title="Email" id="email">
            <div className={s.grid2}>
              <Field
                label="From name"
                name="email.fromName"
                defaultValue="Maniruzzaman"
                hint="Shown in the inbox next to the message."
              />
              <Field
                label="From address"
                name="email.fromAddress"
                type="email"
                defaultValue="hello@example.com"
                hint="Must be verified with your email provider."
              />
            </div>
            <div style={{ height: 14 }} />
            <TextArea
              label="Email signature"
              name="email.signature"
              defaultValue="Best,&#10;Maniruzzaman"
              rows={3}
              hint="Appended to every outgoing email."
            />
          </Card>

          {/* SMS settings */}
          <Card title="SMS" id="sms">
            <div className={s.grid2}>
              <Field
                label="Sender ID"
                name="sms.senderId"
                defaultValue="MySite"
                hint="Up to 11 characters. Not available in all countries."
              />
              <Select
                label="Provider"
                name="sms.provider"
                options={[
                  { value: "twilio",  label: "Twilio"  },
                  { value: "vonage",  label: "Vonage"  },
                  { value: "custom",  label: "Custom"  },
                ]}
              />
              <Field
                label="API key"
                name="sms.apiKey"
                type="password"
                placeholder="sk_…"
              />
              <Field
                label="API secret"
                name="sms.apiSecret"
                type="password"
                placeholder="…"
              />
            </div>
          </Card>

          {/* Trigger settings */}
          <Card title="Triggers" id="triggers" note="Choose which events fire a notification.">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Check label="Booking confirmed — send confirmation to the client" name="trigger.bookingConfirm" defaultChecked />
              <Check label="Booking reminder — 24 hours before the call"         name="trigger.bookingReminder" defaultChecked />
              <Check label="Booking cancelled — notify the client"               name="trigger.bookingCancel" defaultChecked />
              <Check label="New booking — notify me by email"                    name="trigger.ownerAlert" />
            </div>
          </Card>

        </div>

        <StickySave />
      </form>

      {/* ---- notifications log ----------------------------------------- */}
      <Card title="Recent log" note="Last 50 notifications sent." id="log" flush>
        {DEMO_NOTIFICATIONS.length === 0 ? (
          <Empty>No notifications sent yet.</Empty>
        ) : (
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Sent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_NOTIFICATIONS.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <span className={s.pill}>{n.type}</span>
                    </td>
                    <td>{n.recipient}</td>
                    <td>{n.subject}</td>
                    <td className={s.muted}>{n.sentAt}</td>
                    <td>
                      {/* Status badge — mirrors the bookings table pattern */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 9px 3px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          background: STATUS_STAGE[n.status] === "upcoming"
                            ? "var(--ok-bg)"
                            : STATUS_STAGE[n.status] === "cancelled"
                            ? "var(--bad-bg)"
                            : "var(--warn-bg)",
                          color: STATUS_STAGE[n.status] === "upcoming"
                            ? "var(--ok)"
                            : STATUS_STAGE[n.status] === "cancelled"
                            ? "var(--bad)"
                            : "var(--warn)",
                        }}
                      >
                        <i
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "currentColor",
                            display: "block",
                          }}
                        />
                        {STATUS_LABEL[n.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
