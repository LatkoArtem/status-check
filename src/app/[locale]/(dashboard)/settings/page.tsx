"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Briefcase,
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { api } from "~/trpc/react";
import { type UserRole } from "~/server/db/schema";
import { useToast } from "~/store/toast";
import { cn } from "~/lib/utils";

type Tab = "users" | "projects";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { data: currentUser, isLoading } = api.user.me.useQuery();
  const [tab, setTab] = useState<Tab>("users");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-6">
        <Shield className="h-10 w-10 text-muted-foreground opacity-30" />
        <p className="font-medium text-foreground">{t("adminOnly")}</p>
        <p className="text-sm text-muted-foreground">{t("adminOnlyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <TabButton
          active={tab === "users"}
          onClick={() => setTab("users")}
          icon={<Users className="h-3.5 w-3.5" />}
          label={t("users")}
        />
        <TabButton
          active={tab === "projects"}
          onClick={() => setTab("projects")}
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label={t("projects")}
        />
      </div>

      {tab === "users" && <UsersSection currentUserId={currentUser.id} />}
      {tab === "projects" && <ProjectsSection />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 border-b-2 px-4 pb-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Users Section                                                         */
/* ------------------------------------------------------------------ */

function UsersSection({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("errors");
  const { data: users, refetch } = api.user.list.useQuery();
  const toast = useToast();

  const updateRole = api.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success(t("changeRole"));
      void refetch();
    },
    onError: () => toast.error(tCommon("generic")),
  });

  if (!users) {
    return <SectionSkeleton rows={4} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-border/50 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-foreground">
                {u.name}
                {u.id === currentUserId && (
                  <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    You
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
              <td className="px-4 py-3">
                {u.id === currentUserId ? (
                  <RoleBadge role={u.role} />
                ) : (
                  <RoleSelect
                    value={u.role}
                    disabled={updateRole.isPending}
                    onChange={(role) =>
                      updateRole.mutate({ userId: u.id, role })
                    }
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const t = useTranslations("settings.role");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        role === "admin"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {t(role)}
    </span>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled: boolean;
}) {
  const t = useTranslations("settings");
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      <option value="member">{t("role.member")}</option>
      <option value="admin">{t("role.admin")}</option>
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Projects Section                                                      */
/* ------------------------------------------------------------------ */

interface ProjectFormState {
  name: string;
  description: string;
  color: string;
}

const DEFAULT_FORM: ProjectFormState = {
  name: "",
  description: "",
  color: "#3B82F6",
};

function ProjectsSection() {
  const t = useTranslations();
  const { data: projects, refetch } = api.project.list.useQuery();
  const toast = useToast();
  const [modal, setModal] = useState<
    | { isOpen: false }
    | { isOpen: true; editId?: string; form: ProjectFormState }
  >({ isOpen: false });

  const createProject = api.project.create.useMutation({
    onSuccess: () => { toast.success(t("project.created")); void refetch(); closeModal(); },
    onError: () => toast.error(t("errors.generic")),
  });

  const updateProject = api.project.update.useMutation({
    onSuccess: () => { toast.success(t("project.updated")); void refetch(); closeModal(); },
    onError: () => toast.error(t("errors.generic")),
  });

  const deleteProject = api.project.delete.useMutation({
    onSuccess: () => { toast.success(t("project.deleted")); void refetch(); },
    onError: () => toast.error(t("errors.generic")),
  });

  const openCreate = () =>
    setModal({ isOpen: true, form: { ...DEFAULT_FORM } });

  const openEdit = (p: { id: string; name: string; description?: string | null; color: string }) =>
    setModal({
      isOpen: true,
      editId: p.id,
      form: {
        name: p.name,
        description: p.description ?? "",
        color: p.color,
      },
    });

  const closeModal = () => setModal({ isOpen: false });

  const handleSubmit = () => {
    if (!modal.isOpen) return;
    const { name, description, color } = modal.form;
    if (!name.trim()) return;

    if (modal.editId) {
      updateProject.mutate({
        id: modal.editId,
        name: name.trim(),
        description: description.trim() || null,
        color,
      });
    } else {
      createProject.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("project.deleted") + "?")) {
      deleteProject.mutate({ id });
    }
  };

  const updateForm = (patch: Partial<ProjectFormState>) => {
    if (!modal.isOpen) return;
    setModal({ ...modal, form: { ...modal.form, ...patch } });
  };

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {projects?.length ?? 0} {t("project.title").toLowerCase()}
        </span>
        <button
          onClick={openCreate}
          className="flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("project.newProject")}
        </button>
      </div>

      {!projects ? (
        <SectionSkeleton rows={3} />
      ) : projects.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
          {t("project.noProjects")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {projects.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                i !== projects.length - 1 && "border-b border-border/50",
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {p.name}
                </p>
                {p.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {p.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deleteProject.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {modal.editId ? t("project.editProject") : t("project.newProject")}
              </h3>
              <button
                onClick={closeModal}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t("project.name")}
                  <span className="ml-0.5 text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={modal.form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t("project.description")}
                </label>
                <textarea
                  value={modal.form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  rows={2}
                  className="resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t("project.color")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={modal.form.color}
                    onChange={(e) => updateForm({ color: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
                  />
                  <span className="text-xs font-mono text-muted-foreground uppercase">
                    {modal.form.color}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || !modal.form.name.trim()}
                  className="flex h-8 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border border-primary-foreground border-t-transparent" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                        */
/* ------------------------------------------------------------------ */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
      {children}
    </th>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-border/50 px-4 py-3 last:border-0"
        >
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
