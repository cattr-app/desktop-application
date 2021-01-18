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
          :placeholder="$t('Retrospective')"
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
          :placeholder="$t('The 3:30 PM daily retrospective with Engineering team')"
        />
      </el-form-item>
      <el-form-item
        :label="$t('Project')"
        prop="projectId"
        :error="taskSelectorError"
      >
        <el-cascader
          :v-model="task.projectId"
          :placeholder="$t('Internal projects only')"
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
          :disabled="requestInProgress"
          @click="createTask()"
        >
          {{ $t('Create a new task') }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-container>
</template>

<script>
import Message from '../../Message.vue';

export default {
  name: 'CreateTask',
  data() {

    const projectsMap = this.$store.getters.projects
      .filter(project => project.source === 'internal')
      .map(project => ({ value: String(project.id), label: String(project.name) }));

    return {

      requestInProgress: false,
      projects: projectsMap,
      taskSelectorError: '',
      task: {
        name: '',
        projectId: [],
        description: '',
      },
      rules: {
        name: [{ required: true, message: this.$t('Task name is necessary') }],
      },

    };

  },
  methods: {

    /**
     * Creates a new task
     */
    createTask() {

      this.$refs.task.validate(async () => {

        this.requestInProgress = true;
        try {

          // Checking if the project is selected
          if (this.task.projectId.length === 0) {

            this.taskSelectorError = this.$t('Project should be selected');
            this.requestInProgress = false;
            return false;

          }

          // Reset project selector error
          this.taskSelectorError = '';

          const createdTask = await this.$ipc.request('tasks/create', this.task);
          if (createdTask.code !== 200) {

            this.requestInProgress = false;

            // Task creation access is restricted
            if (createdTask.code === 403) {

              return this.$msgbox({
                title: this.$t('Task create error'),
                message: this.$t('Insufficient permissions to create task in this project'),
                confirmButtonText: this.$t('OK'),
              });

            }

            // All other errors
            return this.$msgbox({
              title: this.$t('Task create error'),
              message: this.$createElement(Message, {
                props: {
                  title: `Error ${createdTask.body.id}`,
                  message: createdTask.body.message,
                },
              }),
              confirmButtonText: this.$t('OK'),
            });

          }

          const tasks = await this.$ipc.request('tasks/sync', {});
          const totalTime = await this.$ipc.request('time/total', {});
          this.$store.dispatch('totalTimeSync', totalTime.body);
          this.$store.dispatch('syncTasks', tasks.body);
          this.$router.push({ name: 'user.tasks' });
          this.requestInProgress = false;

        } catch (err) {

          this.$message({
            type: 'error',
            message: `Error occured during task creation: ${err.code}`,
          });
          this.requestInProgress = false;

        }

        return true;

      });

    },

    /**
     * Handle project change event
     * @param {String} val Selected project ID
     */
    taskSelectorChange(val) {

      this.task.projectId = val;

    },

  },
};
</script>
