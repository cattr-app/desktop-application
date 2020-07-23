<template>
  <List v-bind:tasks="formattedTasks" />
</template>

<script>
import List from '../tasks/List.vue';

export default {

  name: 'UserTasks',

  components: {
    List
  },

  computed: {

    /**
     * Returns raw tasks
     * @returns {Array<Task>} Array of raw tasks from local DB
     */
    rawTasks() {

      return this.$store.getters.tasks;

    },

    /**
     * Returns identifiers of highlighted tasks
     * @returns {Array<String>} Array with internal identifiers of highlighted tasks
     */
    highlights() {

      return this.$store.getters.highlights;

    },

    /**
     * Returns tasks formatted for this view
     * @returns {Array<Task>} Array with formatted tasks
     */
    formattedTasks() {

      let formatted = this.sortTasksByHighlights(this.rawTasks, this.highlights);
      formatted = this.sortByPinOrder(formatted);

      return formatted;

    },

  },

  methods: {

    /**
     * Returns tasks sorted by highlight markers
     * @returns {Array<Task>} Array with sorted tasks
     */
    sortTasksByHighlights(tasks, highlights) {

      // Create copy of this.tasks
      const sorted = tasks.slice();
      
      // Moving highlighted elements to the start of tasks array
      highlights.forEach(taskId => {

        // Get index of task to be raised if it's marked as highlighted
        const targetIndex = sorted.findIndex(t => t.id === taskId);
        sorted.unshift(sorted.splice(targetIndex, 1)[0]);

      });
      
      return sorted;

    },

    /**
     * Returns tasks sorted by pins markers
     * @returns {Array<Task>} Array with sorted tasks
     */
    sortByPinOrder(tasks) {
      
      const sorted = tasks.slice();

      // Get tasks being pinned
      const pinned = sorted.filter(t => t.pinOrder !== null);

      pinned.forEach(p => {

        // if it's pinned, it goes to the top of the list
        const targetIndex = sorted.findIndex(t => t.id === p.id);
        sorted.splice(targetIndex, 1);
        
      });
      
      // Sort pinned tasks by the pin order
      pinned.sort((t1, t2) => { return  t2.pinOrder - t1.pinOrder; });

      return pinned.concat(sorted);

    }

  }

}
</script>
