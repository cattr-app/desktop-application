<template>
    <div @click="callbackfn" class="control">
        <unicon ref="control" class="control-icon" width=".8em" height=".8em" :name="icon" :fill="iconColor"
                :style="iconClass"></unicon>
    </div>
</template>

<script>
    export default {
        name: 'WindowControl',

        props: {
            callbackfn: {
                required: true,
                type: Function
            },
            icon: {
                required: true,
                type: String
            },

            iconColor: {
                required: true,
                type: String
            },

            iconBackground: {
                required: true,
                type: String
            }
        },

        data() {
            return {
                iconClass: {
                    background: this.iconBackground
                }
            };
        },

        methods: {}
    };
</script>

<style lang="scss">
    .control {
        margin-right: 0.5em;
        display: flex;
        align-items: center;

        .control-icon {
            border-radius: 50%;

            &:not(:hover) {
                path {
                    display: none;
                }
            }

            &:active {
                background-color: lighten(#191a2b, 80%) !important;
            }
        }
    }
</style>
