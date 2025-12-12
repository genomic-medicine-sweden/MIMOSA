export function getLeafOrder(newick, samples) {
  const tokens = newick.match(/[^(),:;]+/g) || [];
  const order = tokens.filter((t) => samples.includes(t));
  return order;
}
