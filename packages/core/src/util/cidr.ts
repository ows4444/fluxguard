import ipaddr from 'ipaddr.js';

export function isInCidr(ip: string, cidr: string): boolean {
  const [range, prefix] = ipaddr.parseCIDR(cidr);
  return ipaddr.parse(ip).match(range, prefix);
}
