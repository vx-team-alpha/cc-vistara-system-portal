"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRoleAction } from "@/server/admin/actions";

type Role = "admin" | "user";

export function RoleSelect({
  targetId,
  currentRole,
  isSelf,
}: {
  targetId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>(currentRole as Role);
  const [error, setError] = useState("");

  function handleChange(newRole: Role) {
    setError("");

    startTransition(async () => {
      try {
        const result = await updateRoleAction({ targetId, role: newRole });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRole(newRole);
      } catch {
        setError("Failed to update role.");
      }
    });
  }

  if (isSelf) {
    return (
      <Badge
        variant={role === "admin" ? "lime" : "secondary"}
        className="text-xs"
        title="You cannot change your own role"
      >
        {role} (you)
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={role} onValueChange={(val) => handleChange(val as Role)} disabled={pending}>
        <SelectTrigger aria-label="Change user role" className="h-8 w-28 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="user">user</SelectItem>
          <SelectItem value="admin">admin</SelectItem>
        </SelectContent>
      </Select>
      {error && <small className="text-xs text-destructive">{error}</small>}
    </div>
  );
}
