"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, deleteJson, patchJson, postJson } from "@/lib/api-client";
import { CHURCHES, type Church } from "@/lib/churches";
import { slugify } from "@/lib/codes";
import type { Attendee } from "@/lib/types";

const fieldClass = "h-11 bg-card px-3 text-base md:text-base";

export function AdminPeople({ attendees }: { attendees: Attendee[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return attendees;
    return attendees.filter((attendee) =>
      [attendee.name, attendee.church, attendee.code]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [attendees, query]);

  async function run(task: () => Promise<string>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await task());
      router.refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That didn't save.");
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-2xl tracking-tight">Add someone</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          They get an 8-character code and a QR as soon as they&apos;re on the list.
        </p>
        <AddForm
          pending={pending}
          onAdd={async (input) => {
            const saved = await run(async () => {
              await postJson("/api/admin/attendees", input);
              return `Added ${input.name.trim()}.`;
            });
            return saved;
          }}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-2xl tracking-tight">Import a CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Columns: name, fun_fact, church. Church is DMTC, CMTC, or STMTC. Name and church are required.
        </p>
        <a href="/attendees-template.csv" className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Download a template
        </a>
        <CsvForm
          pending={pending}
          onImport={(csv) =>
            run(async () => {
              const result = await postJson<{ added: number; errors: string[] }>("/api/admin/import", { csv });
              const extra = result.errors.length ? ` ${result.errors.join(" ")}` : "";
              return `Imported ${result.added} ${result.added === 1 ? "person" : "people"}.${extra}`;
            })
          }
        />
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await postJson<{ added: number }>("/api/admin/sample", {});
              return result.added === 0
                ? "The sample room is already loaded."
                : `Added ${result.added} sample attendees.`;
            })
          }
        >
          Load sample attendees
        </Button>
      </section>

      {message ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">
            {attendees.length} {attendees.length === 1 ? "person" : "people"}
          </h2>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, church, or code"
          aria-label="Search attendees"
          className={fieldClass}
        />
        {attendees.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            The room is empty. Add people or load a sample room before you print badges.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one matches that search.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((attendee) => (
              <li key={attendee.id} className="rounded-2xl border border-border bg-card p-3">
                {editing === attendee.id ? (
                  <EditForm
                    attendee={attendee}
                    pending={pending}
                    onCancel={() => setEditing(null)}
                    onSave={(input) =>
                      run(async () => {
                        await patchJson(`/api/admin/attendees/${attendee.id}`, input);
                        setEditing(null);
                        return `Updated ${input.name.trim()}. The QR code stays the same.`;
                      })
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {attendee.name}
                        {attendee.church ? (
                          <span className="ml-2 text-xs font-medium tracking-[0.14em] text-primary uppercase">
                            {attendee.church}
                          </span>
                        ) : null}
                      </p>
                      {attendee.church ? null : (
                        <p className="truncate text-sm text-muted-foreground">No church yet</p>
                      )}
                      <p className="mt-1 font-mono text-xs tracking-[0.16em]">{attendee.code}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
                        href={`/api/admin/qr/${attendee.code}`}
                        download={`${slugify(attendee.name)}-${attendee.code}.png`}
                      >
                        PNG
                      </a>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(attendee.id)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`Remove ${attendee.name} and their meetings?`)) return;
                          void run(async () => {
                            await deleteJson(`/api/admin/attendees/${attendee.id}`);
                            return `Removed ${attendee.name}.`;
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AddForm({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (input: { name: string; company: string; title: string; church: Church; funFact: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [church, setChurch] = useState<Church | "">("");
  const [funFact, setFunFact] = useState("");

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!church) return;
        const saved = await onAdd({ name, company: "", title: "", church, funFact });
        if (!saved) return;
        setName("");
        setChurch("");
        setFunFact("");
      }}
    >
      <Field id="add-name" label="Name" value={name} onChange={setName} required />
      <ChurchField id="add-church" value={church} onChange={setChurch} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="add-fact">Fun fact</Label>
        <Textarea
          id="add-fact"
          value={funFact}
          onChange={(event) => setFunFact(event.target.value)}
          placeholder="Optional. Shows up when someone scans this badge."
          className="min-h-20 bg-background text-base md:text-base"
        />
      </div>
      <Button type="submit" disabled={pending} className="h-11">
        Add attendee
      </Button>
    </form>
  );
}

function EditForm({
  attendee,
  pending,
  onSave,
  onCancel,
}: {
  attendee: Attendee;
  pending: boolean;
  onSave: (input: { name: string; company: string; title: string; church: Church; funFact: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(attendee.name);
  const [church, setChurch] = useState<Church | "">(attendee.church);
  const [funFact, setFunFact] = useState(attendee.funFact);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!church) return;
        onSave({ name, company: attendee.company, title: attendee.title, church, funFact });
      }}
    >
      <Field id={`name-${attendee.id}`} label="Name" value={name} onChange={setName} required />
      <ChurchField id={`church-${attendee.id}`} value={church} onChange={setChurch} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`fact-${attendee.id}`}>Fun fact</Label>
        <Textarea
          id={`fact-${attendee.id}`}
          value={funFact}
          onChange={(event) => setFunFact(event.target.value)}
          className="min-h-20 bg-background text-base md:text-base"
        />
      </div>
      <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground">{attendee.code}</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-10">
          Save
        </Button>
        <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CsvForm({ pending, onImport }: { pending: boolean; onImport: (csv: string) => void }) {
  const [fileName, setFileName] = useState("");

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem("csv");
        const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
        if (!file) return;
        onImport(await file.text());
        event.currentTarget.reset();
        setFileName("");
      }}
    >
      <Label htmlFor="csv-file">CSV file</Label>
      <Input
        id="csv-file"
        name="csv"
        type="file"
        accept=".csv,text/csv"
        className="h-11 bg-background text-sm"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
      />
      <Button type="submit" disabled={pending || !fileName} className="h-11">
        Import attendees
      </Button>
    </form>
  );
}

function ChurchField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Church | "";
  onChange: (value: Church | "") => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Church</Label>
      <select
        id={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value as Church | "")}
        className={`${fieldClass} w-full`}
      >
        <option value="" disabled>
          Choose a church
        </option>
        {CHURCHES.map((church) => (
          <option key={church} value={church}>
            {church}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </div>
  );
}
