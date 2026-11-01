import { m as env_invalid } from "./server-errors.js";
// node_modules/.pnpm/@sveltejs+kit@3.1.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.57.3_@typescript-eslint_5d8187a4592f2ae1a3181bc68f16a24d/node_modules/@sveltejs/kit/src/exports/env/index.js
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { DefinedEnvVars, EnvVarConfig } from '@sveltejs/kit/env' */
/**
* Utility for defining [environment variables](https://svelte.dev/docs/kit/environment-variables),
* which are made available via `$app/env/public` and `$app/env/private`.
*
* @example
* ```js
* import { defineEnvVars } from '@sveltejs/kit/env';
* import * as v from 'valibot';
*
* export const variables = defineEnvVars({
* 	API_URL: {
* 		schema: v.pipe(v.string(), v.url())
* 	},
* 	PORT: {
* 		schema: (value) => {
* 			if (value === undefined) return 3000;
* 			const port = Number(value);
* 			if (!Number.isInteger(port)) throw new Error('PORT must be an integer');
* 			return port;
* 		}
* 	}
* });
* ```
*
* @template {Record<string, EnvVarConfig<any>>} T
* @param {T} variables
* @returns {DefinedEnvVars<T>}
*/
function defineEnvVars(variables) {
	/** @type {Record<string, EnvVarConfig<any>>} */
	const normalized = {};
	for (const [name, config] of Object.entries(variables)) normalized[name] = typeof config.schema === "function" && !("~standard" in config.schema) ? {
		...config,
		schema: normalize_env_schema(config.schema)
	} : config;
	return normalized;
}
/**
* @param {(value: string | undefined) => any} fn
* @returns {StandardSchemaV1<string | undefined, any>}
*/
function normalize_env_schema(fn) {
	return { "~standard": { validate(value) {
		let result;
		try {
			result = fn(value);
		} catch (error) {
			return { issues: [{ message: error instanceof Error ? error.message || "Invalid value" : String(error) }] };
		}
		if (result instanceof Promise) return result;
		return { value: result };
	} } };
}
// src/env.ts
var privateValue = { schema: (value) => value || "" };
var variables = defineEnvVars({
	VERCEL: privateValue,
	JUDE_RUNTIME: privateValue,
	JUDE_ENV: privateValue,
	JUDE_DEMO: privateValue,
	JUDE_APP_URL: privateValue,
	JUDE_DATA_DIR: privateValue,
	JUDE_SIMULATION_DELAY: privateValue,
	DATABASE_URL: privateValue,
	ALLOWED_ORIGINS: privateValue,
	SUPABASE_URL: privateValue,
	SUPABASE_SERVICE_ROLE_KEY: privateValue,
	SUPABASE_STORAGE_BUCKET: privateValue,
	AI_PROVIDER: privateValue,
	AWS_REGION: privateValue,
	BEDROCK_MODEL: privateValue,
	BEDROCK_REVIEW_MODEL: privateValue,
	S3_BUCKET: privateValue,
	OPENROUTER_API_KEY: privateValue,
	OPENROUTER_MODEL: privateValue,
	OPENROUTER_EMBEDDING_MODEL: privateValue,
	SPEECHMATICS_API_KEY: privateValue,
	SPEECHMATICS_URL: privateValue,
	PASAL_API_KEY: privateValue,
	VOICE_API_URL: privateValue,
	VOICE_API_TOKEN: privateValue,
	QSTASH_URL: privateValue,
	QSTASH_TOKEN: privateValue,
	QSTASH_CURRENT_SIGNING_KEY: privateValue,
	QSTASH_NEXT_SIGNING_KEY: privateValue,
	CRON_SECRET: privateValue
});
// node_modules/.pnpm/@sveltejs+kit@3.1.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.57.3_@typescript-eslint_5d8187a4592f2ae1a3181bc68f16a24d/node_modules/@sveltejs/kit/src/utils/format.js
/**
* Joins a list as `a`, `a or b` or `a, b or c`, for use in diagnostics
* @param {string[]} items
*/
function join_or(items) {
	return items.length > 1 ? `${items.slice(0, -1).join(", ")} or ${items.at(-1)}` : items[0];
}
/**
* Formats a list with one indented `- item` per line, for use in diagnostics
* @param {string[]} items
*/
function bullet_list(items) {
	return items.map((item) => `  - ${item}`).join("\n");
}
// node_modules/.pnpm/@sveltejs+kit@3.1.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.57.3_@typescript-eslint_5d8187a4592f2ae1a3181bc68f16a24d/node_modules/@sveltejs/kit/src/exports/internal/env.js
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
var MISSING = { message: `Value is missing. If it is optional, add a validator declaring it as such.` };
var BAD_VALIDATOR = { message: "Variable was configured with a validator that does not implement Standard Schema" };
var ASYNC_VALIDATOR = { message: "Variable uses an async validator, which is not supported" };
/**
* @param {Record<string, EnvVarConfig<any> | undefined>} variables
* @param {string | undefined} value
* @param {string} name
* @param {Record<string, StandardSchemaV1.Issue[]>} issues
* @returns
*/
function validate(variables, value, name, issues) {
	const validator = (variables[name] ?? {}).schema;
	if (!validator) {
		if (value === void 0) issues[name] = [MISSING];
		return value;
	}
	if (!validator["~standard"]) {
		issues[name] = [BAD_VALIDATOR];
		return;
	}
	const result = validator["~standard"].validate(value);
	if (result instanceof Promise) {
		issues[name] = [ASYNC_VALIDATOR];
		return;
	}
	if (result.issues) {
		issues[name] = [...result.issues];
		return;
	}
	return result.value;
}
/**
* @param {Record<string, StandardSchemaV1.Issue[]>} issues
*/
function handle_issues(issues) {
	const entries = Object.entries(issues);
	if (entries.length === 0) return;
	const list = entries.map(([name, issues]) => `${name}\n${bullet_list(issues.map((issue) => issue.message))}`).join("\n\n");
	env_invalid({ issues: `\n${list}\n` }, { stackless: true });
}
// .svelte-kit/generated/build/env/config.js
var issues = {};
var dynamic_private_env = {};
var explicit_public_env = {};
var rendered_env = {};
handle_issues(issues);
function set_env(env) {
	const issues = {};
	dynamic_private_env.VERCEL = validate(variables, env.VERCEL, "VERCEL", issues);
	dynamic_private_env.JUDE_RUNTIME = validate(variables, env.JUDE_RUNTIME, "JUDE_RUNTIME", issues);
	dynamic_private_env.JUDE_ENV = validate(variables, env.JUDE_ENV, "JUDE_ENV", issues);
	dynamic_private_env.JUDE_DEMO = validate(variables, env.JUDE_DEMO, "JUDE_DEMO", issues);
	dynamic_private_env.JUDE_APP_URL = validate(variables, env.JUDE_APP_URL, "JUDE_APP_URL", issues);
	dynamic_private_env.JUDE_DATA_DIR = validate(variables, env.JUDE_DATA_DIR, "JUDE_DATA_DIR", issues);
	dynamic_private_env.JUDE_SIMULATION_DELAY = validate(variables, env.JUDE_SIMULATION_DELAY, "JUDE_SIMULATION_DELAY", issues);
	dynamic_private_env.DATABASE_URL = validate(variables, env.DATABASE_URL, "DATABASE_URL", issues);
	dynamic_private_env.ALLOWED_ORIGINS = validate(variables, env.ALLOWED_ORIGINS, "ALLOWED_ORIGINS", issues);
	dynamic_private_env.SUPABASE_URL = validate(variables, env.SUPABASE_URL, "SUPABASE_URL", issues);
	dynamic_private_env.SUPABASE_SERVICE_ROLE_KEY = validate(variables, env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY", issues);
	dynamic_private_env.SUPABASE_STORAGE_BUCKET = validate(variables, env.SUPABASE_STORAGE_BUCKET, "SUPABASE_STORAGE_BUCKET", issues);
	dynamic_private_env.AI_PROVIDER = validate(variables, env.AI_PROVIDER, "AI_PROVIDER", issues);
	dynamic_private_env.AWS_REGION = validate(variables, env.AWS_REGION, "AWS_REGION", issues);
	dynamic_private_env.BEDROCK_MODEL = validate(variables, env.BEDROCK_MODEL, "BEDROCK_MODEL", issues);
	dynamic_private_env.BEDROCK_REVIEW_MODEL = validate(variables, env.BEDROCK_REVIEW_MODEL, "BEDROCK_REVIEW_MODEL", issues);
	dynamic_private_env.S3_BUCKET = validate(variables, env.S3_BUCKET, "S3_BUCKET", issues);
	dynamic_private_env.OPENROUTER_API_KEY = validate(variables, env.OPENROUTER_API_KEY, "OPENROUTER_API_KEY", issues);
	dynamic_private_env.OPENROUTER_MODEL = validate(variables, env.OPENROUTER_MODEL, "OPENROUTER_MODEL", issues);
	dynamic_private_env.OPENROUTER_EMBEDDING_MODEL = validate(variables, env.OPENROUTER_EMBEDDING_MODEL, "OPENROUTER_EMBEDDING_MODEL", issues);
	dynamic_private_env.SPEECHMATICS_API_KEY = validate(variables, env.SPEECHMATICS_API_KEY, "SPEECHMATICS_API_KEY", issues);
	dynamic_private_env.SPEECHMATICS_URL = validate(variables, env.SPEECHMATICS_URL, "SPEECHMATICS_URL", issues);
	dynamic_private_env.PASAL_API_KEY = validate(variables, env.PASAL_API_KEY, "PASAL_API_KEY", issues);
	dynamic_private_env.VOICE_API_URL = validate(variables, env.VOICE_API_URL, "VOICE_API_URL", issues);
	dynamic_private_env.VOICE_API_TOKEN = validate(variables, env.VOICE_API_TOKEN, "VOICE_API_TOKEN", issues);
	dynamic_private_env.QSTASH_URL = validate(variables, env.QSTASH_URL, "QSTASH_URL", issues);
	dynamic_private_env.QSTASH_TOKEN = validate(variables, env.QSTASH_TOKEN, "QSTASH_TOKEN", issues);
	dynamic_private_env.QSTASH_CURRENT_SIGNING_KEY = validate(variables, env.QSTASH_CURRENT_SIGNING_KEY, "QSTASH_CURRENT_SIGNING_KEY", issues);
	dynamic_private_env.QSTASH_NEXT_SIGNING_KEY = validate(variables, env.QSTASH_NEXT_SIGNING_KEY, "QSTASH_NEXT_SIGNING_KEY", issues);
	dynamic_private_env.CRON_SECRET = validate(variables, env.CRON_SECRET, "CRON_SECRET", issues);
	handle_issues(issues);
}
export { join_or as a, set_env as i, explicit_public_env as n, variables as o, rendered_env as r, dynamic_private_env as t };

//# sourceMappingURL=config.js.map