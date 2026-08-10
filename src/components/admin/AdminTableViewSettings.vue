<template>
  <el-popover
    placement="bottom-end"
    :width="288"
    trigger="click"
    popper-class="admin-table-view-settings__popover"
  >
    <template #reference>
      <el-button plain :aria-label="ariaLabel">
        <Settings2 :size="15" />
        视图设置
      </el-button>
    </template>

    <div class="admin-table-view-settings__panel" role="group" :aria-label="ariaLabel">
      <div class="admin-table-view-settings__section">
        <span class="admin-table-view-settings__label">表格密度</span>
        <el-segmented
          :model-value="size"
          :options="sizeOptions"
          :aria-label="`${ariaLabel}密度`"
          @update:model-value="updateSize"
        />
      </div>

      <div class="admin-table-view-settings__section">
        <span class="admin-table-view-settings__label">显示列</span>
        <div class="admin-table-view-settings__columns">
          <el-checkbox
            v-for="item in columns"
            :key="item.key"
            :model-value="visibleColumns[item.key] !== false"
            :disabled="item.required"
            @change="updateColumn(item.key, $event)"
          >
            {{ item.label }}
          </el-checkbox>
        </div>
      </div>

      <el-button class="admin-table-view-settings__reset" link type="primary" @click="emit('reset')">
        <RotateCcw :size="14" />
        恢复默认视图
      </el-button>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { RotateCcw, Settings2 } from 'lucide-vue-next'

import type {
  AdminTableColumnOption,
  AdminTableSize
} from '@/composables/useAdminTableView'

const props = withDefaults(defineProps<{
  size: AdminTableSize
  sizeOptions: ReadonlyArray<{ label: string; value: AdminTableSize }>
  columns: ReadonlyArray<AdminTableColumnOption>
  visibleColumns: Record<string, boolean>
  ariaLabel?: string
}>(), {
  ariaLabel: '表格视图设置'
})

const emit = defineEmits<{
  'update:size': [value: AdminTableSize]
  'update:column-visible': [payload: { key: string; visible: boolean }]
  reset: []
}>()

const updateSize = (value: string | number | boolean) => {
  emit('update:size', String(value) as AdminTableSize)
}

const updateColumn = (key: string, value: unknown) => {
  emit('update:column-visible', { key, visible: Boolean(value) })
}
</script>

<style scoped lang="scss">
.admin-table-view-settings__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.admin-table-view-settings__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-table-view-settings__label {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.admin-table-view-settings__columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  max-height: 280px;
  overflow-y: auto;
}

.admin-table-view-settings__columns :deep(.el-checkbox) {
  min-width: 0;
  margin-right: 0;
}

.admin-table-view-settings__reset {
  align-self: flex-start;
  gap: 6px;
}

@media (max-width: 640px) {
  .admin-table-view-settings__columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
