export default defineEventHandler(async (event) => {
  await requireUser(event);
  await revokeToken(event, bearerToken(event)!);
  setResponseStatus(event, 204);
  return null;
});
