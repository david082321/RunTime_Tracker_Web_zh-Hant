<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController
} from 'chart.js';

// 註冊必要的Chart.js元件
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController);

const props = defineProps({
  timeStats: {
    type: Array,
    required: true,
    default: () => []
  },
  timeLabels: {
    type: Array,
    required: true,
    default: () => []
  },
  timeDimension: {
    type: String,
    default: 'hour'
  }
});

const canvasRef = ref(null);
// 使用物件儲存圖表實例，避免響應式問題
const chartInstance = {
  current: null
};

const getChartTitle = () => {
  const titles = {
    hour: '24小時使用統計',
    day: '周使用統計',
    week: '月使用統計'
  };
  return titles[props.timeDimension] || '使用統計';
};

const initChart = () => {
  const ctx = canvasRef.value?.getContext('2d');
  if (!ctx || !props.timeStats || props.timeStats.length === 0) return;

  // 確保先銷毀舊圖表
  if (chartInstance.current) {
    chartInstance.current.destroy();
  }

  chartInstance.current = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: props.timeLabels,
      datasets: [{
        label: '使用時間 (分鐘)',
        data: props.timeStats,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: getChartTitle()
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed.y || 0;
              if (value < 60) {
                return `${value.toFixed(2)}分鐘`;
              } else {
                const hours = Math.floor(value / 60);
                const minutes = Math.round(value % 60);
                return `${hours}小時`;
              }
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '分鐘'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      animation: {
        duration: 400,
        easing: 'easeInOutQuart'
      }
    }
  });
};

const updateChart = () => {
  nextTick(() => {
    if (!chartInstance.current) {
      initChart();
    } else {
      if (props.timeLabels.length !== chartInstance.current.data.labels.length) {
        // 如果標籤數量變化，重新建立圖表
        initChart();
      } else {
        // 只更新資料
        chartInstance.current.data.labels = props.timeLabels;
        chartInstance.current.data.datasets[0].data = props.timeStats;
        chartInstance.current.update();
      }
    }
  });
};

// 監聽資料變化
watch(() => [props.timeStats, props.timeLabels, props.timeDimension], () => {
  updateChart();
}, { deep: true });

onMounted(() => {
  updateChart();
});

onUnmounted(() => {
  if (chartInstance.current) {
    chartInstance.current.destroy();
    chartInstance.current = null;
  }
});
</script>

<template>
  <div class="p-4 rounded-lg border-2 border-gray-200 shadow-md dark:bg-[#181a1b] dark:border-gray-700" style="height: 300px;">
    <h3 class="text-lg font-medium mb-4">{{ getChartTitle() }}</h3>
    <div class="flex items-center justify-center" style="height: calc(100% - 2rem);">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>
