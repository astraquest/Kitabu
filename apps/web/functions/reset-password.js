export function onRequest({ request }) {
  const incoming = new URL(request.url);
  const target = new URL('https://app.kitabu.ai/reset-password');
  target.search = incoming.search;
  return Response.redirect(target, 308);
}
