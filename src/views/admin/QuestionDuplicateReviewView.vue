<template>
  <div class="question-duplicate-review-view">
    <QuestionManageView
      key="question-duplicate-review-workspace"
      governance-only
      initial-governance-tab="duplicates"
    />
  </div>
</template>

<script setup lang="ts">
import QuestionManageView from './QuestionManageView.vue'
</script>
