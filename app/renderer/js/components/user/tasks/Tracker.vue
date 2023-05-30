<template>
    <div class="tracker">
        <el-row class="task">
            <el-col
                    :span="14"
                    :type="'flex'"
            >
                <div class="task-info">
                    <template v-if="trackingTask">
                        <p
                                class="task-name clickable"
                                @click="openTask"
                        >
                            {{ trackingTask.name }}
                        </p>
                        <p
                                class="project-name clickable"
                                @click="openProject"
                        >
                            {{ projectName }}
                        </p>
                    </template>
                    <template v-else>
                        <p class="task-name">
                            {{ $t('On pause') }}
                        </p>
                    </template>
                </div>
            </el-col>
            <el-col
                    :span="10"
                    class="tracker-controls"
            >
                <el-button
                        icon="el-icon-files"
                        size="medium"
                        type="text"
                        @click="openIntervalsQueue"
                />
                <el-button
                        :disabled="!trackingTask || trackingLoad"
                        :plain="!trackingInProgress"
                        :type="trackingInProgress ? 'success' : 'danger'"
                        class="tracker-toggler"
                        @click="track"
                >
                    {{ trackedTime }}
                </el-button>
            </el-col>
        </el-row>
    </div>
</template>

<script>
import {clipboard} from 'electron';

export default {
    name: 'Tracker',
    components: {},
    props: {
        isTrackerLoading: Boolean,
    },
    data() {

        return {
            errorModal: false,
            reportSnack: false,
            trackButtonLocked: false,
        };

    },
    computed: {

        trackingLoad() {

            return this.$store.getters.trackLoad;

        },

        trackingInProgress() {

            return this.$store.getters.trackStatus;

        },

        trackingTask() {

            if (!this.$store.getters.task)
                return false;


            return this.getTask(this.$store.getters.task);

        },

        trackedTime() {

            const {totalTime} = this.$store.getters;
            return new Date(totalTime * 1000).toISOString().substr(11, 8);

        },

        projectName() {

            if (this.trackingTask.Project === null)

                return '';


            return this.trackingTask.Project.name;

        },

    },

    mounted() {

        this.$ipc.serve('inactivity-modal/resume-work-after-inactivity', async () => {

            await this.track();

        });

    },

    methods: {

        /**
         * Opens this task details
         */
        openTask() {

            this.$emit('load-task-position', null);

            // Avoid duplicated navigation
            if (this.$route.name === 'user.task' && this.$route.params.id === this.trackingTask.id)
                return;

            this.$router.push({name: 'user.task', params: {id: this.trackingTask.id}});

        },

        openProject() {

            this.$emit('load-task-position', null);

            // Avoid duplicated navigation
            if (this.$route.name === 'user.project' && this.$route.params.id === this.trackingTask.Project.id)
                return;

            this.$router.push({name: 'user.project', params: {id: this.trackingTask.Project.id}});

        },

        /**
         * Opens intervals queue
         */
        openIntervalsQueue() {

            this.$emit('load-task-position', null);

            // Make this button acting as "toggle" between intervals and main pages
            if (this.$route.name === 'user.intervalsQueue') {

                this.$router.push({name: 'user.tasks'});
                return;

            }

            this.$router.push({name: 'user.intervalsQueue'});

        },

        async resumeTracking() {

            if (!this.$store.getters.task || this.$store.getters.trackStatus)
                await this.$store.dispatch('stopTrack', {$ipc: this.$ipc});
            else
                await this.$store.dispatch('startTrack', {taskId: this.$store.getters.task, $ipc: this.$ipc});

        },

        async getReport() {

            this.$store.dispatch('showLoader');
            const {body} = await this.$ipc.request('time/daily-report', {});

            // Report buffer contains prepared report
            let reportBuffer = '';

            body.projects.forEach(project => {

                // Add project name
                reportBuffer += `**${project.name}**\n\n`;

                // Add all related tasks
                project.tasks.forEach(task => {

                    reportBuffer += `_${task.name.trim()}${task.url ? ` (${task.url})` : ''}_\n...\n\n`;

                });

            });

            this.$store.dispatch('hideLoader');

            clipboard.writeText(reportBuffer);
            this.reportSnack = true;

        },

        track() {

            // Double-click protection
            if (this.trackButtonLocked)
                return;
            this.trackButtonLocked = true;

            if (!this.$store.getters.task || this.$store.getters.trackStatus)
                this.$store
                    .dispatch('stopTrack', {$ipc: this.$ipc})
                    .then(() => {
                        // Allow click only after some amount of time
                        setTimeout(() => this.$set(this, 'trackButtonLocked', false), 350);
                    })
                    .catch(error => {

                        // Stop tracking
                        this.trackButtonLocked = false;

                        const h = this.$createElement;
                        const messageContainer = h('div', null, [
                            h('p', null, error.message || 'Unknown error occured')
                        ]);

                        if (error.error?.isApiError && error.error.trace_id) {
                            messageContainer.children.push(
                                h('p', null, [
                                    h('b', null, 'Backend traceId'),
                                    h('span', null, `: ${error.error.trace_id}`)
                                ])
                            );
                        }

                        if (error.error?.context?.client_trace_id) {
                            messageContainer.children.push(
                                h('p', null, [
                                    h('b', null, 'Client traceId'),
                                    h('span', null, `: ${error.error.context.client_trace_id}`)
                                ])
                            );
                        }

                        // Show error message
                        this.$alert(
                            messageContainer,
                            `${this.$t('Tracking error')} ${error.id || ''}`,
                            {
                                confirmButtonText: 'OK', callback: () => {
                                }
                            },
                        );

                    });
            else
                this.$store
                    .dispatch('startTrack', {taskId: this.$store.getters.task, $ipc: this.$ipc})
                    .then(() => {
                        // Allow click only after some amount of time
                        setTimeout(() => this.$set(this, 'trackButtonLocked', false), 350);
                    })
                    .catch(error => {
                        this.$set(this, 'trackButtonLocked', false)
                        const h = this.$createElement;
                        const messageContainer = h('div', null, [
                            h('p', null, error.message || 'Unknown error occured')
                        ]);

                        if (error.error?.isApiError && error.error.trace_id) {
                            messageContainer.children.push(
                                h('p', null, [
                                    h('b', null, 'Backend traceId'),
                                    h('span', null, `: ${error.error.trace_id}`)
                                ])
                            );
                        }

                        if (error.error?.context?.client_trace_id) {
                            messageContainer.children.push(
                                h('p', null, [
                                    h('b', null, 'Client traceId'),
                                    h('span', null, `: ${error.error.context.client_trace_id}`)
                                ])
                            );
                        }

                        // Show error message
                        this.$alert(
                            messageContainer,
                            `${this.$t('Tracking is not available')} ${error.id || ''}`,
                            {
                                confirmButtonText: 'OK', callback: () => {
                                }
                            },
                        );

                    });

        },


        getTask(taskId) {

            return this.$store.getters.tasks.find(t => t.id === taskId);

        },
    },
};
</script>

<style lang="scss" scoped>
@import "../../../../scss/imports/variables";
@import "../../../../scss/misc/tasks-style-misc";

p {
  margin: 0;
}

.tracker {
  padding: 1em 1.5em;
  background-color: $--background-color-base;
  border-top: $--border-base;
  height: 40px;
  max-height: 40px;
  justify-content: center;
  display: flex;
  flex-direction: column;

  .task {
    padding: 0;
    display: flex;
    align-items: center;
    background-color: inherit;

    .task-info {
      max-width: inherit;
      padding: 0;

      p:last-of-type {
        margin: 0;
      }
    }

    .tracker-controls {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;

      .tracker-toggler {
        width: 50%;
        padding: 12px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .tracker-toggler.el-button--success:hover:enabled {
        background: #f56c6c;
        border-color: #f56c6c;
      }

      .tracker-toggler.el-button--danger:hover:enabled {
        background: #85ce61;
        border-color: #85ce61;
      }

    }
  }

}

.el-button.sync {
  padding: 12px 20px;
}

</style>
