export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	app_dir: "_app",
	app_path: "_app",
	assets: new Set(["audio/pcm-worklet.js","fonts/Libre-Caslon-Display-OFL.txt","fonts/Manrope-OFL.txt","fonts/Rufina-OFL.txt","fonts/libre-caslon-display.ttf","fonts/manrope-medium.ttf","fonts/manrope-regular.ttf","fonts/manrope-semibold.ttf","fonts/rufina-regular.ttf","icon.svg","images/ivory-paper.prompt.txt","images/ivory-paper.webp","images/ivory-paper.webp.json","images/jude-case-files.prompt.txt","images/jude-case-files.webp","images/jude-case-files.webp.json"]),
	mime_types: {".js":"text/javascript",".txt":"text/plain",".ttf":"font/ttf",".svg":"image/svg+xml",".webp":"image/webp",".json":"application/json"},
	client: {start:"_app/immutable/entry/start.CJs4rftq.js",app:"_app/immutable/entry/app.BaoCvbBd.js",imports:["_app/immutable/entry/start.CJs4rftq.js","_app/immutable/entry/payload.DSmR2FwN.js","_app/immutable/chunks/CRzLMJPS.js","_app/immutable/chunks/BSTN0nHv.js","_app/immutable/chunks/DKqha8kh.js","_app/immutable/chunks/Cyt8LZpN.js","_app/immutable/chunks/C_7sO3kS.js","_app/immutable/entry/app.BaoCvbBd.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
	
	nodes: [
		__memo(() => import('./nodes/0.js')),
		__memo(() => import('./nodes/1.js')),
		__memo(() => import('./nodes/2.js')),
		__memo(() => import('./nodes/3.js'))
	],
	remotes: {
		
	},
	routes: [
		{
			id: "/",
			pattern: /^\/$/,
			params: [],
			page: { layouts: [0,], errors: [1,], leaf: 2 },
			endpoint: null
		},
		{
			id: "/api/v1/[...path]",
			pattern: /^\/api\/v1(?:\/([^]*))?\/?$/,
			params: [{"name":"path","optional":false,"rest":true,"chained":true}],
			page: null,
			endpoint: __memo(() => import('./entries/endpoints/api/v1/_...path_/_server.ts.js'))
		},
		{
			id: "/workspace",
			pattern: /^\/workspace\/?$/,
			params: [],
			page: { layouts: [0,], errors: [1,], leaf: 3 },
			endpoint: null
		}
	],
	prerendered_routes: new Set([]),
	matchers: async () => {
		return {};
	},
	server_assets: {}
}
})();
