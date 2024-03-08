<script>
    import { getContext } from "svelte";
    import { localize } from "#runtime/svelte/helper";

    import Checkbox from "../components/Checkbox.svelte";
    import FormSection from "../components/LegacyFormSection.svelte";
    import RadioGroup from "../components/RadioGroup.svelte";

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

    async function rollHitDie(dieSize) {
        try {
            await $actor.rollHitDice(dieSize);
        } catch (e) {
            // TODO: Display a useful error to the user when hit die updates fail
            console.log(e);
            return;
        }
    }

    function onSubmit() {
        application.submit({
            consumeSupply,
            haven,
            restType,
            recoverStrifeAndFatigue,
            recoverSetStrifeAndFatigue,
            diceRemaining,
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
        <FormSection heading="A5E.RestExtendedDays" --direction="column">
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
                            on:click={() => (recoverSetStrifeAndFatigue = die)}
                        >
                            <span class="a5e-hit-die__label">{die}</span>
                        </div>
                    </div>
                {/each}
            </div>
        </FormSection>

        {#if $actor.type === "character"}
            <FormSection>
                <Checkbox
                    label="A5E.SupplyConsume"
                    checked={!consumeSupply}
                    on:updateSelection={({ detail }) => {
                        consumeSupply = detail;
                    }}
                />
            </FormSection>
        {/if}
    {/if}

    {#if restType === "long"}
        <FormSection heading="A5E.HitDiceLabel" --direction="column">
            <div class="u-flex u-gap-md u-text-md">
                {#each ["d6", "d8", "d10", "d12"] as die}
                    <div class="a5e-hit-die-wrapper">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            class="a5e-hit-die a5e-hit-die--rollable a5e-hit-die--{die}"
                            class:disabled={hitDice[die].current === 0}
                            on:click={() => rollHitDie(die)}
                        >
                            <span class="a5e-hit-die__label">{die}</span>
                        </div>

                        <span class="a5e-hit-die__quantity">
                            {hitDice[die].current}
                        </span>
                    </div>
                {/each}
            </div>
        </FormSection>
        <FormSection>
            <Checkbox
                label="A5E.HavenPrompt"
                checked={haven}
                on:updateSelection={({ detail }) => {
                    haven = detail;
                }}
            />
        </FormSection>

        <FormSection>
            <Checkbox
                label="A5E.SupplyFatigueStrifePrompt"
                checked={recoverStrifeAndFatigue}
                on:updateSelection={({ detail }) => {
                    recoverStrifeAndFatigue = detail;
                }}
            />
        </FormSection>

        {#if $actor.type === "character"}
            <FormSection>
                <Checkbox
                    label="A5E.SupplyConsume"
                    checked={consumeSupply}
                    on:updateSelection={({ detail }) => {
                        consumeSupply = detail;
                    }}
                />
            </FormSection>
        {/if}
    {/if}

    {#if restType === "short"}
        <FormSection heading="A5E.HitDiceLabel" --direction="column">
            <span class="a5e-hit-die__quantity">
                {diceRemaining}
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
                                if (diceRemaining > 0) {
                                    rollHitDie(die);
                                    diceRemaining = diceRemaining - 1;
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
        </FormSection>
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
        gap: 0.5rem;
        padding: 0.75rem;
    }
</style>
