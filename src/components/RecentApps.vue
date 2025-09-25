<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import config from '../config.js'
const API_BASE = config.API_BASE
const props = defineProps({
  deviceId: {
    type: String,
    required: true
  }
});
const recentApps = ref([]);
const loading = ref(false);
const error = ref(null);
const isExpanded = ref(false); // 控制展開收起狀態
const showLimit = ref(5); // 預設顯示的條數

// 計算處理後的程式資料
const processedApps = computed(() => {
  // 按時間戳降序排序
  const sortedApps = [...recentApps.value].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
  );

  return sortedApps.map((app, index, arr) => {
    const startTime = new Date(app.timestamp);
    let endTime = null;
    let duration = null;

    // 如果是第一個程式且正在執行，則計算到目前時間的持續時間
    if (app.running && index === 0) {
      duration = Math.floor((new Date() - startTime) / 1000);
    } else if (index > 0) {
      // 結束時間是前一個程式的時間戳（因為現在是降序排序）
      endTime = new Date(arr[index - 1].timestamp);
      duration = Math.floor((endTime - startTime) / 1000);
    }

    return {
      ...app,
      startTime: app.timestamp,
      endTime: endTime ? endTime.toISOString() : null,
      duration: duration
    };
  });
});

// 計算要顯示的程式列表
const displayedApps = computed(() => {
  if (isExpanded.value || processedApps.value.length <= showLimit.value) {
    return processedApps.value;
  }
  return processedApps.value.slice(0, showLimit.value);
});

// 是否需要顯示展開/收起按鈕
const shouldShowToggle = computed(() => {
  return processedApps.value.length > showLimit.value;
});

// 切換展開/收起狀態
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

// 取得最近使用的程式
const fetchRecentApps = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await fetch(`${API_BASE}/recent/${props.deviceId}`);
    if (!response.ok) throw new Error('取得最近程式失敗');
    const data = await response.json();
    // 不再反轉陣列，因為現在會在computed中排序
    recentApps.value = data.data;
  } catch (err) {
    error.value = `取得最近程式失敗: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

// 格式化持續時間為更友好的顯示
const formatDuration = (seconds) => {
  if (seconds === null) return '裝置待機';
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分鐘`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}小時${minutes}分鐘`;
};

// 格式化時間為本機時間
const formatTime = (isoString) => {
  if (!isoString) return '未結束';
  const date = new Date(isoString);
  return date.toLocaleString();
};

onMounted(fetchRecentApps);
watch(() => props.deviceId, fetchRecentApps);
</script>

<template>
  <div class="mt-8 rounded-lg border-2 border-gray-200 shadow-md p-6 relative dark:border-gray-700">
    <!-- 標題和重新整理按鈕 -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">最近使用的程式</h3>
      <button @click="fetchRecentApps" class="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
        <span class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重新整理
        </span>
      </button>
    </div>

    <!-- 錯誤提示 -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
      {{ error }}
    </div>

    <!-- 載入遮罩層 -->
    <div v-if="loading" class="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-lg">
      <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- 最近程式列表 -->
    <div class="overflow-x-auto transition-opacity duration-300" :class="{'opacity-50': loading}">
      <div v-if="!loading && recentApps.length === 0" class="text-center py-4 text-gray-500">
        暫無最近使用程式記錄
      </div>

      <div v-if="recentApps.length > 0">
        <!-- 程式表格 -->
        <table class="min-w-full not-dark:divide-y divide-gray-200">
          <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">程式</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">開始時間</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">結束時間</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">持續時間</th>
          </tr>
          </thead>
          <tbody  class="not-dark:divide-y divide-gray-50">
          <tr v-for="app in displayedApps" :key="app._id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium truncate max-w-xs">{{ app.appName }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ formatTime(app.startTime) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ app.endTime ? formatTime(app.endTime) : '執行中' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">{{ formatDuration(app.duration) }}</td>
          </tr>
          </tbody>
        </table>

        <!-- 展開/收起按鈕 -->
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
    </div>
  </div>
</template>

<style scoped>
/* 新增一些響應式樣式 */
@media (max-width: 640px) {
  table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}

</style>