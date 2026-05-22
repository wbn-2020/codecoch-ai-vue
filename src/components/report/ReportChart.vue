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
import echarts, { type ECharts } from '@/utils/echarts'

const props = defineProps<{
  stages?: StageReportVO[]
}>()

const radarRef = ref<HTMLDivElement>()
const barRef = ref<HTMLDivElement>()
let radarChart: ECharts | null = null
let barChart: ECharts | null = null

const baseTextStyle = {
  color: '#94a3b8',
  fontFamily: 'Inter, "Microsoft YaHei", sans-serif'
}

const renderRadar = () => {
  if (!radarRef.value) return
  if (!radarChart) {
    radarChart = echarts.init(radarRef.value)
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
        color: '#94a3b8',
        fontSize: 11
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(99, 102, 241, 0.04)', 'rgba(99, 102, 241, 0.08)']
        }
      },
      splitLine: {
        lineStyle: { color: 'rgba(148, 163, 184, 0.18)' }
      },
      axisLine: {
        lineStyle: { color: 'rgba(148, 163, 184, 0.18)' }
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
              color: 'rgba(99, 102, 241, 0.25)'
            },
            lineStyle: {
              color: '#818cf8',
              width: 2
            },
            itemStyle: {
              color: '#818cf8'
            }
          }
        ]
      }
    ]
  })
}

const renderBar = () => {
  if (!barRef.value) return
  if (!barChart) {
    barChart = echarts.init(barRef.value)
  }

  const stages = props.stages || []
  if (!stages.length) {
    barChart.clear()
    return
  }

  barChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 36, right: 16, top: 24, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: stages.map((item) => item.stageName),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
      axisLabel: { ...baseTextStyle, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
      axisLabel: baseTextStyle
    },
    series: [
      {
        type: 'bar',
        data: stages.map((item) => ({
          value: item.score || 0,
          itemStyle: {
            color: (item.score || 0) >= 80
              ? '#22c55e'
              : (item.score || 0) >= 60
                ? '#60a5fa'
                : (item.score || 0) >= 40
                  ? '#f59e0b'
                  : '#ef4444',
            borderRadius: [6, 6, 0, 0]
          }
        })),
        barWidth: '40%'
      }
    ]
  })
}

const renderCharts = async () => {
  await nextTick()
  renderRadar()
  renderBar()
  resizeCharts()
}

const resizeCharts = () => {
  radarChart?.resize()
  barChart?.resize()
}

onMounted(() => {
  renderCharts()
  window.addEventListener('resize', resizeCharts)
})

watch(() => props.stages, renderCharts, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  radarChart?.dispose()
  barChart?.dispose()
  radarChart = null
  barChart = null
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
  background: rgba(2, 6, 23, 0.28);
}

@media (max-width: 860px) {
  .report-charts__grid {
    grid-template-columns: 1fr;
  }
}
</style>
