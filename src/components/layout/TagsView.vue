<template>
  <div class="tags-view">
    <el-scrollbar>
      <div class="tags-view__inner">
        <button
          v-for="tag in displayedTags"
          :key="tag.path"
          class="tag-item"
          :class="{ 'is-active': tag.path === route.path }"
          type="button"
          @click="goTag(tag)"
          @contextmenu.prevent="openMenu(tag, $event)"
        >
          <span>{{ tag.title }}</span>
          <el-icon v-if="!tag.affix" class="tag-close" @click.stop="closeTag(tag)">
            <Close />
          </el-icon>
        </button>
      </div>
    </el-scrollbar>

    <Teleport to="body">
      <div
        v-if="menu.visible"
        class="tag-menu"
        :style="{ left: `${menu.left}px`, top: `${menu.top}px` }"
        @click.stop
      >
        <button type="button" @click="refreshSelected">
          <el-icon><Refresh /></el-icon>
          <span>刷新页面</span>
        </button>
        <button type="button" :disabled="!canCloseSelected" @click="closeCurrent">
          <el-icon><Close /></el-icon>
          <span>关闭当前</span>
        </button>
        <button type="button" @click="closeOthers">
          <el-icon><CircleClose /></el-icon>
          <span>关闭其他</span>
        </button>
        <button type="button" :disabled="!hasLeftClosable" @click="closeLeftTarget">
          <el-icon><Back /></el-icon>
          <span>关闭左侧</span>
        </button>
        <button type="button" :disabled="!hasRightClosable" @click="closeRightTarget">
          <el-icon><Right /></el-icon>
          <span>关闭右侧</span>
        </button>
        <button type="button" @click="closeAll">
          <el-icon><DArrowRight /></el-icon>
          <span>全部关闭</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Back, CircleClose, Close, DArrowRight, Refresh, Right } from '@element-plus/icons-vue'
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getHomeTag,
  useTagsViewStore,
  type TagScope,
  type VisitedTag
} from '@/stores/tagsView'

const props = withDefaults(
  defineProps<{
    scope?: TagScope
  }>(),
  {
    scope: 'admin'
  }
)

const route = useRoute()
const router = useRouter()
const tagsStore = useTagsViewStore()

const displayedTags = computed(() => tagsStore.tagsByScope(props.scope))
const homeTag = computed(() => getHomeTag(props.scope))
const currentTag = computed(() =>
  displayedTags.value.find((item) => item.path === route.path) || homeTag.value
)
const selectedTag = computed(() => menu.tag || currentTag.value)
const selectedTagIndex = computed(() =>
  displayedTags.value.findIndex((item) => item.path === selectedTag.value.path)
)
const canCloseSelected = computed(() => !selectedTag.value.affix)
const hasLeftClosable = computed(() =>
  displayedTags.value.slice(0, Math.max(0, selectedTagIndex.value)).some((item) => !item.affix)
)
const hasRightClosable = computed(() =>
  displayedTags.value.slice(selectedTagIndex.value + 1).some((item) => !item.affix)
)

const menu = reactive({
  visible: false,
  left: 0,
  top: 0,
  tag: null as VisitedTag | null
})

const goTag = async (tag: VisitedTag) => {
  await router.push(tag.fullPath || tag.path)
}

const getFallbackTag = (closedPath: string): VisitedTag | undefined => {
  const list = displayedTags.value
  const currentIndex = list.findIndex((item) => item.path === closedPath)
  return list[currentIndex - 1] || list[currentIndex + 1] || homeTag.value
}

const closeTag = async (tag: VisitedTag) => {
  if (tag.affix) return
  const fallback = getFallbackTag(tag.path)
  tagsStore.closeTag(tag.path)
  if (route.path === tag.path) {
    await router.push(fallback?.fullPath || homeTag.value.fullPath)
  }
}

const openMenu = (tag: VisitedTag, event: MouseEvent) => {
  const menuWidth = 128
  const menuHeight = 214
  menu.visible = true
  menu.left = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
  menu.top = Math.min(event.clientY, window.innerHeight - menuHeight - 8)
  menu.tag = tag
  window.setTimeout(() => {
    window.addEventListener('click', closeMenu, { once: true })
  })
}

const closeMenu = () => {
  menu.visible = false
}

const refreshSelected = () => {
  closeMenu()
  router.go(0)
}

const closeCurrent = async () => {
  if (canCloseSelected.value) await closeTag(selectedTag.value)
  closeMenu()
}

const closeOthers = async () => {
  const target = selectedTag.value
  tagsStore.closeOtherTags(target.path)
  await router.push(target.fullPath || target.path)
  closeMenu()
}

const closeLeftTarget = () => {
  const target = selectedTag.value
  tagsStore.closeLeftTags(target.path)
  closeMenu()
}

const closeRightTarget = () => {
  const target = selectedTag.value
  tagsStore.closeRightTags(target.path)
  closeMenu()
}

const closeAll = async () => {
  tagsStore.clearVisitedViews(props.scope)
  await router.push(homeTag.value.fullPath)
  closeMenu()
}
</script>

<style scoped lang="scss">
.tags-view {
  position: relative;
  display: flex;
  align-items: center;
  height: 38px;
  z-index: 80;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
}

.tags-view :deep(.el-scrollbar) {
  flex: 1 1 auto;
  min-width: 0;
}

.tags-view__inner {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  max-width: 180px;
  padding: 0 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: rgba(129, 140, 248, 0.45);
    color: var(--app-text);
  }

  &.is-active {
    border-color: var(--app-primary);
    background: var(--app-primary-soft);
    color: #ffffff;
  }
}

.tag-close {
  font-size: 12px;
}

.tag-menu {
  position: fixed;
  z-index: 4000;
  min-width: 128px;
  padding: 5px 0;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.98);
  box-shadow: 0 18px 46px rgba(2, 6, 23, 0.44);
  backdrop-filter: blur(14px);

  button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--app-text);
    text-align: left;
    cursor: pointer;

    &:hover {
      background: rgba(99, 102, 241, 0.14);
      color: #ffffff;
    }

    &:disabled {
      cursor: not-allowed;
      color: rgba(148, 163, 184, 0.48);
      background: transparent;
    }
  }

  .el-icon {
    width: 14px;
    font-size: 14px;
  }
}
</style>
