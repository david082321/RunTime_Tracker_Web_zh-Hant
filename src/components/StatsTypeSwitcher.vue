<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'daily'
  },
  offset: {
    type: Number,
    default: 0
  },
  dateRangeText: String
});

const emit = defineEmits(['update:modelValue', 'update:offset']);

const statsType = ref(props.modelValue);
const currentOffset = ref(props.offset);

const statsTypes = [
  { value: 'daily', label: '日統計', icon: '📅' },
  { value: 'weekly', label: '周統計', icon: '📊' },
  { value: 'monthly', label: '月統計', icon: '📈' }
];

watch(statsType, (newValue) => {
  emit('update:modelValue', newValue);
  currentOffset.value = 0;
  emit('update:offset', 0);
});

// 日期增加減少
const decreaseOffset = () => {
  currentOffset.value--;
  emit('update:offset', currentOffset.value);
};

const increaseOffset = () => {
  if (currentOffset.value < 0) {
    currentOffset.value++;
    emit('update:offset', currentOffset.value);
  }
};

// 取得時間範圍文字
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
  <div class="bg-white dark:bg-[#1e2022] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4 mb-6 transition-all duration-300">
    <!-- 頂部選擇器區域 -->
    <div class="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between gap-4">
      <!-- 統計類型選擇器 -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-300 font-medium">統計類型:</span>
        <div class="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shadow-inner">
          <button
              v-for="type in statsTypes"
              :key="type.value"
              @click="statsType = type.value"
              :class="[
              'whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center',
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

      <!-- 時間範圍選擇器 -->
      <div v-if="statsType !== 'daily'" class="flex items-center justify-center gap-2 sm:gap-3">
        <button
            @click="decreaseOffset"
            class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm"
            title="前一個時間段"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="flex items-center">
          <span class="text-sm font-medium min-w-[90px] text-center text-gray-700 dark:text-gray-200">
            {{ getTimeRangeText() }}
          </span>
        </div>

        <button
            @click="increaseOffset"
            :disabled="currentOffset >= 0"
            :class="[
            'p-2 rounded-lg transition-colors duration-200 shadow-sm',
            currentOffset >= 0
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

    <!-- 底部統計範圍資訊 -->
    <div class="mt-3 md:mt-2 text-center md:text-left">
      <span class="text-sm text-gray-600 dark:text-gray-400">統計範圍: </span>
      <span class="text-sm font-medium">{{ dateRangeText }}</span>
    </div>
  </div>
</template>