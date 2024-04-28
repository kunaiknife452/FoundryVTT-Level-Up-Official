<script>
    import { getContext } from "svelte";
    import { localize } from "#runtime/svelte/helper";

    import Checkbox from "../components/Checkbox.svelte";
    import FieldWrapper from "../components/FieldWrapper.svelte";
    import RadioGroup from "../components/RadioGroup.svelte";
    import Section from "../components/Section.svelte";

    export let { application } = getContext("#external");
    export let { document, appId } = getContext("#external").application;

    const actor = document;

    const restTypeOptions = {
        short: "A5E.RestShort",
        long: "A5E.RestLong",
        extended: "A5E.RestExtended",
    };

    let restType = "short";
    let haven = true;
    let recoverStrifeAndFatigue = true;
    let recoverSetStrifeAndFatigue = 0;
    let consumeSupply = true;
    let diceRemaining = $actor.system.attributes.prof;
    let hitDiceMultiplier = 1;
    let diceRemainingShort = $actor.system.attributes.prof * hitDiceMultiplier;

    async function rollHitDie(dieSize) {
        try {
            await $actor.rollHitDice(dieSize);
        } catch (e) {
            // TODO: Error System - Display a useful error to the user when hit die updates fail
            console.log(e);
            return;
        }
    }

    function onSubmit() {
        const simpleRests = game.settings.get("a5e", "simpleRests");

        application.submit({
            consumeSupply: simpleRests ? false : consumeSupply,
            haven: simpleRests ? true : haven,
            restType,
            recoverStrifeAndFatigue,
            recoverSetStrifeAndFatigue,
            diceRemaining,
            hitDiceMultiplier,
        });
    }

    $: hitDice = $actor.system.attributes.hitDice;
</script>

<form class="form">
    <RadioGroup
        heading="A5E.RestType"
        options={Object.entries(restTypeOptions)}
        selected={restType}
        on:updateSelection={({ detail }) => (restType = detail)}
    />

    {#if restType === "extended"}
        <Section
            --a5e-section-body-padding="0"
            --a5e-section-body-gap="0.75rem"
        >
            <FieldWrapper heading="A5E.RestExtendedDays" --direction="column">
                <span class="a5e-hit-die__quantity">
                    {recoverSetStrifeAndFatigue}
                </span>
                <div class="u-flex u-gap-md u-text-md">
                    {#each ["1", "2", "3", "4", "5", "6"] as die}
                        <div class="a5e-hit-die-wrapper">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="a5e-hit-die a5e-hit-die--rollable a5e-hit-die--{die}"
                                on:click={() =>
                                    (recoverSetStrifeAndFatigue = die)}
                            >
                                <span class="a5e-hit-die__label">{die}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            </FieldWrapper>

            {#if $actor.type === "character"}
                <FieldWrapper>
                    <Checkbox
                        label="A5E.SupplyConsume"
                        checked={!consumeSupply}
                        on:updateSelection={({ detail }) => {
                            consumeSupply = detail;
                        }}
                    />
                </FieldWrapper>
            {/if}
        </Section>
    {/if}

    {#if restType === "long"}
        <Section
            --a5e-section-body-padding="0"
            --a5e-section-body-gap="0.75rem"
        >
            <FieldWrapper heading="A5E.HitDiceLabel" --direction="column">
                <div class="u-flex u-gap-md u-text-md">
                    {#each ["d6", "d8", "d10", "d12"] as die}
                        <div class="a5e-hit-die-wrapper">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="a5e-hit-die a5e-hit-die--rollable a5e-hit-die--{die}"
                                class:disabled={hitDice[die].current === 0}
                                on:click={() => {
                                    if (hitDice[die].current > 0)
                                        rollHitDie(die);
                                }}
                            >
                                <span class="a5e-hit-die__label">{die}</span>
                            </div>

                            <span class="a5e-hit-die__quantity">
                                {hitDice[die].current}
                            </span>
                        </div>
                    {/each}
                </div>
            </FieldWrapper>
            {#if $actor.type === "character"}
                <FieldWrapper>
                    <Checkbox
                        label="A5E.HavenPrompt"
                        checked={haven}
                        on:updateSelection={({ detail }) => {
                            haven = detail;
                        }}
                    />
                </FieldWrapper>
                <FieldWrapper>
                    <Checkbox
                        label="A5E.SupplyFatigueStrifePrompt"
                        checked={recoverStrifeAndFatigue}
                        on:updateSelection={({ detail }) => {
                            recoverStrifeAndFatigue = detail;
                        }}
                    />
                </FieldWrapper>
                <FieldWrapper>
                    <Checkbox
                        label="A5E.SupplyConsume"
                        checked={consumeSupply}
                        on:updateSelection={({ detail }) => {
                            consumeSupply = detail;
                        }}
                    />
                </FieldWrapper>
            {/if}
        </Section>
    {/if}

    {#if restType === "short"}
        <Section --a5e-section-body-padding="0">
            <FieldWrapper heading="A5E.RestShortHours" --direction="column">
                <span class="a5e-hit-die__quantity">
                    {hitDiceMultiplier}
                </span>
                <div class="u-flex u-gap-md u-text-md">
                    {#each ["1", "2", "3", "4"] as die2}
                        <div class="a5e-hit-die-wrapper">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="a5e-hit-die a5e-hit-die--rollable a5e-hit-die--{die2}"
                                on:click={() => {
                                    hitDiceMultiplier = die2;
                                    diceRemainingShort =
                                        $actor.system.attributes.prof *
                                        hitDiceMultiplier;
                                }}
                            >
                                <span class="a5e-hit-die__label">{die2}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            </FieldWrapper>
            <FieldWrapper heading="A5E.HitDiceLabel" --direction="column">
                <span class="a5e-hit-die__quantity">
                    {diceRemainingShort}
                </span>
                <div class="u-flex u-gap-md u-text-md">
                    {#each ["d6", "d8", "d10", "d12"] as die}
                        <div class="a5e-hit-die-wrapper">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="a5e-hit-die a5e-hit-die--rollable a5e-hit-die--{die}"
                                class:disabled={hitDice[die].current === 0}
                                on:click={() => {
                                    if (
                                        diceRemainingShort > 0 &&
                                        hitDice[die].current > 0
                                    ) {
                                        rollHitDie(die);
                                        diceRemainingShort =
                                            diceRemainingShort - 1;
                                    }
                                }}
                            >
                                <span class="a5e-hit-die__label">{die}</span>
                            </div>

                            <span class="a5e-hit-die__quantity">
                                {hitDice[die].current}
                            </span>
                        </div>
                    {/each}
                </div>
            </FieldWrapper>
        </Section>
    {/if}

    <button class="a5e-button" on:click|preventDefault={onSubmit}>
        <i class="fas fa-campground" />
        {localize("A5E.Rest")}
    </button>
</form>

<style lang="scss">
    .form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.75rem;
    }
</style>
