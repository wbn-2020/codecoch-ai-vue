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

    <div
      v-if="menu.visible"
      class="tag-menu"
      :style="{ left: `${menu.left}px`, top: `${menu.top}px` }"
    >
      <button type="button" @click="closeCurrent">关闭当前</button>
      <button type="button" @click="closeOthers">关闭其他</button>
      <button type="button" @click="closeAll">关闭全部</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'
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
  menu.visible = true
  menu.left = event.clientX
  menu.top = event.clientY
  menu.tag = tag
  window.setTimeout(() => {
    window.addEventListener('click', closeMenu, { once: true })
  })
}

const closeMenu = () => {
  menu.visible = false
}

const closeCurrent = async () => {
  if (menu.tag) await closeTag(menu.tag)
  closeMenu()
}

const closeOthers = async () => {
  const target =
    menu.tag || displayedTags.value.find((item) => item.path === route.path)
  if (!target) {
    closeMenu()
    return
  }
  tagsStore.closeOtherTags(target.path)
  await router.push(target.fullPath || target.path)
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
  height: 38px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
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
  z-index: 3000;
  min-width: 120px;
  padding: 6px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);

  button {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--app-text);
    text-align: left;
    cursor: pointer;

    &:hover {
      background: var(--app-surface-soft);
    }
  }
}
</style>
