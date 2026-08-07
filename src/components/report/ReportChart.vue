<template>
  <div class="report-charts">
    <div class="report-charts__grid">
      <div ref="radarRef" class="report-chart report-chart--radar" />
      <div ref="barRef" class="report-chart report-chart--bar" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { StageReportVO } from '@/types/interview'
import type { ECharts } from '@/utils/echarts'

const props = defineProps<{
  stages?: StageReportVO[]
}>()

const radarRef = ref<HTMLDivElement>()
const barRef = ref<HTMLDivElement>()
let radarChart: ECharts | null = null
let barChart: ECharts | null = null
let reportChartMounted = false
let chartRenderSeq = 0
let echartsModulePromise: Promise<typeof import('@/utils/echarts')> | null = null

const baseTextStyle = {
  color: '#5f6e66',
  fontFamily: 'Inter, "Microsoft YaHei", sans-serif'
}

const loadEcharts = () => {
  if (!echartsModulePromise) {
    echartsModulePromise = import('@/utils/echarts')
  }
  return echartsModulePromise
}

const disposeCharts = () => {
  radarChart?.dispose()
  barChart?.dispose()
  radarChart = null
  barChart = null
}

const renderRadar = (echarts: Awaited<ReturnType<typeof loadEcharts>>) => {
  if (!radarRef.value) return
  if (!radarChart) {
    radarChart = echarts.default.init(radarRef.value)
  }

  const stages = props.stages || []
  if (!stages.length) {
    radarChart.clear()
    return
  }

  const indicator = stages.map((item) => ({
    name: item.stageName || '未知',
    max: 100
  }))

  const values = stages.map((item) => item.score || 0)

  radarChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator,
      shape: 'polygon',
      radius: '65%',
      axisName: {
        color: '#5f6e66',
        fontSize: 11
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(124, 92, 252, 0.04)', 'rgba(124, 92, 252, 0.08)']
        }
      },
      splitLine: {
        lineStyle: { color: '#d5ddd6' }
      },
      axisLine: {
        lineStyle: { color: '#d5ddd6' }
      }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: '知识点掌握度',
            areaStyle: {
              color: 'rgba(124, 92, 252, 0.18)'
            },
            lineStyle: {
              color: '#7c5cfc',
              width: 2
            },
            itemStyle: {
              color: '#7c5cfc'
            }
          }
        ]
      }
    ]
  })
}

const renderBar = (echarts: Awaited<ReturnType<typeof loadEcharts>>) => {
  if (!barRef.value) return
  if (!barChart) {
    barChart = echarts.default.init(barRef.value)
  }

  const stages = props.stages || []
  if (!stages.length) {
    barChart.clear()
    return
  }

  barChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: {
      left: 36,
      right: 16,
      top: 24,
      bottom: 32,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel'
    },
    xAxis: {
      type: 'category',
      data: stages.map((item) => item.stageName),
      axisLine: { lineStyle: { color: '#d5ddd6' } },
      axisLabel: { ...baseTextStyle, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: '#eef2ee' } },
      axisLabel: baseTextStyle
    },
    series: [
      {
        type: 'bar',
        data: stages.map((item) => ({
          value: item.score || 0,
          itemStyle: {
            color: (item.score || 0) >= 80
              ? '#0a8750'
              : (item.score || 0) >= 60
                ? '#4f8ec9'
                : (item.score || 0) >= 40
                  ? '#b26a00'
                  : '#c23b41',
            borderRadius: [6, 6, 0, 0]
          }
        })),
        barWidth: '40%'
      }
    ]
  })
}

const renderCharts = async () => {
  const renderSeq = ++chartRenderSeq
  await nextTick()
  if (!reportChartMounted) return
  if (!radarRef.value && !barRef.value) return
  if (!props.stages?.length) {
    radarChart?.clear()
    barChart?.clear()
    return
  }
  const echarts = await loadEcharts()
  if (!reportChartMounted || renderSeq !== chartRenderSeq) {
    return
  }
  renderRadar(echarts)
  renderBar(echarts)
  resizeCharts()
}

const resizeCharts = () => {
  radarChart?.resize()
  barChart?.resize()
}

onMounted(() => {
  reportChartMounted = true
  renderCharts()
  window.addEventListener('resize', resizeCharts)
})

watch(() => props.stages, renderCharts, { deep: true })

onBeforeUnmount(() => {
  reportChartMounted = false
  chartRenderSeq += 1
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<style scoped lang="scss">
.report-charts__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.report-chart {
  width: 100%;
  height: 300px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
}

@media (max-width: 860px) {
  .report-charts__grid {
    grid-template-columns: 1fr;
  }
}
</style>
