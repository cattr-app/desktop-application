<template>
  <div class="error-message">
    <div class="text">
      <p>{{ this.title }}</p>
      <code>{{ this.message }}</code>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Message',
  props: {
    title: {
      required: true,
    },
    message: {
      required: false,
    },
  },
};
</script>

<style scoped>

</style>
