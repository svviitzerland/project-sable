# Architecture

The frontend (`fe/`) is a Next.js App Router application. The backend (`be/`) is a FastAPI application served by Uvicorn. During development, Next.js rewrites `/api/:path*` to `API_INTERNAL_URL`, which defaults to `http://127.0.0.1:8000`. Browser code can therefore request `/api/v1/...` on the frontend origin.

The starter has one Pydantic response model and one endpoint, `GET /api/v1/health`. Add feature routes and models inside `be/app/` as the product takes shape. FastAPI publishes OpenAPI at `/openapi.json` and interactive docs at `/docs`.

The frontend includes a shadcn-compatible `components.json`, theme tokens, the `cn` utility, and a Button primitive. Add other components with the shadcn CLI from `fe/`. Keep browser and server code separate using Next.js's server and client component boundaries.

Deployment depends on the project. Set `API_INTERNAL_URL` to the backend's reachable address from the Next.js server. The frontend and backend can be hosted separately; browser requests still go to the frontend origin through the rewrite.
