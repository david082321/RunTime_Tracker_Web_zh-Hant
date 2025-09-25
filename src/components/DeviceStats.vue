<script setup>
import { ref, onMounted, watch } from 'vue';
import { useStats } from '../composables/useStats.js';
import StatsTypeSwitcher from "./StatsTypeSwitcher.vue";
import RecentApps from "./RecentApps.vue";
import UsageDetails from "./UsageDetails.vue";
import AppUsageChart from "./charts/AppUsageChart.vue";
import TimeUsageChart from "./charts/TimeUsageChart.vue";

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  deviceInfo: {
    type: Object,
    default: null
  },
  date: {
    type: String,
    default: null
  }
});

const { stats, error, loading, fetchStats } = useStats();

const statsType = ref('daily');
const timeOffset = ref(0);

// 載入統計資料
const loadStats = async () => {
  await fetchStats(props.deviceId, {
    type: statsType.value,
    offset: timeOffset.value,
    date: props.date
  });
};

// 計算執行時間（分鐘）
const calculateRunningTime = () => {
  if (!props.deviceInfo || !props.deviceInfo.runningSince) return 0;
  const startTime = new Date(props.deviceInfo.runningSince);
  const now = new Date();
  return Math.floor((now - startTime) / 60000);
};

// 獲取裝置統計資訊
const getDeviceStats = () => {
  const defaultStats = {
    appCount: 0,
    totalUsageMinutes: 0,
    totalUsageHours: 0,
    topApp: '',
    topAppDuration: 0,
    busiestLabel: '',
    maxUsage: 0
  };

  // 如果統計資料不存在，返回預設統計資訊
  if (!stats.value) return defaultStats;

  // 計算程式數量
  const appCount = Object.keys(stats.value.appStats).length;
  // 計算總使用時長（分鐘和小時）
  const totalUsageMinutes = stats.value.totalUsage;
  const totalUsageHours = Math.floor(totalUsageMinutes / 60);

  // 尋找使用時長最長的程式
  const [topApp, topAppDuration] = Object.entries(stats.value.appStats)
      .reduce(([maxApp, maxDur], [app, dur]) =>
          dur > maxDur ? [app, dur] : [maxApp, maxDur], ['', 0]);

  // 初始化最繁忙時段標籤和最大使用量
  let busiestLabel = '';
  let maxUsage = 0;

  // 尋找使用最頻繁的時間段
  if (stats.value.timeStats && stats.value.timeStats.length > 0) {
    const maxIndex = stats.value.timeStats.reduce((maxIdx, val, idx, arr) =>
        val > arr[maxIdx] ? idx : maxIdx, 0);
    busiestLabel = stats.value.timeLabels[maxIndex];
    maxUsage = stats.value.timeStats[maxIndex];
  }


  return {
    appCount,
    totalUsageMinutes,
    totalUsageHours,
    topApp,
    topAppDuration,
    busiestLabel,
    maxUsage
  };
};

const getDateRangeText = () => {
  if (!stats.value?.dateRange) return '';

  const { start, end } = stats.value.dateRange;
  if (start === end) {
    return start;
  }
  return `${start} 至 ${end}`;
};

onMounted(loadStats);

watch(() => props.deviceId, loadStats);
watch(() => props.date, () => {
  if (statsType.value === 'daily') {
    loadStats();
  }
});
watch(statsType, loadStats);
watch(timeOffset, loadStats);
</script>

<template>
  <StatsTypeSwitcher
      v-model="statsType"
      v-model:offset="timeOffset"
      :date-range-text="getDateRangeText()"
  />

  <!-- 錯誤資訊 -->
  <div v-show="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
    {{ error }}
  </div>

  <!-- 主要內容區域 -->
  <div>

    <!-- 裝置統計概覽 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-blue-50 hover:bg-blue-100 transition-colors duration-200 p-4 rounded-lg shadow-md dark:bg-blue-950 dark:hover:bg-blue-900">
        <p class="text-sm text-blue-700">程式總數</p>
        <p class="text-2xl font-bold">{{ getDeviceStats().appCount }}</p>
      </div>
      <div class="bg-green-50 hover:bg-green-100 transition-colors duration-200 p-4 rounded-lg shadow-md dark:bg-green-950 dark:hover:bg-green-900">
        <p class="text-sm text-green-700">總時間</p>
        <p class="text-2xl font-bold">{{ getDeviceStats().totalUsageHours }}小時</p>
      </div>
      <div class="bg-yellow-50 hover:bg-yellow-100 transition-colors duration-200 p-4 rounded-lg shadow-md dark:bg-yellow-950 dark:hover:bg-yellow-900">
        <p class="text-sm text-yellow-700">最常用</p>
        <p class="text-2xl font-bold truncate" :title="getDeviceStats().topApp">
          {{ getDeviceStats().topApp || "暫無" }}
        </p>
      </div>
      <div class="bg-purple-50 hover:bg-purple-100 transition-colors duration-200 p-4 rounded-lg shadow-md dark:bg-purple-950 dark:hover:bg-purple-900">
        <p class="text-sm text-purple-700">最活躍時段</p>
        <p class="text-2xl font-bold">{{ getDeviceStats().busiestLabel || '-' }}</p>
      </div>
    </div>

    <!-- 目前使用情況 -->
    <div v-show="statsType === 'daily' && deviceInfo?.currentApp" class="mb-6">
      <div class="bg-blue-50 hover:bg-blue-100 transition-colors duration-200 p-4 rounded-lg shadow-md dark:bg-[#1d1f20] dark:hover:bg-blue-900/30">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-blue-800">{{ deviceInfo?.running ? '目前程式' : '上次程式' }}</p>
            <p class="text-xl font-bold">{{ deviceInfo?.currentApp }}</p>
          </div>
          <div>
            <p class="text-sm text-blue-800">狀態</p>
            <p class="text-xl font-bold">{{ deviceInfo?.running ? '執行中' : '已停止' }}</p>
          </div>
          <div>
            <p class="text-sm text-blue-800">已執行時間</p>
            <p class="text-xl font-bold">{{ calculateRunningTime() }} 分鐘</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 圖表元件 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <AppUsageChart
          :app-stats="stats?.appStats || {}"
          :total-usage="stats?.totalUsage || 0"
      />
      <TimeUsageChart
          :time-stats="stats?.timeStats || []"
          :time-labels="stats?.timeLabels || []"
          :time-dimension="stats?.timeDimension || ''"
      />
    </div>

    <!-- 使用詳細使用資料元件 -->
    <UsageDetails :stats="stats || {}" :show-limit="10" />

    <!-- 最近使用的APP元件 -->
    <RecentApps v-show="statsType === 'daily'" :deviceId="deviceId" />
  </div>
</template>