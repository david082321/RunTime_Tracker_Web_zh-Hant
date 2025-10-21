<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  stats: {
    type: Object,
    required: true
  },
  showLimit: {
    type: Number,
    default: 10
  }
});

const isExpanded = ref(false);

// 格式化持續時間
const formatDuration = (seconds) => {
  if (seconds < 60) return `<1分`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}時${minutes}分`;
};

// 處理程式資料
const processedApps = computed(() => {
  if (!props.stats?.appStats) return [];

  return Object.entries(props.stats.appStats)
      .map(([app, duration]) => ({
        app,
        duration,
        formattedDuration: formatDuration(duration * 60)
      }))
      .sort((a, b) => b.duration - a.duration);
});

// 顯示的程式資料
const displayedApps = computed(() => {
  return isExpanded.value
      ? processedApps.value
      : processedApps.value.slice(0, props.showLimit);
});

// 總使用時間
const totalUsageMinutes = computed(() => {
  return props.stats?.totalUsage || 0;
});

// 是否需要顯示展開/收起按鈕
const shouldShowToggle = computed(() => {
  return processedApps.value.length > props.showLimit;
});

// 是否有数据
const hasData = computed(() => {
  return processedApps.value.length > 0;
});

// 切换展开/收起状态
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<template>
  <div class="rounded-lg border-2 border-gray-200 shadow-md p-6 mb-6 dark:bg-[#181a1b] dark:border-gray-700">
    <h3 class="text-lg font-medium mb-4">詳細使用資料</h3>
    <div class="overflow-x-auto">
      <table class="min-w-full not-dark:divide-y divide-gray-200">
        <thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider not-sm:hidden">程式</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider not-sm:hidden">使用時間</th>
        </tr>
        <!-- PC/平板设备并排显示 -->
        </thead>
        <tbody class="not-dark:divide-y divide-gray-200 not-sm:hidden">
        <tr v-for="usage in displayedApps" :key="usage.app">
          <td class="w-auto max-w-[50%] py-3 whitespace-nowrap text-sm font-medium">{{ usage.app }}</td>
          <td class="w-full max-w-[70%] px-6 py-3 whitespace-nowrap">
            <div class="flex flex-col gap-2">
              <!-- 進度條 -->
              <div class="w-full bg-gray-200 rounded-full h-3 md:h-2.5 dark:bg-[#25282a]">
                <div
                    class="bg-blue-600 h-full rounded-full transition-all duration-500 min-w-[0.25rem]"
                    :style="{ width: `${((usage.duration / totalUsageMinutes) * 100)}%` }"
                ></div>

              </div>
              <!-- 使用時間和占比 -->
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>{{ usage.formattedDuration }}</span>
                <span>{{ Math.round((usage.duration / totalUsageMinutes) * 100) || "0" }}%</span>
              </div>
            </div>
          </td>
        </tr>
        </tbody>
        <!-- 手机设备分2行显示 -->
        <tbody class="not-dark:divide-y divide-gray-200 sm:hidden">
        <tr v-for="usage in displayedApps" :key="usage.app">
          <!-- 调整为垂直布局 -->
          <td class="w-full py-1">
            <div class="flex flex-col gap-1">
              <div class="text-sm font-medium">{{ usage.app }}</div>
              <div class="w-full bg-gray-200 rounded-full h-4 dark:bg-[#25282a]">
                <div
                    class="bg-blue-600 h-full rounded-full transition-all duration-500 min-w-[0.25rem]"
                    :style="{ width: `${((usage.duration / totalUsageMinutes) * 100)}%` }"
                ></div>
              </div>
              <div class="flex items-center justify-between text-sm text-gray-500">
                <span>{{ usage.formattedDuration }}</span>
                <span>{{ Math.round((usage.duration / totalUsageMinutes) * 100) || "0" }}%</span>
              </div>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!hasData" class="flex flex-col items-center justify-center min-h-[100px]">
      <span class="text-gray-400 text-lg">暫無資料</span>
    </div>

    <!-- 展开/收起按钮 -->
    <div v-if="shouldShowToggle" class="flex justify-center mt-4">
      <button
          @click="toggleExpanded"
          class="flex items-center px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
      >
        <template v-if="isExpanded">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
          收起 (顯示前{{ showLimit }}條)
        </template>
        <template v-else>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          展開查看全部 ({{ processedApps.length }}條)
        </template>
      </button>
    </div>
  </div>
</template>