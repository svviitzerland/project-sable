// Run after pnpm build. A copied function cannot resolve dependencies from the workspace.
import { cp, mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const source = resolve(".vercel/output/functions/![-]/catchall.func");
const folder = await mkdtemp(join(tmpdir(), "jude-bundle-"));
try {
  await cp(source, folder, { recursive: true, verbatimSymlinks: true });
  const fixture = await readFile(
    new URL("../tests/fixtures/text.pdf", import.meta.url),
  );
  const module = pathToFileURL(
    join(folder, ".svelte-kit/vercel-tmp/index.js"),
  ).href;
  const script = `
    import assert from 'node:assert/strict';
    const {default:app}=await import(${JSON.stringify(module)});
    let cookie='';
    const call=async(path,method='GET',body)=>{
      const response=await app.fetch(new Request('http://localhost/api/v1'+path,{method,headers:{origin:'http://localhost','x-forwarded-for':'127.0.0.1',...(cookie?{cookie}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)}));
      if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
      const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;
    };
    await call('/auth/register','POST',{email:'bundle@example.test',password:'test-password-123',name:'Bundle test'});
    const record=await call('/cases','POST',{title:'Isolated Vercel bundle'});
    const form=new FormData();form.set('file',new File([Buffer.from('${fixture.toString("base64")}','base64')],'text.pdf',{type:'application/pdf'}));
    const doc=await call('/cases/'+record.id+'/documents','POST',form);
    const chunks=await call('/cases/'+record.id+'/documents/'+doc.id+'/chunks');
    assert.match(chunks[0].text,/Warehouse arrival/);process.stdout.write('PASS: isolated Vercel bundle authenticates, persists and extracts PDF text.');
  `;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      cwd: folder,
      env: {
        ...process.env,
        VERCEL: "",
        JUDE_RUNTIME: "local",
        JUDE_ENV: "development",
        DATABASE_URL: "",
        JUDE_DATA_DIR: join(folder, "data"),
        OPENROUTER_API_KEY: "",
        OPENROUTER_MODEL: "",
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
      encoding: "utf8",
      timeout: 60000,
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, "Isolated Vercel function failed");
  assert.match(result.stdout, /PASS: isolated Vercel bundle/);
} finally {
  await rm(folder, { recursive: true, force: true });
}
