import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { parseArgs } from "node:util";
import { Effect } from "effect";
import { AppLayer } from "@/composition-root";
import { PlanRepositoryPort } from "@/core/ports/plan-repository-port";
import { DayRepositoryPort } from "@/core/ports/day-repository-port";
import { StopRepositoryPort } from "@/core/ports/stop-repository-port";
import { ReadModelPort, googleMapsUrl } from "@/core/ports/read-model-port";
import { validateSlug } from "@/core/validation";

const schemaVersion = 1;

type CliError = {
  readonly type: "invalid_input" | "configuration_error" | "not_found" | "conflict" | "internal_error";
  readonly message: string;
  readonly hint: string;
  readonly exitCode: 1 | 2 | 3 | 5;
};

type Command = {
  readonly command: string;
  readonly summary: string;
  readonly writes: boolean;
};

const commands: readonly Command[] = [
  { command: "plan list", summary: "List travel plans.", writes: false },
  { command: "plan get", summary: "Read an itinerary by slug.", writes: false },
  { command: "plan create", summary: "Create a plan from JSON input.", writes: true },
  { command: "plan update", summary: "Update a plan from JSON input.", writes: true },
  { command: "plan delete", summary: "Preview or delete a plan.", writes: true },
  { command: "day add", summary: "Add a day and its stops from JSON input.", writes: true },
  { command: "day update", summary: "Update a day from JSON input.", writes: true },
  { command: "day remove", summary: "Preview or remove a day.", writes: true },
  { command: "stop add", summary: "Add a stop from JSON input.", writes: true },
  { command: "stop update", summary: "Update a stop from JSON input.", writes: true },
  { command: "stop remove", summary: "Preview or remove a stop.", writes: true },
  { command: "stop audio", summary: "Read a stop's audioguide text.", writes: false },
];

type Options = {
  readonly json?: boolean;
  readonly raw?: boolean;
  readonly select?: string;
  readonly limit?: string;
  readonly input?: string;
  readonly slug?: string;
  readonly day?: string;
  readonly "stop-id"?: string;
  readonly confirm?: string;
  readonly "if-exists"?: string;
  readonly command?: string;
};

function fail(error: CliError): never {
  throw error;
}

function asCliError(error: unknown): CliError {
  if (isCliError(error)) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("DATABASE_URL")) {
    return { type: "configuration_error", message: "DATABASE_URL is required.", hint: "Set DATABASE_URL in .env or .env.local.", exitCode: 3 };
  }
  if (message.includes("NotFoundError") || message.includes("not found")) {
    return { type: "not_found", message, hint: "Check the supplied identifier with 'plan list' or 'plan get'.", exitCode: 5 };
  }
  return { type: "internal_error", message: "The command could not be completed.", hint: "Run again with --debug or inspect the application logs.", exitCode: 1 };
}

function isCliError(value: unknown): value is CliError {
  return typeof value === "object" && value !== null && "type" in value && "exitCode" in value;
}

function emitSuccess(type: string, data: unknown, options: Options, meta: Record<string, unknown> = {}): void {
  const selected = selectFields(data, options.select);
  process.stdout.write(`${JSON.stringify({ ok: true, type, schemaVersion, data: selected, meta })}${options.raw ? "" : "\n"}`);
}

function emitError(error: CliError): void {
  process.stderr.write(`${JSON.stringify({ ok: false, error: { type: error.type, message: error.message, hint: error.hint }, schemaVersion })}\n`);
}

function selectFields(data: unknown, value: string | undefined): unknown {
  if (!value) return data;
  const fields = value.split(",").map((field) => field.trim()).filter(Boolean);
  if (fields.length === 0) fail({ type: "invalid_input", message: "--select requires at least one field.", hint: "Use --select slug,title.", exitCode: 2 });
  const project = (item: unknown) => {
    if (!isRecord(item)) return item;
    return Object.fromEntries(fields.filter((field) => field in item).map((field) => [field, item[field]]));
  };
  return Array.isArray(data) ? data.map(project) : project(data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail({ type: "invalid_input", message: `${name} must be a non-empty string.`, hint: `Provide ${name} in --input JSON.`, exitCode: 2 });
  }
  return value;
}

function requiredNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail({ type: "invalid_input", message: `${name} must be a finite number.`, hint: `Provide ${name} in --input JSON.`, exitCode: 2 });
  }
  return value;
}

async function readInput(input: string | undefined): Promise<Record<string, unknown>> {
  if (!input) fail({ type: "invalid_input", message: "--input is required.", hint: "Pass --input <file|-> with a JSON object.", exitCode: 2 });
  const text = input === "-" ? await readStdin() : await readInputFile(input);
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed)) fail({ type: "invalid_input", message: "Input must be a JSON object.", hint: "Pass one object, not an array.", exitCode: 2 });
    return parsed;
  } catch (error) {
    if (isCliError(error)) throw error;
    fail({ type: "invalid_input", message: "Input is not valid JSON.", hint: "Validate the JSON before retrying.", exitCode: 2 });
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function readInputFile(input: string): Promise<string> {
  const base = resolve(process.cwd());
  const file = resolve(base, input);
  if (relative(base, file).startsWith("..")) {
    fail({ type: "invalid_input", message: "--input must point inside the current directory.", hint: "Use '-' for stdin or run from the input file's directory.", exitCode: 2 });
  }
  try {
    return await readFile(file, "utf8");
  } catch {
    fail({ type: "invalid_input", message: `Cannot read input file '${input}'.`, hint: "Check that the file exists and is readable.", exitCode: 2 });
  }
}

function requireDatabase(): void {
  if (!process.env.DATABASE_URL) {
    fail({ type: "configuration_error", message: "DATABASE_URL is required.", hint: "Set DATABASE_URL in .env or .env.local.", exitCode: 3 });
  }
}

async function run<A>(program: Effect.Effect<A, unknown, any>): Promise<A> {
  return Effect.runPromise((program as any).pipe(Effect.provide(AppLayer)));
}

function getSlug(options: Options): string {
  const slug = requiredString(options.slug, "--slug");
  const result = Effect.runSyncExit(validateSlug(slug));
  if (result._tag === "Failure") {
    fail({ type: "invalid_input", message: "Invalid --slug.", hint: "Use lowercase alphanumeric words separated by hyphens.", exitCode: 2 });
  }
  return slug;
}

function getDayNumber(options: Options): number {
  const day = Number(options.day);
  if (!Number.isInteger(day) || day < 1) {
    fail({ type: "invalid_input", message: "--day must be a positive integer.", hint: "Use --day 1.", exitCode: 2 });
  }
  return day;
}

function getStopId(options: Options): string {
  return requiredString(options["stop-id"], "--stop-id");
}

function requireConfirmation(options: Options, identifier: string, operation: string): boolean {
  if (!options.confirm) return false;
  if (options.confirm !== identifier) {
    fail({ type: "invalid_input", message: `--confirm must equal '${identifier}'.`, hint: `Review the preview then retry with --confirm ${identifier}.`, exitCode: 2 });
  }
  return true;
}

function serializeStop(stop: any, includeDescription = false) {
  return {
    id: stop.id,
    title: stop.title,
    summary: stop.summary ?? null,
    ...(includeDescription ? { description: stop.description } : {}),
    lat: stop.lat,
    lng: stop.lng,
    googleMapsUrl: stop.googleMapsUrl ?? googleMapsUrl(stop.lat, stop.lng),
    links: stop.links ?? [],
    duration: stop.duration ?? null,
    cost: stop.cost ?? null,
    reservation: stop.reservation ?? null,
    bring: stop.bring ?? [],
    bestTime: stop.bestTime ?? null,
    warnings: stop.warnings ?? [],
    alternative: stop.alternative ?? null,
    audioUrl: stop.audioUrl ?? null,
    photo: stop.photo ?? null,
    visited: stop.visited ?? false,
  };
}

function serializePlan(plan: any, includeDescription = false) {
  return {
    slug: plan.slug,
    title: plan.title,
    description: plan.description,
    startDate: plan.startDate ? new Date(plan.startDate).toISOString().slice(0, 10) : null,
    days: (plan.days ?? []).map((day: any) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      stops: (day.stops ?? []).map((stop: any) => serializeStop(stop, includeDescription)),
    })),
  };
}

async function dispatch(parts: readonly string[], options: Options): Promise<{ type: string; data: unknown; meta?: Record<string, unknown> }> {
  const command = parts.join(" ");
  if (command === "commands") return { type: "command_catalog", data: commands };
  if (command === "schema") {
    if (!options.command) return { type: "command_schema", data: { schemaVersion, commands } };
    const definition = commands.find((item) => item.command === options.command);
    if (!definition) {
      fail({ type: "invalid_input", message: `Unknown command '${options.command}'.`, hint: "Run 'turistguide-maps commands --json'.", exitCode: 2 });
    }
    return {
      type: "command_schema",
      data: {
        ...definition,
        arguments: commandArguments(definition.command),
        input: commandArguments(definition.command).includes("--input") ? { type: "object", via: "--input <file|->" } : undefined,
      },
    };
  }

  requireDatabase();
  if (command === "plan list") {
    const limit = options.limit === undefined ? 50 : Number(options.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      fail({ type: "invalid_input", message: "--limit must be an integer between 1 and 100.", hint: "Use --limit 50.", exitCode: 2 });
    }
    const plans = await run(Effect.gen(function* () {
      const repository = yield* PlanRepositoryPort;
      return yield* repository.listPlans({ archived: false });
    }));
    return { type: "plan_list", data: plans.slice(0, limit), meta: { limit, returned: Math.min(plans.length, limit) } };
  }

  if (command === "plan get") {
    const plan = await run(Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      return yield* readModel.getPlanReadModelBySlug(getSlug(options));
    }));
    return { type: "plan", data: serializePlan(plan) };
  }

  if (command === "stop audio") {
    const stop = await run(Effect.gen(function* () {
      const repository = yield* StopRepositoryPort;
      return yield* repository.getStopById(getStopId(options));
    }));
    return { type: "stop_audio", data: { id: stop.id, title: stop.title, description: stop.description, audioUrl: stop.audioUrl ?? null } };
  }

  if (command === "plan create") {
    const input = await readInput(options.input);
    const slug = requiredString(input.slug, "slug");
    const title = requiredString(input.title, "title");
    const plan = await run(Effect.gen(function* () {
      const repository = yield* PlanRepositoryPort;
      return yield* repository.createPlan({
        slug,
        title,
        description: typeof input.description === "string" ? input.description : "",
        startDate: typeof input.startDate === "string" ? new Date(input.startDate) : null,
      });
    }));
    return { type: "plan", data: plan };
  }

  if (command === "plan update") {
    const input = await readInput(options.input);
    const slug = getSlug(options);
    const plan = await run(Effect.gen(function* () {
      const repository = yield* PlanRepositoryPort;
      const readModel = yield* ReadModelPort;
      const current = yield* repository.getPlanBySlug(slug);
      const updated = yield* repository.updatePlan(current.id, {
        ...(typeof input.title === "string" ? { title: input.title } : {}),
        ...(typeof input.description === "string" ? { description: input.description } : {}),
        ...(input.startDate === null || typeof input.startDate === "string" ? { startDate: input.startDate === null ? null : new Date(input.startDate) } : {}),
        ...(typeof input.archived === "boolean" ? { archivedAt: input.archived ? new Date() : null } : {}),
      });
      void updated;
      return yield* readModel.getPlanReadModelBySlug(slug);
    }));
    return { type: "plan", data: serializePlan(plan, true) };
  }

  if (command === "plan delete") {
    const slug = getSlug(options);
    if (!requireConfirmation(options, slug, command)) return { type: "plan_delete_preview", data: { slug, confirm: slug } };
    await run(Effect.gen(function* () {
      const repository = yield* PlanRepositoryPort;
      const plan = yield* repository.getPlanBySlug(slug);
      yield* repository.deletePlan(plan.id);
    }));
    return { type: "plan_deleted", data: { slug } };
  }

  if (command === "day add") {
    const input = await readInput(options.input);
    const slug = getSlug(options);
    const dayNumber = requiredNumber(input.dayNumber, "dayNumber");
    const stops = Array.isArray(input.stops) ? input.stops : [];
    const result = await run(Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      const dayRepository = yield* DayRepositoryPort;
      const stopRepository = yield* StopRepositoryPort;
      const plan = yield* readModel.getPlanReadModelBySlug(slug);
      if (plan.days.some((day: any) => day.dayNumber === dayNumber)) {
        return yield* Effect.fail(new Error(`Day ${dayNumber} already exists.`));
      }
      const day = yield* dayRepository.createDay({ planId: plan.id, dayNumber, title: typeof input.title === "string" ? input.title : undefined, description: typeof input.description === "string" ? input.description : undefined });
      const createdStops = [];
      for (const [index, value] of stops.entries()) {
        if (!isRecord(value)) fail({ type: "invalid_input", message: "Each stop must be a JSON object.", hint: "Correct the stops array.", exitCode: 2 });
        createdStops.push(yield* stopRepository.createStop(stopInput(value, day.id, index + 1)));
      }
      return { day, stops: createdStops };
    }));
    return { type: "day", data: { dayNumber: result.day.dayNumber, title: result.day.title, description: result.day.description, stops: result.stops.map((stop) => serializeStop(stop, true)) } };
  }

  if (command === "day update") {
    const input = await readInput(options.input);
    const slug = getSlug(options);
    const dayNumber = getDayNumber(options);
    const updated = await run(Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      const dayRepository = yield* DayRepositoryPort;
      const plan = yield* readModel.getPlanReadModelBySlug(slug);
      const day = plan.days.find((item: any) => item.dayNumber === dayNumber);
      if (!day) return yield* Effect.fail(new Error(`Day ${dayNumber} not found.`));
      return yield* dayRepository.updateDay(day.id, {
        ...(input.title === null || typeof input.title === "string" ? { title: input.title } : {}),
        ...(input.description === null || typeof input.description === "string" ? { description: input.description } : {}),
      });
    }));
    return { type: "day", data: updated };
  }

  if (command === "day remove") {
    const slug = getSlug(options);
    const dayNumber = getDayNumber(options);
    const identifier = `${slug}:day:${dayNumber}`;
    if (!requireConfirmation(options, identifier, command)) return { type: "day_remove_preview", data: { slug, dayNumber, confirm: identifier } };
    await run(Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      const dayRepository = yield* DayRepositoryPort;
      const plan = yield* readModel.getPlanReadModelBySlug(slug);
      const day = plan.days.find((item: any) => item.dayNumber === dayNumber);
      if (!day) return yield* Effect.fail(new Error(`Day ${dayNumber} not found.`));
      yield* dayRepository.deleteDay(day.id);
    }));
    return { type: "day_removed", data: { slug, dayNumber } };
  }

  if (command === "stop add") {
    const input = await readInput(options.input);
    const slug = getSlug(options);
    const dayNumber = getDayNumber(options);
    const stop = await run(Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      const stopRepository = yield* StopRepositoryPort;
      const plan = yield* readModel.getPlanReadModelBySlug(slug);
      const day = plan.days.find((item: any) => item.dayNumber === dayNumber);
      if (!day) return yield* Effect.fail(new Error(`Day ${dayNumber} not found.`));
      if (day.stops.some((item: any) => item.title === input.title)) return yield* Effect.fail(new Error(`Stop '${String(input.title)}' already exists.`));
      return yield* stopRepository.createStop(stopInput(input, day.id, day.stops.length + 1));
    }));
    return { type: "stop", data: serializeStop(stop, true) };
  }

  if (command === "stop update") {
    const input = await readInput(options.input);
    const slug = getSlug(options);
    const dayNumber = getDayNumber(options);
    const stopId = getStopId(options);
    const stop = await run(Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      const stopRepository = yield* StopRepositoryPort;
      const plan = yield* readModel.getPlanReadModelBySlug(slug);
      const day = plan.days.find((item: any) => item.dayNumber === dayNumber);
      if (!day || !day.stops.some((item: any) => item.id === stopId)) return yield* Effect.fail(new Error(`Stop ${stopId} not found in day ${dayNumber}.`));
      return yield* stopRepository.updateStop(stopId, stopUpdateInput(input));
    }));
    return { type: "stop", data: serializeStop(stop, true) };
  }

  if (command === "stop remove") {
    const slug = getSlug(options);
    const dayNumber = getDayNumber(options);
    const stopId = getStopId(options);
    if (!requireConfirmation(options, stopId, command)) return { type: "stop_remove_preview", data: { slug, dayNumber, stopId, confirm: stopId } };
    await run(Effect.gen(function* () {
      const readModel = yield* ReadModelPort;
      const stopRepository = yield* StopRepositoryPort;
      const plan = yield* readModel.getPlanReadModelBySlug(slug);
      const day = plan.days.find((item: any) => item.dayNumber === dayNumber);
      if (!day || !day.stops.some((item: any) => item.id === stopId)) return yield* Effect.fail(new Error(`Stop ${stopId} not found in day ${dayNumber}.`));
      yield* stopRepository.deleteStop(stopId);
    }));
    return { type: "stop_removed", data: { slug, dayNumber, stopId } };
  }

  fail({ type: "invalid_input", message: `Unknown command '${command || "(empty)"}'.`, hint: "Run 'turistguide-maps commands --json'.", exitCode: 2 });
}

function stopInput(input: Record<string, unknown>, dayId: string, sortOrder: number) {
  return {
    dayId,
    title: requiredString(input.title, "title"),
    description: requiredString(input.description, "description"),
    summary: typeof input.summary === "string" || input.summary === null ? input.summary : null,
    lat: requiredNumber(input.lat, "lat"),
    lng: requiredNumber(input.lng, "lng"),
    sortOrder,
    links: Array.isArray(input.links) ? input.links as any[] : [],
    duration: isRecord(input.duration) || input.duration === null ? input.duration as any : null,
    cost: isRecord(input.cost) || input.cost === null ? input.cost as any : null,
    reservation: typeof input.reservation === "string" || input.reservation === null ? input.reservation : null,
    bring: Array.isArray(input.bring) ? input.bring.filter((item): item is string => typeof item === "string") : [],
    bestTime: typeof input.bestTime === "string" || input.bestTime === null ? input.bestTime : null,
    warnings: Array.isArray(input.warnings) ? input.warnings.filter((item): item is string => typeof item === "string") : [],
    alternative: typeof input.alternative === "string" || input.alternative === null ? input.alternative : null,
    audioUrl: typeof input.audioUrl === "string" || input.audioUrl === null ? input.audioUrl : null,
    photo: isRecord(input.photo) || input.photo === null ? input.photo as any : null,
    visited: typeof input.visited === "boolean" ? input.visited : false,
  };
}

function stopUpdateInput(input: Record<string, unknown>) {
  const writable = ["title", "description", "summary", "lat", "lng", "links", "duration", "cost", "reservation", "bring", "bestTime", "warnings", "alternative", "audioUrl", "photo", "visited"] as const;
  const update: Record<string, unknown> = {};
  for (const key of writable) if (key in input) update[key] = input[key];
  if (Object.keys(update).length === 0) {
    fail({ type: "invalid_input", message: "No writable stop fields were supplied.", hint: "Provide a stop field in --input.", exitCode: 2 });
  }
  return update as any;
}

function commandArguments(command: string): string[] {
  if (command === "plan list") return ["--limit"];
  if (command === "plan get") return ["--slug"];
  if (command === "stop audio") return ["--stop-id"];
  if (command === "plan create") return ["--input"];
  if (command === "plan delete") return ["--slug", "--confirm"];
  if (command === "plan update") return ["--slug", "--input"];
  if (command === "day remove") return ["--slug", "--day", "--confirm"];
  if (command === "day add" || command === "day update") return ["--slug", "--day", "--input"];
  if (command === "stop remove") return ["--slug", "--day", "--stop-id", "--confirm"];
  return ["--slug", "--day", "--stop-id", "--input"];
}

function parse(argv: readonly string[]): { parts: string[]; options: Options } {
  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        json: { type: "boolean" },
        raw: { type: "boolean" },
        select: { type: "string" },
        limit: { type: "string" },
        input: { type: "string" },
        slug: { type: "string" },
        day: { type: "string" },
        "stop-id": { type: "string" },
        confirm: { type: "string" },
        "if-exists": { type: "string" },
        command: { type: "string" },
      },
    });
    return { parts: parsed.positionals, options: parsed.values as Options };
  } catch (error) {
    fail({ type: "invalid_input", message: error instanceof Error ? error.message : "Invalid arguments.", hint: "Run 'turistguide-maps --help'.", exitCode: 2 });
  }
}

function help(): string {
  return `turistguide-maps — agent-first travel itinerary CLI

Usage:
  turistguide-maps commands --json
  turistguide-maps plan list --limit 50
  turistguide-maps plan get --slug tuscany-family-august-2026
  turistguide-maps stop add --slug trip --day 1 --input stop.json

All commands emit JSON. Writes accept --input <file|->. Destructive commands preview first and require --confirm <identifier>.
`;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(help());
    return;
  }
  try {
    const { parts, options } = parse(argv);
    const response = await dispatch(parts, options);
    emitSuccess(response.type, response.data, options, response.meta);
  } catch (error) {
    const cliError = asCliError(error);
    emitError(cliError);
    process.exitCode = cliError.exitCode;
  }
}

void main().then(() => process.exit());
