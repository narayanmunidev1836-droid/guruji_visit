import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { listEvents } from "@/lib/services/events";
import { toggleEventAction } from "@/actions/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { AddEventForm, EditEventForm } from "@/app/(app)/events/event-forms";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const user = await requireUser();
  const canManage = can(user, "event.manage");
  const events = await listEvents();
  const labels = { name: t("eventName"), description: t("description"), add: t("add"), save: t("save") };

  return (
    <>
      <PageHeader
        title={t("events")}
        description="Event names used in the Event Name dropdown. Deactivated events disappear from new entries but stay visible on old records."
      />

      {canManage && (
        <Card className="mb-6">
          <CardHeader title="Add an event" />
          <CardBody>
            <AddEventForm labels={labels} />
          </CardBody>
        </Card>
      )}

      {events.length === 0 ? (
        <EmptyState title="No events yet" description="An administrator needs to add event names (for example Pathramani, Vichran)." />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("eventName")}</Th>
                <Th>{t("description")}</Th>
                <Th className="text-right">{t("visits")}</Th>
                <Th>Status</Th>
                {canManage && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className={event.isActive ? "" : "opacity-70"}>
                  <Td className="font-medium">{event.name}</Td>
                  <Td className="text-muted">{event.description ?? "-"}</Td>
                  <Td className="text-right tabular-nums">{event._count.visits}</Td>
                  <Td>
                    <Badge tone={event.isActive ? "success" : "neutral"} dot>
                      {event.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </Td>
                  {canManage && (
                    <Td className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <form action={toggleEventAction}>
                          <input type="hidden" name="id" value={event.id} />
                          <input type="hidden" name="isActive" value={String(!event.isActive)} />
                          <Button type="submit" variant="secondary" size="sm">
                            {event.isActive ? t("deactivate") : t("activate")}
                          </Button>
                        </form>
                        <details className="w-full text-left">
                          <summary className="cursor-pointer text-right text-sm text-primary">{t("edit")}</summary>
                          <div className="mt-3 min-w-[min(100%,36rem)]">
                            <EditEventForm event={event} labels={labels} />
                          </div>
                        </details>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
