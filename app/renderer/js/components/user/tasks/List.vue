<template>
  <div
    ref="taskList"
    class="tasks"
  >
    <div
      v-if="notSyncedAmount > 0"
      class="not-synced-intervals"
    >
      {{ $t("Not synced intervals") }}: <span class="not-synced-intervals__amount">{{ notSyncedAmount }}</span>
    </div>
    <template v-if="filteredTasks.length > 0">
      <draggable
        class="dragArea"
        :class="{ dragArea: true }"
        :options="{ draggable: '.drag' }"
        @end="onEnd"
      >
        <transition-group
          name="flip-list"
          tag="div"
        >
          <task
            v-for="(task, index) in filteredTasks"
            :key="task.id"
            :pin-order="task.pinOrder !== null ? task.pinOrder : false"
            :class="{ drag: task.pinOrder !== null }"
            :task="task"
            :style="{ 'z-index': index }"
            @load-task-position="loadTaskPosition($event)"
          />
        </transition-group>
      </draggable>
    </template>
    <template v-else>
      <p class="no-tasks">
        <template v-if="searchPattern.length > 0">
          {{ $t("There are no tasks for query") }} "{{ searchPattern }}"
        </template>
        <template v-else>
          {{ $t("There are no tasks at all") }}
        </template>
      </p>
    </template>
  </div>
</template>

<script>
import Draggable from 'vuedraggable';
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
    Task,
    Draggable,
  },
  props: {
    list: {
      type: Array,
      default: null,
    },
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
     * Returns unsorted tasks list
     * @returns {Array<Task>} Array with tasks to display
     */
    tasks() {

      return this.list || this.$store.getters.tasks;

    },

    /**
     * Returns search pattern
     * @returns {String} Search pattern
     */
    searchPattern() {

      return this.$store.getters.searchPattern;

    },

    /**
     * Returns tasks match search query
     * @returns {Array<Task>} Array with tasks matching search query
     */
    filteredTasks() {

      try {

        const filteredTasks = this.filterList(this.searchPattern, this.tasks);
        const highlight = this.sortTasksByHighlights(
          filteredTasks,
          this.highlights,
        );
        const formatted = this.sortByPinOrder(highlight);

        return formatted;

      } catch (error) {

        return this.getPinnedTasks(this.tasks);

      }

    },

    /**
     * Returns amount of not synced intervals
     * @returns {Integer}
     */
    notSyncedAmount() {

      return this.$store.getters.notSyncedAmount;

    },
  },

  async mounted() {

    /* Trigger new tracking features check */
    try {

      const updateRequest = await this.$ipc.request(
        'misc/unacknowledged-tracking-features',
        {},
      );
      if (updateRequest.body.features) {

        let content = `<p>${this.$t(
          'Cattr settings was updated. Now we tracking these types of activity:',
        )}</p><ol>`;
        updateRequest.body.features.forEach(f => {

          switch (f) {

            case 'APP_MONITORING':
              content += `<li>${this.$t('Tracking active window title')}</li>`;
              break;

            case 'DESKTOP_SCREENSHOTS':
              content += `<li>${this.$t(
                'Capturing desktop screenshots',
              )}</li>`;
              break;

            default:
              content += `<li>${f}</li>`;
              break;

          }

        });
        content += `</ol><p>${this.$t(
          'Reach your company administrator for more info.',
        )}</p>`;
        await this.$alert(content, this.$t('Tracking features'), {
          dangerouslyUseHTMLString: true,
          confirmButtonText: 'OK',
        });

      }

    } catch (_) {
      // Do nothing
    }

  },

  methods: {
    loadTaskPosition() {

      this.$emit('load-task-position', null);

    },

    /**
     * Returns tasks sorted by highlight markers
     * @returns {Array<Task>} Array with sorted tasks
     */
    sortTasksByHighlights(tasks, highlights) {

      // Create copy of this.tasks
      const sorted = [...tasks];

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
      pinned.sort((t1, t2) => t2.pinOrder - t1.pinOrder);

      return pinned.concat(sorted);

    },

    /**
     * Handles drag'n'drop event
     * @returns {undefined}
     */
    async onEnd(evt) {

      await this.swapPinnedTasksOrder(
        this.tasks[evt.oldIndex],
        this.tasks[evt.newIndex],
      );

    },

    async swapPinnedTasksOrder(task1, task2) {

      await this.$ipc.emit('tasks/pinOrder/update', {
        id: task1.id,
        pinOrder: task2.pinOrder,
      });
      await this.$ipc.emit('tasks/pinOrder/update', {
        id: task2.id,
        pinOrder: task1.pinOrder,
      });

    },

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
      window.location.href = url;
      return true;

    },

    /**
     * Filter tasks in list matching search query
     * @param   {String}       query Search query
     * @param   {Array<Task>}  list  Tasks array
     * @returns {Array<Task>}
     */
    filterList(q, list) {

      if (!q)
        return list;

      const words = q
        .split(' ')
        .map(s => s.trim())
        .filter(s => s.length !== 0);
      const hasTrailingSpace = q.endsWith(' ');
      const regexString = words
        .map((word, i) => {

          if (i + 1 === words.length && !hasTrailingSpace)
            return `(?=.*(?:^|)${escapeRegExp(word)})`;
          return `(?=.*(?:^|)${escapeRegExp(word)}(?:^|\\s))`;

        })
        .join('');

      const searchRegex = new RegExp(`${regexString}.+`, 'gi');
      return list.filter(item => {

        // This is just a thing to leave the pinned tasks in the search results
        if (item.pinOrder !== null) {

          // We should reset lastIndex on positive matchs to avoid issues with RegExp reuse
          searchRegex.lastIndex = 0;
          return true;

        }

        if (searchRegex.test(item.name)) {

          // We should reset lastIndex on positive matchs to avoid issues with RegExp reuse
          searchRegex.lastIndex = 0;
          return true;

        }

        // Workaround for tasks without project access (ugh!)
        if (item.Project !== null) {

          if (searchRegex.test(item.Project.name)) {

            // We should reset lastIndex on positive matchs to avoid issues with RegExp reuse
            searchRegex.lastIndex = 0;
            return true;

          }

        }

        return false;

      });

    },

    getPinnedTasks(list) {

      return list.filter(item => {

        if (item.pinOrder !== null) {

          const searchRegex = new RegExp('.+', 'gi');

          // We should reset lastIndex on positive matchs to avoid issues with RegExp reuse
          searchRegex.lastIndex = 0;
          return true;

        }

        return false;

      });

    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../../../scss/imports/variables";

.tasks {
  .not-synced-intervals{
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
    border-bottom: $--border-base;
    cursor: default;
    &__amount{
      color: $--color-primary;
    }
  }

  .no-tasks {
    font-size: 1.1em;
    margin-top: 1.5em;
    text-align: center;
  }

  .fade-task-enter-active,
  .fade-task-leave-active {
    transition: opacity 0.5s;
  }

  .fade-task-enter,
  .fade-task-leave-to {
    opacity: 0;
  }

  .flip-list-move {
    transition: transform 0.5s;
    z-index: 99999;
  }
}
</style>
