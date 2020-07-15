<template>
  <div
    ref="taskList"
    class="tasks"
  >
    <template v-if="filteredTasks.length > 0">
      <transition-group
        name="flip-list"
        tag="div"
      >
        <task
          v-for="(task, index) in filteredTasks"
          :key="task.id"
          :task="task"
          :style="{'z-index': index}"
        />
      </transition-group>
    </template>
    <template v-else>
      <p class="no-tasks">
        <template v-if="searchPattern.length > 0">
          😦 {{ $t('There is no tasks for query') }} "{{ searchPattern }}"
        </template>
        <template v-else>
          😨 {{ $t('There is no tasks at all') }}
        </template>
      </p>
    </template>
  </div>
</template>

<script>
import { shell } from 'electron';
import Task from './Task.vue';

/**
 * Escaping regexp-related characters from string
 * @param   {String} s String to be escaped
 * @returns {String}   Escaped string
 */
const escapeRegExp = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export default {

  name: 'List',
  components: {
    Task
  },
  props: {

    tasks: {
      type: Array
    }

  },

  data() {

    return {};

  },

  computed: {

    /**
     * Returns identifiers of highlighted tasks
     * @returns {Array<String>} Array with internal identifiers of highlighted tasks
     */
    highlights() {

      return this.$store.getters.highlights;

    },

    /**
     * Returns search pattern
     * @returns {String} Search pattern
     */
    searchPattern() {

      return this.$store.getters.searchPattern;

    },

    /**
     * Returns identifiers of highlighted tasks
     * @returns {Array<String>} Array with internal identifiers of highlighted tasks
     */
    highlights() {

      return this.$store.getters.highlights;

    },

    /**
     * Returns sorted tasks list
     * @returns {Array<Task>} Array with tasks to display
     */
    sortedTasks() {

      const tasks = this.tasks.slice();

      // Moving highlighted elements to the start of tasks array
      this.highlights.forEach(taskId => {

        const targetIndex = tasks.findIndex(t => t.id === taskId);
        tasks.unshift(tasks.splice(targetIndex, 1)[0]);

      });

      return tasks;

    },

    /**
     * Returns tasks match search query
     * @returns {Array<Task>} Array with tasks matching search query
     */
    filteredTasks() {

      // Return tasks without filtering if condition is not defined
      if (!this.searchPattern)
        return this.tasks;

      return this.filterList(this.searchPattern, this.sortedTasks);

    }

  },

  methods: {

    /**
     * Opens task create view
     */
    openCreateTaskWindow() {

      this.$router.push({ name: 'user.createTask' });

    },

    /**
     * Opens task URL in browser
     * @param   {String}  url Assigned task URL
     * @returns {Boolean}     True if succeed, or False if protocol is prohibited
     */
    openTask(url) {

      // Parsing this URL
      const urlParsed = new URL(url);

      // Checking protocol
      if (urlParsed.protocol !== 'http:' && urlParsed.protocol !== 'https:')
        return false;

      // Given URL looks safe, opening it
      shell.openExternal(url);
      return true;

    },

    /**
     * Starts tracking time in this task
     * @param {Task} task Target task
     */
    track(task) {

      if (task.id === this.$store.getters.task && this.$store.getters.trackStatus === true)
        this.$store.dispatch('stopTrack');
      else
        this.$store.dispatch('startTrack', task.id);

    },

    /**
     * Filter tasks in list matching search query
     * @param   {String}       query Search query
     * @param   {Array<Task>}  list  Tasks array
     * @returns {Array<Task>}
     */
    filterList(q, list) {

      const words = q.split(' ').map(s => s.trim()).filter(s => s.length !== 0);
      const hasTrailingSpace = q.endsWith(' ');
      const regexString = words.map((word, i) => {

        if (i + 1 === words.length && !hasTrailingSpace)
          return `(?=.*(?:^|)${escapeRegExp(word)})`;
        return `(?=.*(?:^|)${escapeRegExp(word)}(?:^|\\s))`;

      }).join('');

      const searchRegex = new RegExp(`${regexString}.+`, 'gi');
      return list.filter(item => {

        if (searchRegex.test(item.name)) {

          // We should reset lastIndex on positive matchs to avoid issues with RegExp reuse
          searchRegex.lastIndex = 0;
          return true;

        }

        if (searchRegex.test(item.Project.name)) {

          // We should reset lastIndex on positive matchs to avoid issues with RegExp reuse
          searchRegex.lastIndex = 0;
          return true;

        }

        return false;

      });

    }
  },

};
</script>

<style lang="scss" scoped>
.tasks {

  .no-tasks {
    font-size: 1.1em;
    margin-top: 1.5em;
    text-align: center;
  }

  .fade-task-enter-active, .fade-task-leave-active {
    transition: opacity .5s;
  }

  .fade-task-enter, .fade-task-leave-to {
    opacity: 0;
  }

  .flip-list-move {
    transition: transform .5s;
    z-index: 99999;
  }

}
</style>
