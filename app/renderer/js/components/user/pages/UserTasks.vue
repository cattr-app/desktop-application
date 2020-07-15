<template>
  <list v-bind:tasks="tasks" />
</template>

<script>
import List from '../tasks/List.vue';

export default {

  name: 'UserTasks',

  components: {
    List
  },

  data() {

    return {};

  },

  mounted() {

  },

  computed: {

    tasks() {

      return this.$store.getters.tasks;

    }
      
  }
}
</script>