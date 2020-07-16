<template>
  <div
    v-if="showLoader"
    ref="spinner"
    class="loader"
  >
    <v-progress-circular
      size="82"
      indeterminate
      color="primary"
      class="spinner"
    />
  </div>
</template>

<script>
export default {
  name: 'Loader',

  computed: {
    showLoader() {

      return this.$store.getters.loader;

    },
  },
};
</script>

<style lang="scss" scoped>
    .loader {
        position: absolute;
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        z-index: 999;

        background-color: rgba(0, 0, 0, 0.3);

        .spinner {
            margin: auto;
            z-index: 1500;
        }
    }
</style>
