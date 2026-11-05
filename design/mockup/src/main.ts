import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
