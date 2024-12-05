<template>
    <el-row
            ref="task"
            class="task"
            type="flex"
    >
        <el-col
                :span="18"
                class="task-info"
        >
            <p
                    class="task-name clickable"
                    @click="openTask"
            >
                {{ task.name }}
            </p>
            <p
                    class="project-name clickable"
                    @click="openProject"
            >
                <i class="el-icon-camera" :class="screenshotIconClass"></i> {{ projectName }}
            </p>
        </el-col>
        <el-col
                :span="2"
                class="task-controls pin"
        >
            <el-button
                    :class="{ pinned: isPinned }"
                    :type="'text'"
                    icon="el-icon-star-off"
                    @click="pinner"
            />
        </el-col>
        <el-col
                :span="4"
                class="task-controls"
        >
            <!-- TODO: take care about right end of the row -->
            <!-- wooooot? I'm not sure what's supposed to be done here :( -->
            <el-button
                    :disabled="trackingLoad || loading"
                    :plain="!active"
                    :type="active ? 'success' : 'primary'"
                    class="task-toggler"
                    @click="track"
            >
                {{ trackedTime }}
            </el-button>
        </el-col>
    </el-row>
</template>

<script>
import {formatSeconds} from '../../../helpers/time-format.helper';
import ScreenshotsState from '../../../../../src/constants/ScreenshotsState'

export default {
    name: 'Task',

    props: {
        task: {
            required: true,
            type: Object,
        },
      trackingFeatures: {
        required: true,
        type: Array,
      },
    },

    data() {

        return {
            /**
             * Is this task performs some routine (starting or stopping) right now?
             * @type {Boolean}router
             */
            loading: false,

            /**
             * Is doubleclick prevention active on this task right now?
             * @type {Boolean}
             */
            clickProtected: false,
            breakLoading: false,
            isPinned: this.task.pinOrder !== null,
        };

    },

    computed: {
        trackingLoad() {

            return (
                this.$store.getters.trackLoad
            );

        },

        active() {

            return (
                this.task.id === this.$store.getters.task
                && this.$store.getters.trackStatus
            );

        },

        trackedTime() {

            return formatSeconds(this.task.TrackedTime);

        },

        isProjectPage() {

            return this.$router.history.current.name === 'user.project';

        },

        screenshotIconClass() {
          if (this.task?.Project?.screenshotsState === ScreenshotsState.REQUIRED)
            return 'el-icon-camera__active';

          if (this.task?.Project?.screenshotsState === ScreenshotsState.FORBIDDEN)
            return 'el-icon-camera__disabled';

          // At this point Project has ScreenshotsState.OPTIONAL falling back to user's setting
          if (this.trackingFeatures.includes('DESKTOP_SCREENSHOTS_DISABLED')) {
            return 'el-icon-camera__disabled';
          }

          return 'el-icon-camera__active';
        },

        projectName() {

            if (this.task.Project === null)
                return '';

            return this.task.Project.name;

        },

    },

    methods: {
        /**
         * Opens this task details
         */
        openTask() {

            this.$emit('load-task-position', null);

            // Avoid duplicated navigation
            if (this.$route.name === 'user.task' && this.$route.params.id === this.task.id)
                return;

            this.$router.push({name: 'user.task', params: {id: this.task.id}});

        },

        openProject() {

            this.$emit('load-task-position', null);

            // Avoid duplicated navigation
            if (this.$route.name === 'user.project' && this.$route.params.id === this.task.projectId)
                return;

            this.$router.push({
                name: 'user.project',
                params: {id: this.task.projectId},
            });

        },

        /**
         * Adds task to a pinned list
         * @async
         */
        async pinner() {

            this.isPinned = !this.isPinned;

            if (this.isPinned)
                this.$store.dispatch('pinTask', {id: this.task.id});
            else
                this.$store.dispatch('unpinTask', this.task.id);

            await this.$ipc.emit('tasks/pinner', {
                id: this.task.id,
                pinOrder: this.task.pinOrder,
            });

        },

        /**
         * Handles task action button click
         * @async
         */
        async track() {

            // Multiclick protection
            if (this.clickProtected || this.loading)
                return;

            // Set doubleclick prevention & loading flags
            this.clickProtected = true;
            this.loading = true;

            // Stopping this task
            if (this.active) {

                this.$store
                    .dispatch('stopTrack', {$ipc: this.$ipc})
                    .then(() => {

                        this.$emit('trackEnd', this.task);

                        // Allow click only after some amount of time
                        setTimeout(() => {

                            this.clickProtected = false;
                            this.loading = false;

                        }, 500);

                    })
                    .catch(error => {

                        // Stop tracking
                        this.$emit('trackEnd', this.task);
                        this.clickProtected = false;
                        this.loading = false;

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

                return;

            }

            // Starting this task
            this.$store
                .dispatch('startTrack', {$ipc: this.$ipc, taskId: this.task.id})
                .then(() => {

                    this.$emit('trackStart', this.task);

                    // Allow click only after some amount of time
                    setTimeout(() => {

                        this.clickProtected = false;
                        this.loading = false;

                    }, 500);

                })
                .catch(error => {
                    this.clickProtected = false;
                    this.loading = false;

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
    },
};
</script>

<style lang="scss">
@import "../../../../scss/imports/variables";
@import "../../../../scss/misc/tasks-style-misc";

.task {
  border-bottom: $--border-base;
  padding: 1em;
  justify-content: space-between;
  background-color: #ffffff;

  &:last-of-type {
    border: 0;
  }

  .task-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .el-button {
      width: 100%;
      display: block;
      padding: 10px 0px;
      font-size: 0.82rem;
    }
  }

  .task-controls.pin {
    justify-content: center;
    width: auto;
    display: block;
  }

  .task-info {
    max-width: 75%;
    display: flex;
    flex-direction: column;
    /* padding: 0 1em 0 0; */

    p {
      margin: 0;
      max-width: 100%;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .task-name {
      margin-bottom: 0.2em;
    }

    .project-name {
      font-size: $--font-size-small;
      color: $--color-text-regular;
      .el-icon-camera{
        &__active{
          color: $--color-success;
        }
        &__disabled{
          color: $--color-danger;
        }
      }
    }
  }
}

.clickable {
  cursor: pointer;
  transition: $--all-transition;

  &:hover {
    color: $--color-primary-light-1;
  }
}

.pinned {
  color: $--color-primary-light-1 !important;

  .el-icon-star-off:before {
    content: "\e797";
  }
}

.el-button--text {
  color: $--color-text-regular;
}
</style>
