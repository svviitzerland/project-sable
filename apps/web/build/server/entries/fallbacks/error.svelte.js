import { _ as escape_html, u as getContext } from "../../chunks/server2.js";
import "../../chunks/index-server.js";
import "../../chunks/server-errors.js";
// node_modules/.pnpm/@sveltejs+kit@3.1.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.57.3_@typescript-eslint_5d8187a4592f2ae1a3181bc68f16a24d/node_modules/@sveltejs/kit/src/runtime/app/state/server.js
function context() {
	return getContext("__request__");
}
var page = {
	get data() {
		return context().page.data;
	},
	get error() {
		return context().page.error;
	},
	get form() {
		return context().page.form;
	},
	get params() {
		return context().page.params;
	},
	get route() {
		return context().page.route;
	},
	get shallow() {
		return context().page.shallow;
	},
	get state() {
		return context().page.state;
	},
	get status() {
		return context().page.status;
	},
	get url() {
		return context().page.url;
	}
};
// node_modules/.pnpm/@sveltejs+kit@3.1.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.57.3_@typescript-eslint_5d8187a4592f2ae1a3181bc68f16a24d/node_modules/@sveltejs/kit/src/runtime/components/error.svelte
function Error($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<h1>${escape_html(page.status)}</h1> <p>${escape_html(page.error?.message)}</p>`);
	});
}
export { Error as default };

//# sourceMappingURL=error.svelte.js.map