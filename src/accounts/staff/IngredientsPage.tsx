import type { Ingredient, IngredientGroup, Localized } from "@dominos/shared";
import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { useLanguage } from "../../i18n/useLanguage";
import { ApiRequestError } from "../api";
import { errorMessage, useAccountsText } from "../text";
import { keys, staffApi, useGroups, useIngredients, useStaffMutation } from "./api";
import { useStaffText } from "./text";
import {
  Feedback,
  Loaded,
  PageHeader,
  Pill,
  cardClass,
  inputClass,
  labelClass,
  smallButtonClass,
  textButtonClass,
} from "./ui";

const changesIngredients = [keys.allIngredients] as const;
const changesGroups = [keys.groups] as const;

export function IngredientsPage() {
  const t = useStaffText();
  const [showArchived, setShowArchived] = useState(false);
  const groups = useGroups();
  const ingredients = useIngredients(showArchived);

  return (
    <div className="space-y-8">
      <PageHeader title={t.ingredientsTitle} subtitle={t.ingredientsSubtitle} />
      <Loaded query={groups}>
        {(groupList) => (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-6">
              {groupList.length === 0 ? (
                <p className={`${cardClass} text-cream-300/80`}>{t.noGroups}</p>
              ) : (
                <AddIngredient groups={groupList} />
              )}
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="size-5 accent-cheese-400"
                />
                {t.showArchived}
              </label>
              <Loaded query={ingredients}>
                {(list) => <IngredientList groups={groupList} ingredients={list} />}
              </Loaded>
            </div>
            <Groups groups={groupList} />
          </div>
        )}
      </Loaded>
    </div>
  );
}

function AddIngredient({ groups }: { groups: IngredientGroup[] }) {
  const t = useStaffText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const [name, setName] = useState<Localized>({ en: "", sv: "" });
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const add = useStaffMutation(staffApi.createIngredient, changesIngredients);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate({ groupId, name }, { onSuccess: () => setName({ en: "", sv: "" }) });
  };

  return (
    <form onSubmit={submit} className={`${cardClass} space-y-3`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="new-en" className={labelClass}>
            {t.nameEn}
          </label>
          <input
            id="new-en"
            required
            maxLength={40}
            placeholder={t.nameEnPlaceholder}
            value={name.en}
            onChange={(e) => setName({ ...name, en: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-sv" className={labelClass}>
            {t.nameSv}
          </label>
          <input
            id="new-sv"
            required
            maxLength={40}
            placeholder={t.nameSvPlaceholder}
            value={name.sv}
            onChange={(e) => setName({ ...name, sv: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new-group" className={labelClass}>
            {t.group}
          </label>
          <select
            id="new-group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className={inputClass}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name[language]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={add.isPending}>
          {t.addIngredient}
        </Button>
      </div>
      <Feedback error={add.isError ? errorMessage(add.error, a) : null} />
    </form>
  );
}

function IngredientList({
  groups,
  ingredients,
}: {
  groups: IngredientGroup[];
  ingredients: Ingredient[];
}) {
  const { language } = useLanguage();
  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const items = ingredients.filter((i) => i.groupId === group.id);
        if (items.length === 0) return null;
        return (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <h2
              id={`group-${group.id}`}
              className="mb-2 text-xs font-semibold tracking-widest text-cream-300/70 uppercase"
            >
              {group.name[language]}
            </h2>
            <ul className="divide-y divide-white/10 rounded-2xl ring-1 ring-white/10">
              {items.map((ingredient) => (
                <IngredientRow key={ingredient.id} ingredient={ingredient} groups={groups} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function IngredientRow({
  ingredient,
  groups,
}: {
  ingredient: Ingredient;
  groups: IngredientGroup[];
}) {
  const t = useStaffText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ingredient.name);
  const [groupId, setGroupId] = useState(ingredient.groupId);
  const update = useStaffMutation(
    (body: Parameters<typeof staffApi.updateIngredient>[1]) =>
      staffApi.updateIngredient(ingredient.id, body),
    changesIngredients,
  );
  const label = ingredient.name[language];

  if (editing) {
    const save = (e: FormEvent) => {
      e.preventDefault();
      update.mutate({ name, groupId }, { onSuccess: () => setEditing(false) });
    };
    return (
      <li className="px-4 py-3">
        <form onSubmit={save} className="flex flex-wrap items-end gap-2">
          <input
            aria-label={t.nameEn}
            required
            maxLength={40}
            value={name.en}
            onChange={(e) => setName({ ...name, en: e.target.value })}
            className={`${inputClass} w-40 flex-1`}
          />
          <input
            aria-label={t.nameSv}
            required
            maxLength={40}
            value={name.sv}
            onChange={(e) => setName({ ...name, sv: e.target.value })}
            className={`${inputClass} w-40 flex-1`}
          />
          <select
            aria-label={t.group}
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className={`${inputClass} w-36`}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name[language]}
              </option>
            ))}
          </select>
          <button type="submit" className={smallButtonClass} disabled={update.isPending}>
            {t.save}
          </button>
          <button
            type="button"
            className={textButtonClass}
            onClick={() => {
              setName(ingredient.name);
              setGroupId(ingredient.groupId);
              setEditing(false);
            }}
          >
            {t.cancel}
          </button>
        </form>
        <Feedback error={update.isError ? errorMessage(update.error, a) : null} />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
      <div className="min-w-0 flex-1">
        <span className={`font-semibold ${ingredient.archived ? "text-cream-300/60" : ""}`}>
          {ingredient.name.en}
        </span>
        <span className="text-cream-300/60"> · {ingredient.name.sv}</span>
      </div>
      {ingredient.archived ? (
        <>
          <Pill tone="muted">{t.archived}</Pill>
          <button
            type="button"
            className={textButtonClass}
            disabled={update.isPending}
            onClick={() => update.mutate({ archived: false })}
          >
            {t.restore}
          </button>
        </>
      ) : (
        <>
          <label className="flex min-h-10 items-center gap-2 text-sm text-cream-300/80">
            <input
              type="checkbox"
              checked={ingredient.inStock}
              aria-label={t.inStockFor(label)}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ inStock: e.target.checked })}
              className="size-5 accent-basil-400"
            />
            <span aria-hidden="true">{t.inStock}</span>
          </label>
          <button type="button" className={textButtonClass} onClick={() => setEditing(true)}>
            {t.rename}
          </button>
          <button
            type="button"
            className={textButtonClass}
            disabled={update.isPending}
            onClick={() => update.mutate({ archived: true })}
          >
            {t.archive}
          </button>
        </>
      )}
      {update.isError && (
        <div className="basis-full">
          <Feedback error={errorMessage(update.error, a)} />
        </div>
      )}
    </li>
  );
}

function Groups({ groups }: { groups: IngredientGroup[] }) {
  const t = useStaffText();
  const a = useAccountsText();
  const [name, setName] = useState<Localized>({ en: "", sv: "" });
  const add = useStaffMutation(staffApi.createGroup, changesGroups);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate({ name }, { onSuccess: () => setName({ en: "", sv: "" }) });
  };

  return (
    <section aria-labelledby="groups" className={`${cardClass} h-fit space-y-4`}>
      <div>
        <h2 id="groups" className="text-lg font-bold">
          {t.groupsTitle}
        </h2>
        <p className="text-sm text-cream-300/70">{t.groupsHint}</p>
      </div>
      <ul className="divide-y divide-white/10">
        {groups.map((group) => (
          <GroupRow key={group.id} group={group} />
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-2 border-t border-white/10 pt-4">
        <input
          aria-label={t.nameEn}
          required
          maxLength={40}
          placeholder="Meat"
          value={name.en}
          onChange={(e) => setName({ ...name, en: e.target.value })}
          className={inputClass}
        />
        <input
          aria-label={t.nameSv}
          required
          maxLength={40}
          placeholder="Kött"
          value={name.sv}
          onChange={(e) => setName({ ...name, sv: e.target.value })}
          className={inputClass}
        />
        <button type="submit" className={`${smallButtonClass} w-full`} disabled={add.isPending}>
          {t.addGroup}
        </button>
        <Feedback error={add.isError ? errorMessage(add.error, a) : null} />
      </form>
    </section>
  );
}

function GroupRow({ group }: { group: IngredientGroup }) {
  const t = useStaffText();
  const a = useAccountsText();
  const { language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const rename = useStaffMutation(
    (next: Localized) => staffApi.updateGroup(group.id, { name: next }),
    changesGroups,
  );
  const remove = useStaffMutation(() => staffApi.deleteGroup(group.id), changesGroups);
  const removeError =
    remove.error instanceof ApiRequestError && remove.error.code === "conflict"
      ? t.errorGroupNotEmpty
      : remove.isError
        ? errorMessage(remove.error, a)
        : null;

  if (editing) {
    return (
      <li className="py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            rename.mutate(name, { onSuccess: () => setEditing(false) });
          }}
          className="space-y-2"
        >
          <input
            aria-label={t.nameEn}
            required
            maxLength={40}
            value={name.en}
            onChange={(e) => setName({ ...name, en: e.target.value })}
            className={inputClass}
          />
          <input
            aria-label={t.nameSv}
            required
            maxLength={40}
            value={name.sv}
            onChange={(e) => setName({ ...name, sv: e.target.value })}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button type="submit" className={smallButtonClass} disabled={rename.isPending}>
              {t.save}
            </button>
            <button
              type="button"
              className={textButtonClass}
              onClick={() => {
                setName(group.name);
                setEditing(false);
              }}
            >
              {t.cancel}
            </button>
          </div>
          <Feedback error={rename.isError ? errorMessage(rename.error, a) : null} />
        </form>
      </li>
    );
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-semibold">{group.name[language]}</span>
        <button type="button" className={textButtonClass} onClick={() => setEditing(true)}>
          {t.rename}
        </button>
        <button
          type="button"
          className={textButtonClass}
          disabled={remove.isPending}
          onClick={() => remove.mutate(undefined)}
        >
          {t.deleteGroup}
        </button>
      </div>
      <Feedback error={removeError} />
    </li>
  );
}
