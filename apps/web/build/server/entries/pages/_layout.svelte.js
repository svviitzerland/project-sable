import { s as head } from "../../chunks/server2.js";
// src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	let { children } = $$props;
	head("12qhfyh", $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>Jude — Evidence-grounded courtroom intelligence</title>`);
		});
		$$renderer.push(`<meta name="description" content="Stay with the testimony. See the whole story. Meet Jude, an evidence-grounded AI courtroom copilot being built for Indonesian legal professionals."/>`);
	});
	children($$renderer);
	$$renderer.push(`<!---->`);
}
export { _layout as default };

//# sourceMappingURL=_layout.svelte.js.map