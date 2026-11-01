

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.D7k-p_s7.js","_app/immutable/chunks/DKqha8kh.js"];
export const stylesheets = ["_app/immutable/assets/0.BbjjBNqw.css"];
export const fonts = [];
