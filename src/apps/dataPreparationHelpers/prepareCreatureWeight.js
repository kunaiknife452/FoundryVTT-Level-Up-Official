export default function prepareCreatureWeight(actor) {
  return [CONFIG.A5E.actorWeights[actor.system.traits.weight]].map((weight) => game.i18n.localize(weight));
}
