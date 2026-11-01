import "./internal.js";
import { a as element, g as to_array, i as derived, l as spread_props, o as ensure_array_like, p as fallback, r as attributes, u as getContext } from "./server2.js";
import "./index-server.js";
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/utils/defaultAttributes.js
/**
* @file
* @license @lucide/svelte v1.64.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": 2,
	"stroke-linecap": "round",
	"stroke-linejoin": "round"
};
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/utils/mergeClasses.js
/**
* @file
* @license @lucide/svelte v1.64.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
/**
* Merges classes into a single string
*
* @param {array} classes
* @returns {string} A string of classes
*/
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
	return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/utils/buildLucideIconNode.js
/**
* @file
* @license @lucide/svelte v1.64.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
function isDefined(value) {
	return value !== null && value !== void 0;
}
/**
* Creates a Lucide icon node (an svgson-like format) from a Lucide icon object.
*
* @param icon The icon to build.
* @param params Additional build parameters.
*/
function buildLucideIconNode(icon, params = {}) {
	const attributeNames = params.attributeNames ?? {};
	const getAttributeName = (attributeName) => attributeNames[attributeName] ?? attributeName;
	const viewBoxWidth = icon.size ?? icon.width ?? defaultAttributes["width"];
	const viewBoxHeight = icon.size ?? icon.height ?? defaultAttributes["height"];
	const aliasClassNames = icon.aliases?.filter((alias) => typeof alias === "string" && alias.trim() !== "").map((alias) => `lucide-${alias}`) ?? [];
	const iconClassNames = [...icon.name ? [`lucide-${icon.name}`] : [], ...aliasClassNames];
	const classNamesFromClassName = params.className?.split(" ").filter(Boolean) ?? [];
	const className = params.includeDefaultClasses === false ? mergeClasses(...classNamesFromClassName) : mergeClasses("lucide", ...iconClassNames, ...classNamesFromClassName);
	const calculatedStrokeWidth = params.absoluteStrokeWidth ? Number(params.strokeWidth ?? defaultAttributes["stroke-width"]) * Number(icon.size ?? icon.width ?? defaultAttributes["width"]) / Number(params.size ?? params.width ?? defaultAttributes["width"]) : params.strokeWidth ?? defaultAttributes["stroke-width"];
	return [
		"svg",
		{
			...Object.entries(defaultAttributes).reduce((attrs, [attrName, value]) => {
				attrs[getAttributeName(attrName)] = value;
				return attrs;
			}, {}),
			..."color" in params && params.color && { [getAttributeName("stroke")]: params.color },
			..."size" in params && isDefined(params.size) && {
				[getAttributeName("width")]: params.size,
				[getAttributeName("height")]: params.size
			},
			..."width" in params && isDefined(params.width) && { [getAttributeName("width")]: params.width },
			..."height" in params && isDefined(params.height) && { [getAttributeName("height")]: params.height },
			[getAttributeName("stroke-width")]: calculatedStrokeWidth,
			...className && { [getAttributeName("class")]: className },
			[getAttributeName("viewBox")]: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
			...params.hasA11yProp === false ? { [getAttributeName("aria-hidden")]: "true" } : {},
			..."attributes" in params && params.attributes
		},
		icon.node.map((child) => {
			const [name, attrs, children] = child;
			const nextAttrs = params.nonScalingStroke ? {
				[getAttributeName("vector-effect")]: "non-scaling-stroke",
				...attrs
			} : attrs;
			return children ? [
				name,
				nextAttrs,
				children
			] : [name, nextAttrs];
		})
	];
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/utils/hasA11yProp.js
/**
* @file
* @license @lucide/svelte v1.64.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
/**
* Check if a component has an accessibility prop
*
* @param {object} props
* @returns {boolean} Whether the component has an accessibility prop
*/
var hasA11yProp = (props) => {
	for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	return false;
};
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/context.js
/**
* @file
* @license @lucide/svelte v1.64.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LucideContext = Symbol("lucide-context");
var getLucideContext = () => getContext(LucideContext);
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/Icon.svelte
function Icon($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const globalProps = getLucideContext() ?? {};
		const { color = globalProps.color ?? "currentColor", size = globalProps.size ?? 24, width = size, height = size, strokeWidth = globalProps.strokeWidth ?? 2, absoluteStrokeWidth = globalProps.absoluteStrokeWidth ?? false, nonScalingStroke = globalProps.nonScalingStroke ?? false, iconNode = [], icon = {
			node: iconNode,
			aliases: [],
			size: 24
		}, class: propsClass, children, $$slots, $$events, ...props } = $$props;
		const hasAccessibleProp = derived(() => Boolean(children) || hasA11yProp(props));
		const $$d = derived(() => buildLucideIconNode(icon, {
			color,
			width,
			height,
			strokeWidth,
			absoluteStrokeWidth,
			nonScalingStroke,
			className: mergeClasses("lucide-icon", globalProps.class),
			hasA11yProp: hasAccessibleProp(),
			attributes: props
		})), $$derived_array = derived(() => to_array($$d(), 3)), svgAttributes = derived(() => $$derived_array()[1]), builtIconNode = derived(() => fallback($$derived_array()[2], () => [], true));
		const iconAttributes = derived(() => ({
			...svgAttributes(),
			class: [...svgAttributes().class.split(" "), propsClass]
		}));
		$$renderer.push(`<svg${attributes({ ...iconAttributes() }, void 0, void 0, void 0, 3)}><!--[-->`);
		const each_array = ensure_array_like(builtIconNode());
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let [tag, attrs] = each_array[$$index];
			element($$renderer, tag, () => {
				$$renderer.push(`${attributes({ ...attrs }, void 0, void 0, void 0, 3)}`);
			});
		}
		$$renderer.push(`<!--]-->`);
		children?.($$renderer);
		$$renderer.push(`<!----></svg>`);
	});
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/arrow-right.svelte
var __iconData$5 = {
	"name": "arrow-right",
	"size": 24,
	"node": [["path", { "d": "M5 12h14" }], ["path", { "d": "m12 5 7 7-7 7" }]]
};
__iconData$5.node;
function Arrow_right($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$5 }]));
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/check.svelte
var __iconData$4 = {
	"name": "check",
	"size": 24,
	"node": [["path", { "d": "M20 6 9 17l-5-5" }]]
};
__iconData$4.node;
function Check($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$4 }]));
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/chevron-down.svelte
var __iconData$3 = {
	"name": "chevron-down",
	"size": 24,
	"node": [["path", { "d": "m6 9 6 6 6-6" }]]
};
__iconData$3.node;
function Chevron_down($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$3 }]));
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/file-text.svelte
var __iconData$2 = {
	"name": "file-text",
	"size": 24,
	"node": [
		["path", { "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }],
		["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
		["path", { "d": "M10 9H8" }],
		["path", { "d": "M16 13H8" }],
		["path", { "d": "M16 17H8" }]
	]
};
__iconData$2.node;
function File_text($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$2 }]));
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/menu.svelte
var __iconData$1 = {
	"name": "menu",
	"size": 24,
	"node": [
		["path", { "d": "M4 5h16" }],
		["path", { "d": "M4 12h16" }],
		["path", { "d": "M4 19h16" }]
	]
};
__iconData$1.node;
function Menu($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$1 }]));
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/plus.svelte
var __iconData = {
	"name": "plus",
	"size": 24,
	"node": [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]]
};
__iconData.node;
function Plus($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData }]));
}
export { Check as a, Chevron_down as i, Menu as n, Arrow_right as o, File_text as r, Icon as s, Plus as t };

//# sourceMappingURL=plus.js.map