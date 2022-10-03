export interface Env {
  CLOUDFLARE_R2: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env, _: ExecutionContext) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    switch (request.method) {
      case "DELETE":
        await env.CLOUDFLARE_R2.delete(key);
        return new Response("Deleted!");

      case "GET":
        const object = await env.CLOUDFLARE_R2.get(key);

        if (object === null) {
          return new Response("Object Not Found", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);

        return new Response(object.body, {
          headers,
        });

      case "PUT": {
        const contentType = request.headers.get('content-type') || '';

        if (!contentType.includes('form')) {
          return new Response(null, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File) || file.type !== 'image/jpeg' || file.size > 10485760 /* 10MB */) {
          return new Response(null, { status: 400 });
        }

        await env.CLOUDFLARE_R2.put(key, request.body);
        return new Response(null, { status: 200 });
      }

      default:
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            Allow: "PUT, GET, DELETE",
          },
        });
    }
  },
};
