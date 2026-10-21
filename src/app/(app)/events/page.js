import { requireUser } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { t } from "@/lib/labels";
import { listEvents } from "@/lib/services/events";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { AddEventForm, EventRowActions } from "@/app/(app)/events/event-forms";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const user = await requireUser();
  const canCreate = can(user, "event.create");
  const canManage = can(user, "event.manage");
  const events = await listEvents();
  const labels = { name: t("eventName"), description: t("description"), add: t("add"), save: t("save"), edit: t("edit") };

  return (
    <>
      <PageHeader
        title={t("events")}
        description="Event names used in the Event Name dropdown. An event that no entry uses can be deleted."
      />

      {canCreate && (
        <Card className="mb-6">
          <CardHeader title="Add an event" />
          <CardBody>
            <AddEventForm labels={labels} />
          </CardBody>
        </Card>
      )}

      {events.length === 0 ? (
        <EmptyState title="No events yet" description={canCreate ? "Add event names (for example Pathramani, Vichran) above." : "An administrator needs to add event names (for example Pathramani, Vichran), or give you the right to."} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("eventName")}</Th>
                <Th>{t("description")}</Th>
                <Th className="text-right">{t("visits")}</Th>
                {canManage && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <Td className="font-medium">{event.name}</Td>
                  <Td className="text-muted">{event.description ?? "-"}</Td>
                  <Td className="text-right tabular-nums">{event._count.visits}</Td>
                  {canManage && (
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EventRowActions event={{ id: event.id, name: event.name, description: event.description }} labels={labels} />
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
