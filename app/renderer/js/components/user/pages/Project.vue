<template>
  <el-container class="project-container">
    <div class="header">
      <i
      class="el-icon-d-arrow-left clickable"
      @click="goTo('/user/tasks')"
      />
      <h1 class="header__section-label">
        {{ project.name }}
      </h1>
    </div>
    <list
      v-bind:tasks="tasks"
    />
  </el-container>
</template>

<script>
import { shell } from 'electron';
import List from '../tasks/List.vue';

export default {
  name: 'Project',
  components: {
    List
  },
  data() {

    return {
      projectId: this.$route.params.id
    };
    

  },

  computed: {

    /**
     * Returns search pattern
     * @returns {String} Search pattern
     */
    searchPattern() {

      return this.$store.getters.searchPattern;

    },

    /**
     * Returns project
     * @returns {Project} Project
     */
    project() {

      return this.$store.getters.projects.find(p => p.id === this.projectId);

    },

    /**
     * Returns tasks
     * @returns {Array<Task>} Array with tasks
     */
    tasks() {

      return this.$store.getters.tasks.filter(t => t.projectId === this.projectId);

    },

    /**
     * Returns tasks match search query
     * @returns {Array<Task>} Array with tasks matching search query
     */
    filteredTasks() {


      // Return tasks without filtering if condition is not defined
      if (!this.searchPattern)
        return this.tasks;

      return this.filterList(this.searchPattern, this.tasks);

    }

  },

  methods: {
    openInBrowser() {

      shell.openExternal(this.task.externalUrl);

    },

    goTo(where) {

      this.$router.push({ path: where });

    },

    track() {

      if (this.active) {

        this.$store.dispatch('stopTrack', { $ipc: this.$ipc });
        this.$emit('trackEnd', this.task);

      } else {

        this.$store.dispatch('startTrack', { taskId: this.task.id, $ipc: this.$ipc });
        // this.$store.dispatch('moveTaskToBegin', this.task.id);

        this.$emit('trackStart', this.task);

      }

    },

    back() {

      this.$router.push({ name: 'user.tasks' });

    }
  }
};
</script>

<style lang="scss">
  @import "../../../../scss/imports/variables";

  .project-container {
    flex-flow: column;
    padding: 0;

    .header {
      padding: 1em;
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      border-bottom: $--border-base;
      margin: 0 0 .5em;
      font-size: 1.5rem;

      &__section-label {
        margin: 0;
        font-size: 1.5rem;
      }

      &.header-fixed {
        position: fixed;
        background: rgba(255, 255, 255, 0.3);
        width: 100%;
      }

      .el-icon-d-arrow-left {
        margin-right: 10px;
      }

    }

    .section-divider {
      margin: 0;
    }

    .task-description {
      padding: 1em;
      border: $--border-base;
      background-color: $--border-color-lighter;
      border-radius: .25em;
    }

    .task-controls {
      display: flex;
      flex-flow: row;
      justify-content: space-between;

      .task-toggler {
        width: 10em;
      }
    }
  }

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

  .clickable {
    cursor: pointer;
    transition: $--all-transition;

  &:hover {
    color: $--color-primary-light-1;
  }

}

</style>
