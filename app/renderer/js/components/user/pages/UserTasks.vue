<template>
  <list :tasks="tasks" />
</template>

<script>
import List from '../tasks/List.vue';

export default {

  name: 'UserTasks',

  components: {
    List,
  },

  data() {

    return {};

  },

  computed: {

    tasks() {

      return this.$store.getters.tasks;

    },

  },

  mounted() {

  },
};
</script>
