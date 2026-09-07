export function projectIdFromParams(params) {
  return typeof params?.projectId === 'string' ? params.projectId : '';
}
