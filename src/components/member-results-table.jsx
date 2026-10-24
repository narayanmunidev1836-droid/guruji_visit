"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { personName } from "@/lib/ui-labels";

/**
 * Search result as a table, one row per Member (name, village, district, mobile when the role may see it, number of entries).
 * A click anywhere on the row opens the Member's page, which lists all entries; the name is a real link for keyboard / new-tab use.
 * The table scrolls inside its parent (which must have a fixed height) and keeps its heading row on top.
 */
export function MemberResultsTable({ groups, showMobile }) {
  const router = useRouter();
  return (
    <Table scroll>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Village</Th>
          <Th>District</Th>
          {showMobile && <Th>Mobile</Th>}
          <Th className="text-right">Entries</Th>
        </tr>
      </thead>
      <tbody>
        {groups.map(({ member, count }) => {
          const href = `/haribhagats/${member.id}`;
          return (
            <tr key={member.id} onClick={() => router.push(href)} className="cursor-pointer hover:bg-primary-soft">
              <Td className="font-medium">
                <Link href={href} onClick={(event) => event.stopPropagation()} className="hover:underline">
                  {personName(member)}
                </Link>
              </Td>
              <Td>{member.gam || "-"}</Td>
              <Td>{member.jillo || "-"}</Td>
              {showMobile && <Td className="font-mono text-xs">{member.mobileNo || "-"}</Td>}
              <Td className="text-right">
                <Badge tone="primary">{count}</Badge>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
