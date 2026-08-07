<template>
  <div ref="chartRef" class="sales-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

interface SalesData {
  month: string
  amount: number
}

const props = defineProps<{
  data: SalesData[]
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const formatMonth = (month: string) => {
  const m = parseInt(month.split('-')[1])
  return `${m}月`
}

const formatMoney = (value: number) => {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const getChartOption = (): EChartsOption => {
  const months = props.data.map(d => formatMonth(d.month))
  const amounts = props.data.map(d => d.amount)
  const maxAmount = Math.max(...amounts, 1)

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: {
        color: '#333',
        fontSize: 13
      },
      formatter: (params: any) => {
        const data = params[0]
        return `<div style="font-weight:600;margin-bottom:4px;">${data.name}</div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#409eff;"></span>
                  <span>销售额：</span>
                  <span style="font-weight:600;color:#409eff;">${formatMoney(data.value)}</span>
                </div>`
      }
    },
    grid: {
      left: 12,
      right: 20,
      top: 40,
      bottom: 10,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: {
        lineStyle: { color: '#e8e8e8' }
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#999',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#999',
        fontSize: 12,
        formatter: (value: number) => {
          if (value >= 10000) return `¥${(value / 10000).toFixed(0)}w`
          if (value >= 1000) return `¥${(value / 1000).toFixed(1)}k`
          return `¥${value}`
        }
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 3,
            borderColor: '#fff'
          }
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#79bbff' },
            { offset: 1, color: '#409eff' }
          ])
        },
        itemStyle: {
          color: '#409eff',
          borderWidth: 2,
          borderColor: '#fff'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.25)' },
            { offset: 0.5, color: 'rgba(64, 158, 255, 0.08)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0)' }
          ])
        },
        data: amounts
      }
    ],
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  }
}

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  chart.setOption(getChartOption())
}

const handleResize = () => {
  chart?.resize()
}

onMounted(() => {
  nextTick(() => {
    initChart()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})

watch(
  () => props.data,
  () => {
    if (chart) {
      chart.setOption(getChartOption())
    }
  },
  { deep: true }
)
</script>

<style scoped>
.sales-chart {
  width: 100%;
  height: 100%;
  min-height: 320px;
}
</style>
