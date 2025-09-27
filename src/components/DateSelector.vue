<script setup>
import {computed, nextTick, ref, watch} from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'daily'
  },
  offset: {
    type: Number,
    default: 0
  },
  selectedDate: {
    type: String,
    default: null
  },
  dateRangeText: String
});

const emit = defineEmits(['update:modelValue', 'update:offset', 'update:selected-date']);

const statsType = ref(props.modelValue);
const currentOffset = ref(props.offset);
const currentDate = ref(props.selectedDate);

// 标志位防止循环更新
const isUpdatingFromOffset = ref(false);
const isUpdatingFromDate = ref(false);

const statsTypes = [
  { value: 'daily', label: '日', icon: '📅' },
  { value: 'weekly', label: '周', icon: '📊' },
  { value: 'monthly', label: '月', icon: '📈' }
];

// 获取本地日期字符串
const getLocalDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

// 计算最大日期（今天）
const getMaxDate = computed(() => {
  return getLocalDateString();
});

// 根据offset计算对应的日期
const calculateDateFromOffset = (offset) => {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + offset); // offset为负数时是过去的日期
  return getLocalDateString(targetDate);
};

// 根据日期计算offset
const calculateOffsetFromDate = (dateString) => {
  const today = new Date();
  const selectedDate = new Date(dateString + 'T00:00:00'); // 添加时间部分避免时区问题
  const todayString = getLocalDateString(today);
  const todayDate = new Date(todayString + 'T00:00:00');

  const diffTime = selectedDate - todayDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// 初始化日期
if (!currentDate.value) {
  currentDate.value = getLocalDateString();
}

watch(statsType, (newValue) => {
  emit('update:modelValue', newValue);
  currentOffset.value = 0;
  emit('update:offset', 0);

  // 当切换到日统计时，确保日期与offset同步
  if (newValue === 'daily') {
    currentDate.value = calculateDateFromOffset(currentOffset.value);
  }
});

watch(currentDate, async (newValue) => {
  // 先emit选中日期事件
  emit('update:selected-date', newValue);

  if (newValue && statsType.value === 'daily' && !isUpdatingFromOffset.value) {
    // 当手动选择日期时，更新offset
    isUpdatingFromDate.value = true;
    const newOffset = calculateOffsetFromDate(newValue);
    currentOffset.value = newOffset;
    emit('update:offset', newOffset);
    await nextTick();
    isUpdatingFromDate.value = false;
  }
});

// 监听offset变化，在日统计模式下同步更新日期
watch(currentOffset, async (newValue) => {
  if (statsType.value === 'daily' && !isUpdatingFromDate.value) {
    isUpdatingFromOffset.value = true;
    currentDate.value = calculateDateFromOffset(newValue);
    await nextTick();
    isUpdatingFromOffset.value = false;
  }

  if (statsType.value !== 'daily' || !isUpdatingFromDate.value) {
    emit('update:offset', newValue);
  }
});

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  statsType.value = newValue;
});

watch(() => props.offset, (newValue) => {
  currentOffset.value = newValue;
});

watch(() => props.selectedDate, (newValue) => {
  if (newValue) {
    currentDate.value = newValue;
  }
});

// 日期增加减少
const decreaseOffset = () => {
  currentOffset.value--;
};

const increaseOffset = () => {
  if (currentOffset.value < 0) {
    currentOffset.value++;
  }
};

// 计算是否可以增加offset（即是否可以选择更近的日期）
const canIncreaseOffset = computed(() => {
  if (statsType.value === 'daily') {
    // 在日统计模式下，检查当前日期是否是今天
    const today = getLocalDateString();
    return currentDate.value !== today;
  } else {
    // 在其他模式下，检查offset是否小于0
    return currentOffset.value < 0;
  }
});

// 获取时间范围文本
const getTimeRangeText = () => {
  if (currentOffset.value === 0) {
    switch (statsType.value) {
      case 'daily': return '今天';
      case 'weekly': return '本周';
      case 'monthly': return '本月';
    }
  }

  const absOffset = Math.abs(currentOffset.value);
  switch (statsType.value) {
    case 'daily': return `${absOffset}天前`;
    case 'weekly': return `${absOffset}周前`;
    case 'monthly': return `${absOffset}月前`;
  }
};
</script>

<template>
  <div class="flex flex-col justify-between">
    <div class="bg-white dark:bg-[#181a1b] rounded-lg p-4 mt-5 border-gray-200 dark:border-gray-800 not-dark:shadow-md mb-6 transition-all duration-300">
      <!-- 顶部选择器区域 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            模式
          </h2>
          <Transition name="fade" mode="out-in">
            <span v-if="statsType !== 'daily'" key="date-range-text" class="text-sm font-medium">{{ dateRangeText }}</span>
          </Transition>

        </div>
      </div>

      <!-- 平板模式：类型选择器和时间控制器并排 -->
      <div class="hidden md:flex lg:hidden items-center justify-between gap-4 mt-3">
        <!-- 统计类型选择器 -->
        <div class="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shadow-inner">
          <button
              v-for="type in statsTypes"
              :key="type.value"
              @click="statsType = type.value"
              :class="[
                'whitespace-nowrap px-9 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center',
                statsType === type.value
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              ]"
          >
            <span class="mr-1">{{ type.icon }}</span>
            <span>{{ type.shortLabel || type.label }}</span>
          </button>
        </div>

        <!-- 时间范围选择器 -->
        <div class="flex items-center gap-2">
          <button
              @click="decreaseOffset"
              class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm"
              title="前一個時間段"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div class="flex items-center justify-center min-w-[160px] h-8">
            <Transition name="fade" mode="out-in">
                <span v-if="statsType !== 'daily'"
                      key="time-range"
                      class="text-sm font-medium text-center text-gray-700 dark:text-gray-200">
                  {{ getTimeRangeText() }}
                </span>
              <input v-else
                key="date-picker"
                type="date"
                v-model="currentDate"
                class="px-3 py-3 border border-gray-300 dark:border-[#384456] rounded-md not-dark:shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm hover:bg-gray-200 dark:hover:bg-gray-800"
                :max="getMaxDate"
              />
            </Transition>
          </div>

          <button
              @click="increaseOffset"
              :disabled="!canIncreaseOffset"
              :class="[
                  'p-2 rounded-lg transition-colors duration-200 shadow-sm',
                  !canIncreaseOffset
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                ]"
              title="後一個時間段"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 手机模式和电脑模式 统计类型选择器 -->
      <div class="flex flex-col gap-3 mt-2 md:hidden lg:flex lg:flex-col">
        <!-- 居中并占满 -->
        <div class="flex justify-center w-full">
          <div class="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shadow-inner  w-auto justify-between items-center">
            <button
                v-for="type in statsTypes"
                :key="type.value"
                @click="statsType = type.value"
                :class="[
                  'flex-1 sm:flex-none whitespace-nowrap px-5 py-2.5 sm:px-6 sm:py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center',
                  statsType === type.value
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                ]"
            >
              <span class="mr-1.5">{{ type.icon }}</span>
              <span class="hidden sm:inline">{{ type.label }}</span>
              <span class="sm:hidden">{{ type.shortLabel || type.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 手机模式和电脑模式：时间范围选择器 -->
      <div class="flex items-center justify-center gap-2 sm:gap-4 mt-2 md:hidden lg:flex">
        <button
            @click="decreaseOffset"
            class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm"
            title="前一個時間段"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- 中间区域 - 使用固定高度避免布局跳动 -->
        <div class="flex items-center justify-center min-w-[140px] h-10 relative">
          <!-- 日期显示 - 仅在非日统计模式下显示 -->
          <Transition name="fade-switch" mode="out-in">
              <span v-if="statsType !== 'daily'"
                    key="time-range"
                    class="text-sm font-medium text-center text-gray-700 dark:text-gray-200">
                {{ getTimeRangeText() }}
              </span>
            <!-- 日期选择器 - 仅在日统计模式下显示 -->
            <input v-else
              key="date-picker"
              type="date"
              v-model="currentDate"
              class="px-3 py-2 border border-gray-300 dark:border-[#384456] rounded-md not-dark:shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm hover:bg-gray-200 dark:hover:bg-gray-800"
              :max="getMaxDate"
            />
          </Transition>
        </div>

        <button
            @click="increaseOffset"
            :disabled="!canIncreaseOffset"
            :class="[
                'p-2 rounded-lg transition-colors duration-200 shadow-sm',
                !canIncreaseOffset
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              ]"
            title="後一個時間段"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 滑动淡入淡出动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-in-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: scale(0.9);
  opacity: 0;
}

/* 淡入淡出动画  */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 淡入淡出切换动画 */
.fade-switch-enter-active,
.fade-switch-leave-active {
  transition: all 0.25s ease-in-out;
}

.fade-switch-enter-from {
  opacity: 0;
  transform: translateY(-5px);
}

.fade-switch-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

/* 确保过渡期间元素定位正确 */
.fade-switch-enter-active,
.fade-switch-leave-active {
  position: absolute;
  width: 100%;
}
</style>