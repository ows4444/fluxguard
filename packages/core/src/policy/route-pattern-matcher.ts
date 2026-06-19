import type { CompiledRoutePattern } from './compiled-route-pattern';

export function matchesCompiledPattern(pattern: CompiledRoutePattern, route: string): boolean {
  if (pattern.trailingWildcard) {
    const prefix = pattern.original.slice(0, -3);

    return route === prefix || route.startsWith(`${prefix}/`);
  }

  if (pattern.original === route) {
    return true;
  }

  const routeSegments = route.split('/');

  let i = 0;

  while (i < pattern.segments.length) {
    const patternSegment = pattern.segments[i];

    if (patternSegment === undefined) {
      return false;
    }

    if (patternSegment === '**') {
      return i === pattern.segments.length - 1;
    }

    const routeSegment = routeSegments[i];

    if (routeSegment === undefined) {
      return false;
    }

    if (patternSegment !== routeSegment && !patternSegment.startsWith(':')) {
      return false;
    }

    i++;
  }

  return i === routeSegments.length;
}
