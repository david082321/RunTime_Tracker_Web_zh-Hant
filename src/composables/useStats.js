import { ref } from 'vue';
import config from '../config.js';

// 從設定檔中取得API基礎路徑
const API_BASE = config.API_BASE;

/**
 * 提供裝置使用統計資料的自訂組合式函式
 * @returns {Object} 包含統計資料、錯誤狀態、載入狀態和取得統計方法的物件
 */
export function useStats() {
    // 響應式變數：儲存統計結果
    const stats = ref(null);
    // 響應式變數：儲存錯誤資訊
    const error = ref(null);
    // 響應式變數：標記是否正在載入資料
    const loading = ref(false);

    /**
     * 計算目前時區偏移小時數
     * @returns {number} 時區偏移小時數
     */
    const getTimezoneOffset = () => {
        const offset = new Date().getTimezoneOffset();
        return -offset / 60;
    };

    /**
     * 取得裝置每日使用統計資料
     * @param {string} deviceId - 裝置ID
     * @param {string|null} date - 查詢日期(格式YYYY-MM-DD)，預設為當天
     */
    const fetchDailyStats = async (deviceId, date = null) => {
        loading.value = true;
        error.value = null;

        try {
            // 取得時區偏移並構造查詢參數
            const offsetHours = getTimezoneOffset();
            const timezoneParam = `timezoneOffset=${offsetHours > 0 ? '+' : ''}${offsetHours}`;

            // 根據是否指定日期構造不同URL
            let url = `${API_BASE}/stats/${deviceId}?${timezoneParam}`;
            if (date) {
                const today = new Date().toISOString().split('T')[0];
                url = date === today
                    ? `${API_BASE}/stats/${deviceId}?${timezoneParam}`
                    : `${API_BASE}/stats/${deviceId}?date=${date}&${timezoneParam}`;
            }

            // 發送請求並處理響應
            const response = await fetch(url);
            if (!response.ok) throw new Error('取得統計失敗');

            const data = await response.json();
            stats.value = transformDailyData(data);
        } catch (err) {
            error.value = `取得統計資訊失敗: ${err.message}`;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 取得裝置每週使用統計資料
     * @param {string} deviceId - 裝置ID
     * @param {number} weekOffset - 周偏移量(0表示本週)
     */
    const fetchWeeklyStats = async (deviceId, weekOffset = 0) => {
        loading.value = true;
        error.value = null;

        try {
            // 取得時區偏移並構造URL
            const offsetHours = getTimezoneOffset();
            const url = `${API_BASE}/weekly/${deviceId}?weekOffset=${weekOffset}&timezoneOffset=${offsetHours}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('取得周統計失敗');

            const data = await response.json();
            stats.value = transformWeeklyData(data);
        } catch (err) {
            error.value = `取得周統計資訊失敗: ${err.message}`;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 取得裝置每月使用統計資料
     * @param {string} deviceId - 裝置ID
     * @param {number} monthOffset - 月偏移量(0表示本月)
     */
    const fetchMonthlyStats = async (deviceId, monthOffset = 0) => {
        loading.value = true;
        error.value = null;

        try {
            // 取得時區偏移並構造URL
            const offsetHours = getTimezoneOffset();
            const url = `${API_BASE}/monthly/${deviceId}?monthOffset=${monthOffset}&timezoneOffset=${offsetHours}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('取得月統計失敗');

            const data = await response.json();
            stats.value = transformMonthlyData(data);
        } catch (err) {
            error.value = `取得月統計資訊失敗: ${err.message}`;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 轉換每日統計資料為統一格式
     * @param {Object} data - 原始API響應資料
     * @returns {Object} 格式化後的統計資料
     */
    const transformDailyData = (data) => {
        return {
            type: 'daily',  // 資料類型標識
            dateRange: {    // 日期範圍(開始和結束相同)
                start: data.date || new Date().toISOString().split('T')[0],
                end: data.date || new Date().toISOString().split('T')[0]
            },
            totalUsage: data.totalUsage,  // 總使用時長
            appStats: data.appStats,      // 各程式使用統計
            timeStats: data.hourlyStats,  // 按小時統計的使用資料
            timeLabels: Array.from({length: 24}, (_, i) => `${i}時`),  // 24小時標籤
            timeDimension: 'hour'         // 時間維度標識
        };
    };

    /**
     * 轉換每週統計資料為統一格式
     * @param {Object} data - 原始API響應資料
     * @returns {Object} 格式化後的統計資料
     */
    const transformWeeklyData = (data) => {
        // 計算各程式一週總使用時長
        const appStats = {};
        Object.entries(data.appDailyStats).forEach(([appName, dailyData]) => {
            appStats[appName] = Object.values(dailyData).reduce((sum, val) => sum + val, 0);
        });

        // 處理日期標籤(格式:月/日)
        const dates = Object.keys(data.dailyTotals).sort();
        const timeLabels = dates.map(date => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });

        // 取得每日總使用時長
        const timeStats = dates.map(date => data.dailyTotals[date] || 0);
        // 計算一週總使用時長
        const totalUsage = Object.values(appStats).reduce((sum, val) => sum + val, 0);

        return {
            type: 'weekly',
            dateRange: data.weekRange,  // 週日期範圍
            totalUsage,
            appStats,
            timeStats,
            timeLabels,
            timeDimension: 'day',  // 時間維度標識(天)
            rawData: data          // 保留原始資料
        };
    };

    /**
     * 轉換每月統計資料為統一格式
     * @param {Object} data - 原始API響應資料
     * @returns {Object} 格式化後的統計資料
     */
    const transformMonthlyData = (data) => {
        // 計算各程式一月總使用時長
        const appStats = {};
        Object.entries(data.appDailyStats || {}).forEach(([appName, dailyData]) => {
            appStats[appName] = Object.values(dailyData).reduce((sum, val) => sum + val, 0);
        });

        // 處理日期標籤(格式:月/日)
        const dates = Object.keys(data.dailyTotals || {}).sort();
        const timeLabels = dates.map(date => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });

        // 取得每日總使用時長
        const timeStats = dates.map(date => data.dailyTotals[date] || 0);
        // 計算一月總使用時長
        const totalUsage = Object.values(appStats).reduce((sum, val) => sum + val, 0);

        return {
            type: 'monthly',
            dateRange: data.monthRange,  // 月日期範圍
            totalUsage,
            appStats,
            timeStats,
            timeLabels,
            timeDimension: 'day',  // 時間維度標識(天)
            rawData: data          // 保留原始資料
        };
    };

    /**
     * 通用統計取得方法(根據類型呼叫不同具體方法)
     * @param {string} deviceId - 裝置ID
     * @param {Object} options - 配置選項
     * @param {string} [options.type='daily'] - 統計類型(daily/weekly/monthly)
     * @param {number} [options.offset=0] - 時間偏移量
     * @param {string} [options.date=null] - 指定日期(僅daily類型有效)
     */
    const fetchStats = async (deviceId, options = {}) => {
        const { type = 'daily', offset = 0, date = null } = options;

        switch (type) {
            case 'daily':
                await fetchDailyStats(deviceId, date);
                break;
            case 'weekly':
                await fetchWeeklyStats(deviceId, offset);
                break;
            case 'monthly':
                await fetchMonthlyStats(deviceId, offset);
                break;
            default:
                error.value = '未知的統計類型';
        }
    };

    // 暴露給外部使用的屬性和方法
    return {
        stats,      // 統計結果資料
        error,      // 錯誤資訊
        loading,    // 載入狀態
        fetchStats  // 取得統計的通用方法
    };
}
