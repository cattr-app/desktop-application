<template>
  <el-container class="settings-container">
    <el-form
      ref="task"
      :model="task"
      :rules="rules"
      label-position="top"
    >
      <el-form-item
        :label="$t('Name of a new task')"
        prop="name"
      >
        <el-input
          v-model="task.name"
          placeholder="Retrospective"
        />
      </el-form-item>
      <el-form-item
        :label="$t('Description')"
        prop="description"
      >
        <el-input
          v-model="task.description"
          type="textarea"
          :rows="2"
          placeholder="The 3:30 PM daily retrospective with Engineering team"
        />
      </el-form-item>
      <el-form-item
        :label="$t('Project')"
        prop="projectId"
        :error="taskSelectorError"
      >
        <el-cascader
          :v-model="task.projectId"
          placeholder="Internal projects only"
          :options="projects"
          filterable
          @change="taskSelectorChange"
        />
        &nbsp;&nbsp;
        <el-button
          type="success"
          icon="el-icon-check"
          plain
          :loading="requestInProgress"
          @click="createTask()"
        >
          {{ $t('Create a new task') }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-container>
</template>

<script>
export default {
  name: 'CreateTask',
  props: {},
  data() {

    const projectsMap = this.$store.getters.projects
      .filter(project => project.source === 'internal')
      .map(project => ({ value: String(project.id), label: String(project.name) }));

    return {

      projects: projectsMap,
      taskSelectorError: '',
      task: {
        name: '',
        projectId: [],
        description: ''
      },
      rules: {
        name: [ { required: true, message: 'Task name is necessary' } ],
      }

    };

  },
  methods: {

    /**
     * Creates a new task
     */
    createTask() {

      this.$refs.task.validate(valid => {

        // Checking is project selected
        if (this.task.projectId.length === 0) {

          this.taskSelectorError = 'Project should be selected';
          return false;

        }

        // Reset project selector error
        this.taskSelectorError = '';

        console.log(this.task);
        console.log(valid);
        console.log(this.$ipc);

      });

    },

    /**
     * Handle project change event
     * @param {String} val Selected project ID
     */
    taskSelectorChange(val) {

      this.task.projectId = val;

    }

  },
};
</script>
