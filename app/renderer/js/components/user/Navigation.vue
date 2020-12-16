<template>
  <el-menu
    :default-active="$route.path"
    router
    unique-opened
    mode="horizontal"
  >
    <el-menu-item index="/user/tasks">
      Tasks
    </el-menu-item>
    <el-menu-item index="/user/settings">
      Settings
    </el-menu-item>
  </el-menu>
</template>

<script>
import Tracker from './tasks/Tracker.vue';

export default {
  name: 'Navigation',
  components: {
    Tracker,
  },
};
</script>

<style lang="scss" scoped>

</style>
