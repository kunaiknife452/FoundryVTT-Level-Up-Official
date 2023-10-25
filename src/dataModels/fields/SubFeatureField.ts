// @ts-ignore
export default class SubFeature extends foundry.abstract.DataModel {
  static defineSchema() {
    // @ts-ignore
    const { fields } = foundry.data;
    return {
      isValid: fields.BooleanField({ initial: true }),
      isOptional: fields.BooleanField({ initial: false }),
      quantityOverride: fields.NumberField({ initial: 0, integer: true, min: 0 }),
      sourceUuid: fields.StringField({ initial: '' }),
      uuid: fields.StringField({ required: true, initial: '' })
    };
  }
}
