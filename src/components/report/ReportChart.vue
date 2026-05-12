<template>
  <div ref="chartRef" class="report-chart" />
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { StageReportVO } from '@/types/interview'

const props = defineProps<{
  stages?: StageReportVO[]
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const renderChart = () => {
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  const stages = props.stages || []
  chart.setOption({
    tooltip: {},
    grid: { left: 36, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: stages.map((item) => item.stageName)
    },
    yAxis: {
      type: 'value',
      max: 100
    },
    series: [
      {
        type: 'bar',
        data: stages.map((item) => item.score || 0),
        itemStyle: {
          color: '#2563eb',
          borderRadius: [6, 6, 0, 0]
        }
      }
    ]
  })
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', () => chart?.resize())
})

watch(() => props.stages, renderChart, { deep: true })

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})
</script>

<style scoped lang="scss">
.report-chart {
  width: 100%;
  height: 280px;
}
</style>
