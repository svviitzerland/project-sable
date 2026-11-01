import { dt as resolve } from "../../chunks/internal.js";
import { _ as escape_html, d as attr, i as derived, l as spread_props, o as ensure_array_like, t as attr_class } from "../../chunks/server2.js";
import { a as Check, i as Chevron_down, n as Menu, o as Arrow_right, r as File_text, s as Icon, t as Plus } from "../../chunks/plus.js";
import "../../chunks/index-server.js";
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/arrow-down.svelte
var __iconData$3 = {
	"name": "arrow-down",
	"size": 24,
	"node": [["path", { "d": "M12 5v14" }], ["path", { "d": "m19 12-7 7-7-7" }]]
};
__iconData$3.node;
function Arrow_down($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$3 }]));
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/arrow-up-right.svelte
var __iconData$2 = {
	"name": "arrow-up-right",
	"size": 24,
	"node": [["path", { "d": "M7 7h10v10" }], ["path", { "d": "M7 17 17 7" }]]
};
__iconData$2.node;
function Arrow_up_right($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$2 }]));
}
// node_modules/.pnpm/@lucide+svelte@1.64.0_svelte@5.57.3_@typescript-eslint+types@8.72.1_/node_modules/@lucide/svelte/dist/icons/minus.svelte
var __iconData$1 = {
	"name": "minus",
	"size": 24,
	"node": [["path", { "d": "M5 12h14" }]]
};
__iconData$1.node;
function Minus($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([props, { icon: __iconData$1 }]));
}
({
	"name": "rotate-ccw",
	"size": 24,
	"node": [["path", { "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }], ["path", { "d": "M3 3v5h5" }]]
}).node;
// src/lib/jude-demo.ts
var examples = [
	{
		id: "inconsistency",
		label: "Potential inconsistency",
		shortLabel: "A different account",
		quote: "I arrived at 9:30 PM.",
		earlier: "I arrived shortly after 8:00 PM.",
		time: "00:14:32",
		page: "4",
		finding: "The accounts describe different arrival times.",
		explanation: "The hearing testimony and the earlier statement differ by approximately 90 minutes. That difference may be relevant, but these excerpts alone do not establish why it occurred.",
		verify: "Check whether both statements refer to the same event.",
		question: "When you say you arrived at 9:30 PM, which location and date are you referring to?",
		transcript: [
			"Counsel: What time did you arrive at the warehouse?",
			"Witness: I arrived at 9:30 PM.",
			"Counsel: We will return to the sequence of events in a moment."
		],
		statement: [
			"Investigator: Describe your arrival that evening.",
			"Witness: I arrived shortly after 8:00 PM.",
			"Investigator: Was anyone else present?",
			"Witness: I remember seeing a security guard near the entrance."
		]
	},
	{
		id: "supported",
		label: "Supported",
		shortLabel: "A matching detail",
		quote: "A security guard was at the entrance.",
		earlier: "I remember seeing a security guard near the entrance.",
		time: "00:18:06",
		page: "4",
		finding: "Both accounts place a guard near the entrance.",
		explanation: "The statements are consistent on this specific detail. Agreement between two accounts does not independently establish that the event occurred or verify the rest of the testimony.",
		verify: "Confirm the guard’s identity and whether independent records are available.",
		question: "Can you describe the guard and explain how you recognized them?",
		transcript: [
			"Counsel: Who did you see when you arrived?",
			"Witness: A security guard was at the entrance.",
			"Counsel: Do you remember their name?",
			"Witness: No, I do not."
		],
		statement: [
			"Investigator: Was anyone else present?",
			"Witness: I remember seeing a security guard near the entrance.",
			"Investigator: Did you speak with that person?",
			"Witness: I cannot remember."
		]
	},
	{
		id: "context",
		label: "Context needed",
		shortLabel: "An unresolved question",
		quote: "He handed me the envelope outside.",
		earlier: "We discussed the documents inside the office.",
		time: "00:22:10",
		page: "6",
		finding: "These statements may describe different moments.",
		explanation: "An exchange outside and a discussion inside could both have occurred. The excerpts do not identify the other person or establish the sequence, so an inconsistency cannot be inferred.",
		verify: "Clarify who was present and the order of the two events.",
		question: "Who handed you the envelope, and was that before or after the discussion in the office?",
		transcript: [
			"Counsel: What happened with the envelope?",
			"Witness: He handed me the envelope outside.",
			"Counsel: Please explain who you mean by ‘he’."
		],
		statement: [
			"Investigator: Where did the discussion take place?",
			"Witness: We discussed the documents inside the office.",
			"Investigator: What happened next?",
			"Witness: I do not recall the exact sequence."
		]
	}
];
// src/components/JudeSite.svelte
function JudeSite($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const nav = [
			["How it works", "#how-it-works"],
			["Built on evidence", "#evidence"],
			["Our approach", "#approach"]
		];
		let menuOpen = false;
		let exampleIndex = 0;
		let reviewed = [];
		let example = derived(() => examples[exampleIndex]);
		let isReviewed = derived(() => reviewed.includes(example().id));
		$$renderer.push(`<a class="skip-link" href="#main">Skip to content</a> <main id="main"><div class="hero" id="top"><header class="site-header wrap"><a class="wordmark" href="#top" aria-label="Jude home">jude.</a> <nav class="desktop-nav" aria-label="Main navigation"><!--[-->`);
		const each_array = ensure_array_like(nav);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let [label, href] = each_array[$$index];
			$$renderer.push(`<a${attr("href", `#${href.slice(1)}`)}>${escape_html(label)}</a>`);
		}
		$$renderer.push(`<!--]--> <a${attr("href", resolve("/workspace"))}>Sign in</a> <button class="button button-outline">Explore the demo</button></nav> <button class="menu-toggle"${attr("aria-label", "Open navigation")}${attr("aria-expanded", menuOpen)} aria-controls="mobile-navigation">`);
		$$renderer.push("<!--[-1-->");
		Menu($$renderer, {});
		$$renderer.push(`<!--]--></button> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></header> <div class="hero-content"><div class="hero-copy wrap"><h1>Stay with the testimony. <br/> See the whole story.</h1> <p>An AI courtroom copilot that connects what is said <br class="desktop-break"/> to what the evidence shows.</p> <div class="hero-actions hero-cta"><a class="button button-cream"${attr("href", resolve("/workspace"))}>Open workspace `);
		Arrow_right($$renderer, {
			size: 22,
			strokeWidth: 1.5
		});
		$$renderer.push(`<!----></a> <button class="button button-outline">Explore the demo</button></div> <div class="hero-entry-note">Sign in or create an account to start your first case.</div></div> <div class="hero-evidence paper"><div class="comparison-toolbar"><p class="sample-label">Synthetic example</p> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="comparison"><div class="comparison-statement"><h2>Testimony</h2> <blockquote>“I arrived at <span class="quote-detail"><i class="quote-highlight" aria-hidden="true"></i>9:30 PM.</span>”</blockquote> <button class="source-link">`);
		File_text($$renderer, { "aria-hidden": "true" });
		$$renderer.push(`<!----> <span>Hearing transcript <span class="source-separator">·</span> <span>00:14:32</span></span></button></div> <div class="comparison-finding"><span class="status status-inconsistency">Potential inconsistency</span> <div class="evidence-thread" aria-hidden="true"><span></span> <span></span></div> <p>Check whether both statements <br class="desktop-break"/> refer to the same event.</p></div> <div class="comparison-statement earlier"><h2>Earlier statement</h2> <blockquote>“I arrived shortly <br class="desktop-break"/> after <span class="quote-detail"><i class="quote-highlight" aria-hidden="true"></i>8:00 PM.</span>”</blockquote> <button class="source-link">`);
		File_text($$renderer, { "aria-hidden": "true" });
		$$renderer.push(`<!----> <span>Witness statement <span class="source-separator">·</span> Page 4</span></button></div></div> <span class="comparison-progress" aria-hidden="true"></span></div></div></div> <section class="source-intro wrap" id="evidence" aria-labelledby="source-title"><div><h2 id="source-title">Every finding has a source.</h2> <p>Jude links testimony to case documents, surfaces possible
        inconsistencies, and keeps legal judgment with people.</p></div> <p class="intro-aside">See the exact passages, compare them side by side, and follow the trail
      back to the original documents—so you can ask better questions and build
      stronger arguments.</p></section> <section class="workflow wrap section-space" id="how-it-works" aria-labelledby="workflow-title"><div class="section-heading"><h2 id="workflow-title">Keep your attention <br/> where it matters.</h2> <p>Hear the testimony. Follow the argument. Jude is being built to connect
        the relevant details while you stay with the proceedings.</p></div> <ol class="workflow-list"><li><span class="step-number">01</span> <div><h3>Listen in context.</h3> <p>A searchable transcript brings together what was said, when it was
            said, and who said it. Uncertain speaker identities stay uncertain.</p></div> <span class="workflow-detail">Testimony `);
		Arrow_right($$renderer, { size: 15 });
		$$renderer.push(`<!----> Meaningful statements</span></li> <li><span class="step-number">02</span> <div><h3>Connect the evidence.</h3> <p>Relevant statements are compared with the case materials. Supporting
            passages and potential differences retain their document and page
            references.</p></div> <span class="workflow-detail">Statement `);
		Arrow_right($$renderer, { size: 15 });
		$$renderer.push(`<!----> Source passage</span></li> <li><span class="step-number">03</span> <div><h3>Examine both sides.</h3> <p>Alternative explanations and missing context are considered before a
            finding is presented. You inspect the sources and decide what
            deserves a closer look.</p></div> <span class="workflow-detail">Finding `);
		Arrow_right($$renderer, { size: 15 });
		$$renderer.push(`<!----> Your judgment</span></li></ol></section> <section class="demo-section" id="demo" aria-labelledby="demo-title"><div class="wrap"><div class="section-heading"><div><h2 id="demo-title" tabindex="-1">Look closer. <br/> Follow the source.</h2> <p class="demo-disclosure">An interactive illustration using synthetic case material. <br/> No audio is recorded and no AI analysis runs in this demo.</p></div> <p>A difference is a starting point for a question. Explore how the
          available evidence changes the finding.</p></div> <div class="demo-options" role="group" aria-label="Choose an evidence example"><!--[-->`);
		const each_array_2 = ensure_array_like(examples);
		for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
			let item = each_array_2[index];
			$$renderer.push(`<button${attr("aria-pressed", index === exampleIndex)}><span${attr_class(`option-dot dot-${item.id}`)}></span> ${escape_html(item.shortLabel)} `);
			Arrow_up_right($$renderer, { size: 15 });
			$$renderer.push(`<!----></button>`);
		}
		$$renderer.push(`<!--]--></div> <div class="demo-workspace"><div class="finding-pane" aria-live="polite"><div class="finding-top"><span${attr_class(`status status-${example().id}`)}>${escape_html(example().label)}</span> <span class="small-note">Synthetic case / 001</span></div> <h3>${escape_html(example().finding)}</h3> <div class="demo-quotes"><div><span class="detail-label">In the hearing</span> <blockquote>“${escape_html(example().quote)}”</blockquote> <button class="text-source"${attr("aria-pressed", true)}>`);
		File_text($$renderer, { size: 16 });
		$$renderer.push(`<!----> Transcript · ${escape_html(example().time)} `);
		Arrow_up_right($$renderer, { size: 14 });
		$$renderer.push(`<!----></button></div> <div><span class="detail-label">In the case file</span> <blockquote>“${escape_html(example().earlier)}”</blockquote> <button class="text-source"${attr("aria-pressed", false)}>`);
		File_text($$renderer, { size: 16 });
		$$renderer.push(`<!----> Witness statement · Page ${escape_html(example().page)} `);
		Arrow_up_right($$renderer, { size: 14 });
		$$renderer.push(`<!----></button></div></div> <p class="finding-explanation">${escape_html(example().explanation)}</p> <div class="verification"><span class="detail-label">What to verify</span> <p>${escape_html(example().verify)}</p></div> <button${attr_class(`review-button ${isReviewed() ? "is-reviewed" : ""}`)}${attr("aria-pressed", isReviewed())}>`);
		if (isReviewed()) {
			$$renderer.push("<!--[0-->");
			Check($$renderer, { size: 16 });
		} else {
			$$renderer.push("<!--[-1-->");
			Plus($$renderer, { size: 16 });
		}
		$$renderer.push(`<!--]--> ${escape_html(isReviewed() ? "Marked as reviewed" : "Mark as reviewed")} <span>For this visit only</span></button></div> <aside class="source-pane" aria-label="Original source excerpts"><div class="source-pane-title">`);
		File_text($$renderer, { size: 18 });
		$$renderer.push(`<!----> <h3>At the source</h3> <span>Synthetic</span></div> <div class="source-tabs" role="group" aria-label="Source document"><button${attr("aria-pressed", true)}>Hearing transcript</button> <button${attr("aria-pressed", false)}>Witness statement</button></div> <div class="document-excerpt" aria-live="polite"><div class="document-meta"><span>${escape_html("HEARING RECORD")}</span> <span>${escape_html(example().time)}</span></div> <h4>${escape_html("Examination of the witness")}</h4> <div class="excerpt-lines"><!--[-->`);
		const each_array_3 = ensure_array_like(example().transcript);
		for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
			let line = each_array_3[i];
			$$renderer.push(`<p><span class="line-number" aria-hidden="true">${escape_html(String(i + 1).padStart(2, "0"))}</span> <span>`);
			if (i === 1) $$renderer.push(`<!--[0--><mark>${escape_html(line)}</mark>`);
			else $$renderer.push(`<!--[-1-->${escape_html(line)}`);
			$$renderer.push(`<!--]--></span></p>`);
		}
		$$renderer.push(`<!--]--></div> <p class="excerpt-footnote">Prepared example for demonstration. Not a real case record or
              legal reference.</p></div> <div class="suggested-question"><span class="detail-label">A question to consider</span> <p>${escape_html(example().question)}</p> <button class="text-action">${escape_html("Copy question")} `);
		$$renderer.push("<!--[-1-->");
		Arrow_up_right($$renderer, { size: 15 });
		$$renderer.push(`<!--]--></button> <span class="copy-feedback" role="status">${escape_html("")}</span></div></aside></div> <p class="demo-footer-note">These labels describe the relationship between a statement and the
        available evidence. They do not establish credibility, guilt, or a legal
        conclusion.</p></div></section> <section class="approach wrap section-space" id="approach" aria-labelledby="approach-title"><div class="approach-lead"><h2 id="approach-title">Your judgment. <br/> Better informed.</h2> <p>Built around a simple principle: the person examining the evidence
        should always be able to question the finding.</p> <a href="#questions" class="text-action">A few important questions `);
		Arrow_down($$renderer, { size: 17 });
		$$renderer.push(`<!----></a></div> <div class="principles"><article><span class="principle-icon">`);
		File_text($$renderer, {
			size: 22,
			strokeWidth: 1.3
		});
		$$renderer.push(`<!----></span> <div><h3>Traceable by design.</h3> <p>A substantive finding should retain its source, passage, and
            context. An answer without something to inspect is not enough.</p></div></article> <article><span class="principle-icon">`);
		Minus($$renderer, {
			size: 22,
			strokeWidth: 1.3
		});
		$$renderer.push(`<!----></span> <div><h3>Uncertainty stays visible.</h3> <p>Missing context and insufficient evidence are meaningful results.
            Jude should surface those limits, rather than force a conclusion.</p></div></article> <article><span class="principle-icon">`);
		Check($$renderer, {
			size: 22,
			strokeWidth: 1.3
		});
		$$renderer.push(`<!----></span> <div><h3>People make the decisions.</h3> <p>Jude supports examination and preparation. Professional legal
            judgment and judicial independence remain with people.</p></div></article></div></section> <section class="questions wrap section-space" id="questions" aria-labelledby="questions-title"><h2 id="questions-title">Before we enter <br/> the courtroom.</h2> <div class="faq-list"><details><summary>Who is Jude being built for? `);
		Chevron_down($$renderer, { size: 20 });
		$$renderer.push(`<!----></summary> <p>The first use case is lawyers in Indonesian criminal proceedings. The
          current MVP includes a synthetic hearing and a case workspace.
          Prosecutor and judge workflows would require separate role-specific
          capabilities and safeguards.</p></details> <details><summary>Is this a live courtroom product? `);
		Chevron_down($$renderer, { size: 20 });
		$$renderer.push(`<!----></summary> <p>Jude is intended for evaluation using fictional or authorized material.
          Use it to organize documents, review transcripts and findings, and
          prepare questions. The example hearing lets you explore with fictional
          material. Verify sources and review the results before relying on them
          in a real proceeding.</p></details> <details><summary>Does an inconsistency mean a witness is wrong? `);
		Chevron_down($$renderer, { size: 20 });
		$$renderer.push(`<!----></summary> <p>No. Different accounts can reflect different events, ambiguous
          questions, incomplete context, or other explanations. Jude is intended
          to identify what may warrant examination—not decide whether a witness
          is lying or a defendant is guilty.</p></details> <details><summary>How will Indonesian legal references be used? `);
		Chevron_down($$renderer, { size: 20 });
		$$renderer.push(`<!----></summary> <p>The proposed product will retrieve relevant Indonesian legislation
          through Pasal.id, subject to available permissions. Verified legal
          text must be distinguished from metadata and unverified references.
          This demo does not retrieve or present legal advice.</p></details> <details><summary>Can I upload case documents here? `);
		Chevron_down($$renderer, { size: 20 });
		$$renderer.push(`<!----></summary> <p>The authenticated workspace accepts text-based PDF, DOCX, TXT, and
          Markdown documents, with original downloads and inspectable passages.
          Use synthetic or appropriately authorized material. Scanned PDFs
          require OCR before upload.</p></details></div></section> <section class="closing"><div class="wrap"><h2>Stay present. <br/> See what connects.</h2> <div><p>A closer look at the evidence starts <br/> with a better question.</p> <button class="button button-cream">Explore the demo `);
		Arrow_right($$renderer, { size: 21 });
		$$renderer.push(`<!----></button> <span class="closing-note">Designed for Indonesian legal professionals.</span></div></div></section></main> <footer class="site-footer wrap"><a class="wordmark" href="#top" aria-label="Jude home">jude.</a> <p>Evidence-grounded courtroom intelligence.</p> <span>Product concept · 2026</span> <a href="#top">Back to top `);
		Arrow_up_right($$renderer, { size: 14 });
		$$renderer.push(`<!----></a></footer>`);
	});
}
// src/routes/+page.svelte
function _page($$renderer) {
	JudeSite($$renderer, {});
}
export { _page as default };

//# sourceMappingURL=_page.svelte.js.map